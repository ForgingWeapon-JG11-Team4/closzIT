"""
2단계 캐싱 시스템 (L1: Memory, L2: SSD)
LRU + TTL 알고리즘

구조:
- L1 (Memory): 최근 사용한 N명의 사용자 데이터 (빠름, 용량 작음)
- L2 (SSD /opt/dlami/nvme): S3 다운로드 완충 (중간 속도, 용량 큼)

캐싱 알고리즘: LRU (Least Recently Used) + TTL (Time To Live)
- LRU: 최근 사용하지 않은 데이터부터 제거
- TTL: 일정 시간 후 자동 만료 (전신 사진 변경 대응)
"""

import os
import time
import pickle
import shutil
import logging
from pathlib import Path
from collections import OrderedDict
from typing import Optional, Dict, Any, Tuple
from PIL import Image
import torch
import io
import base64
from dataclasses import dataclass
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """캐시 엔트리 메타데이터"""
    key: str
    data: Any  # PIL Image, Tensor, etc.
    size_bytes: int
    created_at: float
    accessed_at: float
    access_count: int


class TwoLevelCache:
    """
    2단계 캐싱 시스템

    L1 (Memory): OrderedDict 기반 LRU (빠름)
    L2 (SSD): 파일 시스템 기반 (중간)
    L3 (S3): 원본 소스 (느림)
    """

    def __init__(
        self,
        ssd_root: str = "/opt/dlami/nvme/vton-cache",
        l1_max_users: int = 10,  # 메모리에 최대 N명의 사용자 데이터
        l1_max_garments: int = 100,  # 메모리에 최대 N개의 옷 데이터
        ttl_hours: int = 24,  # 24시간 후 만료
    ):
        self.ssd_root = Path(ssd_root)
        self.ssd_root.mkdir(parents=True, exist_ok=True)

        # L1 캐시 (Memory) - category별 분리
        self.l1_human_upper: OrderedDict[str, CacheEntry] = OrderedDict()
        self.l1_human_lower: OrderedDict[str, CacheEntry] = OrderedDict()
        self.l1_human_dresses: OrderedDict[str, CacheEntry] = OrderedDict()
        self.l1_garment: OrderedDict[str, CacheEntry] = OrderedDict()
        self.l1_text: OrderedDict[str, CacheEntry] = OrderedDict()

        # 용량 제한
        self.l1_max_users = l1_max_users
        self.l1_max_garments = l1_max_garments

        # TTL 설정
        self.ttl_seconds = ttl_hours * 3600

        # 통계
        self.stats = {
            "l1_hits": 0,
            "l2_hits": 0,
            "l3_hits": 0,  # S3 다운로드
            "evictions": 0,
        }

        logger.info(f"✅ 2-Level Cache initialized:")
        logger.info(f"   L1 (Memory): max {l1_max_users} users, {l1_max_garments} garments")
        logger.info(f"   L2 (SSD): {self.ssd_root}")
        logger.info(f"   TTL: {ttl_hours} hours")

    def _is_expired(self, entry: CacheEntry) -> bool:
        """TTL 체크"""
        age = time.time() - entry.created_at
        return age > self.ttl_seconds

    def _evict_lru(self, cache: OrderedDict, max_size: int):
        """LRU 방식으로 오래된 항목 제거"""
        while len(cache) > max_size:
            key, entry = cache.popitem(last=False)  # FIFO (가장 오래된 항목)
            logger.info(f"🗑️  Evicted from L1: {key} (size: {entry.size_bytes} bytes)")
            self.stats["evictions"] += 1

    def _get_ssd_path(self, cache_type: str, key: str, filename: str) -> Path:
        """L2 (SSD) 파일 경로 생성"""
        return self.ssd_root / cache_type / key / filename

    def _save_to_ssd(self, cache_type: str, key: str, data: Dict[str, Any]):
        """L2 (SSD)에 데이터 저장"""
        base_path = self.ssd_root / cache_type / key
        base_path.mkdir(parents=True, exist_ok=True)

        for name, value in data.items():
            file_path = base_path / f"{name}.pkl"

            try:
                with open(file_path, "wb") as f:
                    if isinstance(value, Image.Image):
                        # PIL Image는 PNG로 저장
                        img_path = base_path / f"{name}.png"
                        value.save(img_path, "PNG")
                    elif isinstance(value, torch.Tensor):
                        # Tensor는 pickle로 저장 (CPU로 이동)
                        pickle.dump(value.cpu(), f)
                    else:
                        # 기타는 pickle
                        pickle.dump(value, f)

            except Exception as e:
                logger.error(f"❌ Failed to save {name} to SSD: {e}")

    def _load_from_ssd(self, cache_type: str, key: str) -> Optional[Dict[str, Any]]:
        """L2 (SSD)에서 데이터 로드"""
        base_path = self.ssd_root / cache_type / key

        if not base_path.exists():
            return None

        try:
            data = {}

            # PNG 파일 로드
            for png_file in base_path.glob("*.png"):
                name = png_file.stem
                data[name] = Image.open(png_file)

            # PKL 파일 로드
            for pkl_file in base_path.glob("*.pkl"):
                name = pkl_file.stem
                with open(pkl_file, "rb") as f:
                    data[name] = pickle.load(f)

            return data if data else None

        except Exception as e:
            logger.error(f"❌ Failed to load from SSD: {e}")
            return None

    def get_human_cache(
        self,
        user_id: str,
        category: str = "upper_body"
    ) -> Optional[Dict[str, Any]]:
        """
        Human 캐시 조회 (L1 → L2 → L3)

        Returns:
            {
                'human_img': PIL.Image,
                'mask': PIL.Image,
                'mask_gray': PIL.Image,
                'pose_tensor': torch.Tensor
            }
        """
        # category에 따라 L1 캐시 선택
        if category == "upper_body":
            l1_cache = self.l1_human_upper
        elif category == "lower_body":
            l1_cache = self.l1_human_lower
        else:  # dresses
            l1_cache = self.l1_human_dresses

        # L1 체크
        if user_id in l1_cache:
            entry = l1_cache[user_id]

            # TTL 체크
            if self._is_expired(entry):
                logger.info(f"⏰ L1 cache expired for user {user_id} ({category})")
                del l1_cache[user_id]
            else:
                # Cache HIT
                entry.accessed_at = time.time()
                entry.access_count += 1
                l1_cache.move_to_end(user_id)  # LRU 업데이트
                self.stats["l1_hits"] += 1
                logger.info(f"✅ L1 HIT: user {user_id} ({category})")
                return entry.data

        # L2 체크 (SSD)
        l2_data = self._load_from_ssd(f"human_{category}", user_id)
        if l2_data:
            self.stats["l2_hits"] += 1
            logger.info(f"✅ L2 HIT: user {user_id} ({category}) - loading to L1")

            # L1에 캐시
            self._put_l1_human(user_id, l2_data, category)
            return l2_data

        # L3 (S3) - caller가 처리
        logger.info(f"❌ Cache MISS: user {user_id} ({category})")
        return None

    def put_human_cache(
        self,
        user_id: str,
        data: Dict[str, Any],
        category: str = "upper_body"
    ):
        """Human 캐시 저장 (L1 + L2)"""
        # L1에 저장
        self._put_l1_human(user_id, data, category)

        # L2 (SSD)에 저장
        self._save_to_ssd(f"human_{category}", user_id, data)
        logger.info(f"💾 Cached human {user_id} ({category}) to L1 + L2")

    def _put_l1_human(self, user_id: str, data: Dict[str, Any], category: str):
        """L1 Human 캐시에 저장 (internal)"""
        # category에 따라 L1 캐시 선택
        if category == "upper_body":
            l1_cache = self.l1_human_upper
        elif category == "lower_body":
            l1_cache = self.l1_human_lower
        else:  # dresses
            l1_cache = self.l1_human_dresses

        # 크기 계산 (대략적)
        size_bytes = sum(
            self._estimate_size(v) for v in data.values()
        )

        entry = CacheEntry(
            key=user_id,
            data=data,
            size_bytes=size_bytes,
            created_at=time.time(),
            accessed_at=time.time(),
            access_count=1,
        )

        l1_cache[user_id] = entry
        l1_cache.move_to_end(user_id)  # MRU

        # LRU eviction
        self._evict_lru(l1_cache, self.l1_max_users)

    def get_garment_cache(self, clothing_id: str) -> Optional[Dict[str, Any]]:
        """
        Garment 캐시 조회

        Returns:
            {
                'garm_img': PIL.Image,
                'garm_tensor': torch.Tensor
            }
        """
        # L1 체크
        if clothing_id in self.l1_garment:
            entry = self.l1_garment[clothing_id]

            if self._is_expired(entry):
                del self.l1_garment[clothing_id]
            else:
                entry.accessed_at = time.time()
                entry.access_count += 1
                self.l1_garment.move_to_end(clothing_id)
                self.stats["l1_hits"] += 1
                logger.info(f"✅ L1 HIT: garment {clothing_id}")
                return entry.data

        # L2 체크
        l2_data = self._load_from_ssd("garment", clothing_id)
        if l2_data:
            self.stats["l2_hits"] += 1
            logger.info(f"✅ L2 HIT: garment {clothing_id}")
            self._put_l1_garment(clothing_id, l2_data)
            return l2_data

        return None

    def put_garment_cache(self, clothing_id: str, data: Dict[str, Any]):
        """Garment 캐시 저장"""
        self._put_l1_garment(clothing_id, data)
        self._save_to_ssd("garment", clothing_id, data)
        logger.info(f"💾 Cached garment {clothing_id} to L1 + L2")

    def _put_l1_garment(self, clothing_id: str, data: Dict[str, Any]):
        """L1 Garment 캐시에 저장"""
        size_bytes = sum(self._estimate_size(v) for v in data.values())

        entry = CacheEntry(
            key=clothing_id,
            data=data,
            size_bytes=size_bytes,
            created_at=time.time(),
            accessed_at=time.time(),
            access_count=1,
        )

        self.l1_garment[clothing_id] = entry
        self.l1_garment.move_to_end(clothing_id)
        self._evict_lru(self.l1_garment, self.l1_max_garments)

    def get_text_cache(self, clothing_id: str) -> Optional[Dict[str, Any]]:
        """Text 캐시 조회"""
        # L1 체크
        if clothing_id in self.l1_text:
            entry = self.l1_text[clothing_id]

            if self._is_expired(entry):
                del self.l1_text[clothing_id]
            else:
                entry.accessed_at = time.time()
                entry.access_count += 1
                self.l1_text.move_to_end(clothing_id)
                self.stats["l1_hits"] += 1
                return entry.data

        # L2 체크
        l2_data = self._load_from_ssd("text", clothing_id)
        if l2_data:
            self.stats["l2_hits"] += 1
            self._put_l1_text(clothing_id, l2_data)
            return l2_data

        return None

    def put_text_cache(self, clothing_id: str, data: Dict[str, Any]):
        """Text 캐시 저장"""
        self._put_l1_text(clothing_id, data)
        self._save_to_ssd("text", clothing_id, data)

    def _put_l1_text(self, clothing_id: str, data: Dict[str, Any]):
        """L1 Text 캐시에 저장"""
        size_bytes = sum(self._estimate_size(v) for v in data.values())

        entry = CacheEntry(
            key=clothing_id,
            data=data,
            size_bytes=size_bytes,
            created_at=time.time(),
            accessed_at=time.time(),
            access_count=1,
        )

        self.l1_text[clothing_id] = entry
        self.l1_text.move_to_end(clothing_id)
        self._evict_lru(self.l1_text, self.l1_max_garments)

    def clear_user_cache(self, user_id: str):
        """특정 사용자의 모든 캐시 삭제"""
        # L1 삭제
        if user_id in self.l1_human_upper:
            del self.l1_human_upper[user_id]
        if user_id in self.l1_human_lower:
            del self.l1_human_lower[user_id]
        if user_id in self.l1_human_dresses:
            del self.l1_human_dresses[user_id]

        # L2 삭제
        for category in ["upper_body", "lower_body", "dresses"]:
            ssd_path = self.ssd_root / f"human_{category}" / user_id
            if ssd_path.exists():
                shutil.rmtree(ssd_path)

        logger.info(f"🗑️  Cleared all cache for user {user_id}")

    def clear_garment_cache(self, clothing_id: str):
        """특정 옷의 캐시 삭제"""
        if clothing_id in self.l1_garment:
            del self.l1_garment[clothing_id]
        if clothing_id in self.l1_text:
            del self.l1_text[clothing_id]

        for cache_type in ["garment", "text"]:
            ssd_path = self.ssd_root / cache_type / clothing_id
            if ssd_path.exists():
                shutil.rmtree(ssd_path)

    def get_stats(self) -> Dict:
        """캐시 통계 반환"""
        total_requests = (
            self.stats["l1_hits"] +
            self.stats["l2_hits"] +
            self.stats["l3_hits"]
        )

        l1_hit_rate = (
            self.stats["l1_hits"] / total_requests * 100
            if total_requests > 0 else 0
        )
        l2_hit_rate = (
            self.stats["l2_hits"] / total_requests * 100
            if total_requests > 0 else 0
        )

        return {
            **self.stats,
            "total_requests": total_requests,
            "l1_hit_rate": round(l1_hit_rate, 2),
            "l2_hit_rate": round(l2_hit_rate, 2),
            "l1_human_upper_count": len(self.l1_human_upper),
            "l1_human_lower_count": len(self.l1_human_lower),
            "l1_human_dresses_count": len(self.l1_human_dresses),
            "l1_garment_count": len(self.l1_garment),
            "l1_text_count": len(self.l1_text),
        }

    @staticmethod
    def _estimate_size(obj: Any) -> int:
        """객체 크기 추정 (bytes)"""
        if isinstance(obj, torch.Tensor):
            return obj.element_size() * obj.nelement()
        elif isinstance(obj, Image.Image):
            return obj.width * obj.height * 3  # RGB 가정
        else:
            return 1024  # 기본값 1KB
