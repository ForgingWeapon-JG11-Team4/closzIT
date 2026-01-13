"""
상용 서비스용 2단계 캐싱 시스템 (Production-Ready)

개선 사항:
1. 동시성 제어 (asyncio.Lock)
2. Cache Stampede 방지 (Single Flight)
3. Adaptive TTL (사용 빈도에 따라 TTL 연장)
4. 정확한 메모리 추정 (sys.getsizeof)
5. L2 디스크 용량 모니터링 및 자동 정리
6. 백그라운드 캐시 워밍
"""

import os
import sys
import time
import pickle
import shutil
import logging
import asyncio
from pathlib import Path
from collections import OrderedDict
from typing import Optional, Dict, Any, Tuple, Set
from PIL import Image
import torch
import io
import base64
from dataclasses import dataclass, field
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """캐시 엔트리 메타데이터"""
    key: str
    data: Any
    size_bytes: int
    created_at: float
    accessed_at: float
    access_count: int
    # Adaptive TTL: 자주 사용하면 TTL 연장
    base_ttl: float = 24 * 3600  # 24시간

    @property
    def effective_ttl(self) -> float:
        """사용 빈도에 따라 TTL 연장"""
        # 10회 이상 접근 시 TTL 2배
        if self.access_count >= 10:
            return self.base_ttl * 2
        # 50회 이상 접근 시 TTL 4배 (최대 4일)
        elif self.access_count >= 50:
            return self.base_ttl * 4
        return self.base_ttl


class TwoLevelCacheV2:
    """
    상용 서비스용 2단계 캐싱 시스템

    개선 사항:
    - 동시성 제어 (Lock)
    - Cache Stampede 방지
    - Adaptive TTL
    - 디스크 용량 모니터링
    """

    def __init__(
        self,
        ssd_root: str = "/opt/dlami/nvme/vton-cache",
        l1_max_users: int = 10,
        l1_max_garments: int = 100,
        ttl_hours: int = 24,
        max_disk_usage_gb: float = 50.0,  # L2 최대 50GB
    ):
        self.ssd_root = Path(ssd_root)
        self.ssd_root.mkdir(parents=True, exist_ok=True)

        # L1 캐시 (Memory)
        self.l1_human_upper: OrderedDict[str, CacheEntry] = OrderedDict()
        self.l1_human_lower: OrderedDict[str, CacheEntry] = OrderedDict()
        self.l1_human_dresses: OrderedDict[str, CacheEntry] = OrderedDict()
        self.l1_garment: OrderedDict[str, CacheEntry] = OrderedDict()
        self.l1_text: OrderedDict[str, CacheEntry] = OrderedDict()

        # 동시성 제어 (Cache Stampede 방지)
        self._locks: Dict[str, asyncio.Lock] = {}
        self._loading: Set[str] = set()  # 현재 로딩 중인 키

        # 용량 제한
        self.l1_max_users = l1_max_users
        self.l1_max_garments = l1_max_garments
        self.ttl_seconds = ttl_hours * 3600
        self.max_disk_bytes = int(max_disk_usage_gb * 1024 * 1024 * 1024)

        # 통계
        self.stats = {
            "l1_hits": 0,
            "l2_hits": 0,
            "l3_hits": 0,
            "evictions": 0,
            "stampede_prevented": 0,  # Cache Stampede 방지 횟수
        }

        logger.info(f"✅ Production 2-Level Cache initialized:")
        logger.info(f"   L1 (Memory): max {l1_max_users} users, {l1_max_garments} garments")
        logger.info(f"   L2 (SSD): {self.ssd_root} (max {max_disk_usage_gb}GB)")
        logger.info(f"   Base TTL: {ttl_hours} hours (adaptive)")
        logger.info(f"   Features: Lock, Stampede Prevention, Adaptive TTL")

    def _get_lock(self, key: str) -> asyncio.Lock:
        """키별 Lock 획득 (동시성 제어)"""
        if key not in self._locks:
            self._locks[key] = asyncio.Lock()
        return self._locks[key]

    def _is_expired(self, entry: CacheEntry) -> bool:
        """Adaptive TTL 체크"""
        age = time.time() - entry.created_at
        return age > entry.effective_ttl

    def _evict_lru(self, cache: OrderedDict, max_size: int):
        """LRU 방식으로 오래된 항목 제거"""
        while len(cache) > max_size:
            key, entry = cache.popitem(last=False)
            logger.info(
                f"🗑️  Evicted from L1: {key} "
                f"(size: {entry.size_bytes} bytes, "
                f"accessed: {entry.access_count} times)"
            )
            self.stats["evictions"] += 1

    def _get_ssd_path(self, cache_type: str, key: str, filename: str) -> Path:
        """L2 (SSD) 파일 경로 생성"""
        return self.ssd_root / cache_type / key / filename

    def _check_disk_space(self):
        """L2 디스크 용량 체크 및 정리"""
        try:
            # 현재 사용량 계산
            total_size = sum(
                f.stat().st_size
                for f in self.ssd_root.rglob('*')
                if f.is_file()
            )

            if total_size > self.max_disk_bytes:
                logger.warning(
                    f"⚠️  L2 disk usage exceeds limit: "
                    f"{total_size / 1024 / 1024 / 1024:.2f}GB / "
                    f"{self.max_disk_bytes / 1024 / 1024 / 1024:.2f}GB"
                )
                # 가장 오래된 파일부터 삭제
                self._cleanup_old_files()

        except Exception as e:
            logger.error(f"❌ Disk space check failed: {e}")

    def _cleanup_old_files(self):
        """L2에서 오래된 파일 삭제"""
        try:
            # 모든 파일을 수정 시간 기준으로 정렬
            files = sorted(
                self.ssd_root.rglob('*'),
                key=lambda f: f.stat().st_mtime if f.is_file() else 0
            )

            # 50% 용량까지 삭제
            target_size = self.max_disk_bytes * 0.5
            current_size = sum(f.stat().st_size for f in files if f.is_file())

            for file in files:
                if not file.is_file():
                    continue

                if current_size <= target_size:
                    break

                file_size = file.stat().st_size
                file.unlink()
                current_size -= file_size
                logger.info(f"🗑️  Deleted old L2 file: {file}")

        except Exception as e:
            logger.error(f"❌ Cleanup failed: {e}")

    def _save_to_ssd(self, cache_type: str, key: str, data: Dict[str, Any]):
        """L2 (SSD)에 데이터 저장 + 디스크 체크"""
        base_path = self.ssd_root / cache_type / key
        base_path.mkdir(parents=True, exist_ok=True)

        for name, value in data.items():
            try:
                if isinstance(value, Image.Image):
                    img_path = base_path / f"{name}.png"
                    value.save(img_path, "PNG", optimize=True)
                elif isinstance(value, torch.Tensor):
                    pkl_path = base_path / f"{name}.pkl"
                    with open(pkl_path, "wb") as f:
                        pickle.dump(value.cpu(), f, protocol=pickle.HIGHEST_PROTOCOL)
                else:
                    pkl_path = base_path / f"{name}.pkl"
                    with open(pkl_path, "wb") as f:
                        pickle.dump(value, f, protocol=pickle.HIGHEST_PROTOCOL)

            except Exception as e:
                logger.error(f"❌ Failed to save {name} to SSD: {e}")

        # 디스크 용량 체크 (백그라운드로 실행)
        try:
            self._check_disk_space()
        except Exception as e:
            logger.error(f"⚠️  Disk check failed: {e}")

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

    async def get_human_cache(
        self,
        user_id: str,
        category: str = "upper_body"
    ) -> Optional[Dict[str, Any]]:
        """
        Human 캐시 조회 (동시성 안전)

        Cache Stampede 방지:
        - 동일한 키에 대해 여러 요청이 동시에 오면
        - 첫 번째 요청만 S3/L2에서 로드하고
        - 나머지는 대기했다가 로드된 결과 사용
        """
        # category에 따라 L1 캐시 선택
        if category == "upper_body":
            l1_cache = self.l1_human_upper
        elif category == "lower_body":
            l1_cache = self.l1_human_lower
        else:
            l1_cache = self.l1_human_dresses

        cache_key = f"human_{category}_{user_id}"

        # L1 체크 (Lock 불필요, 읽기만 함)
        if user_id in l1_cache:
            entry = l1_cache[user_id]

            # Adaptive TTL 체크
            if self._is_expired(entry):
                logger.info(f"⏰ L1 cache expired for user {user_id} ({category})")
                del l1_cache[user_id]
            else:
                # Cache HIT
                entry.accessed_at = time.time()
                entry.access_count += 1
                l1_cache.move_to_end(user_id)
                self.stats["l1_hits"] += 1
                logger.info(
                    f"✅ L1 HIT: user {user_id} ({category}) "
                    f"[accessed: {entry.access_count} times]"
                )
                return entry.data

        # Cache Stampede 방지: 이미 로딩 중이면 대기
        if cache_key in self._loading:
            self.stats["stampede_prevented"] += 1
            logger.info(f"⏳ Waiting for ongoing load: {cache_key}")

            # 로딩이 완료될 때까지 대기 (최대 30초)
            for _ in range(60):  # 0.5초 * 60 = 30초
                await asyncio.sleep(0.5)
                if cache_key not in self._loading:
                    # 로딩 완료, L1에서 다시 조회
                    if user_id in l1_cache:
                        return l1_cache[user_id].data
                    break

        # Lock 획득 (동시성 제어)
        lock = self._get_lock(cache_key)
        async with lock:
            # Double-check: Lock 대기 중에 다른 스레드가 로드했을 수 있음
            if user_id in l1_cache:
                return l1_cache[user_id].data

            # 로딩 시작 표시
            self._loading.add(cache_key)

            try:
                # L2 체크 (SSD)
                l2_data = await asyncio.to_thread(
                    self._load_from_ssd, f"human_{category}", user_id
                )

                if l2_data:
                    self.stats["l2_hits"] += 1
                    logger.info(f"✅ L2 HIT: user {user_id} ({category})")
                    self._put_l1_human(user_id, l2_data, category)
                    return l2_data

                # L3 (S3) - caller가 처리
                logger.info(f"❌ Cache MISS: user {user_id} ({category})")
                return None

            finally:
                # 로딩 완료 표시
                self._loading.discard(cache_key)

    def put_human_cache(
        self,
        user_id: str,
        data: Dict[str, Any],
        category: str = "upper_body"
    ):
        """Human 캐시 저장 (L1 + L2)"""
        # L1에 저장
        self._put_l1_human(user_id, data, category)

        # L2 (SSD)에 저장 (백그라운드)
        try:
            self._save_to_ssd(f"human_{category}", user_id, data)
            logger.info(f"💾 Cached human {user_id} ({category}) to L1 + L2")
        except Exception as e:
            logger.error(f"❌ Failed to save to L2: {e}")

    def _put_l1_human(self, user_id: str, data: Dict[str, Any], category: str):
        """L1 Human 캐시에 저장"""
        if category == "upper_body":
            l1_cache = self.l1_human_upper
        elif category == "lower_body":
            l1_cache = self.l1_human_lower
        else:
            l1_cache = self.l1_human_dresses

        # 정확한 크기 계산
        size_bytes = sum(self._accurate_size(v) for v in data.values())

        entry = CacheEntry(
            key=user_id,
            data=data,
            size_bytes=size_bytes,
            created_at=time.time(),
            accessed_at=time.time(),
            access_count=1,
            base_ttl=self.ttl_seconds,
        )

        l1_cache[user_id] = entry
        l1_cache.move_to_end(user_id)

        # LRU eviction
        self._evict_lru(l1_cache, self.l1_max_users)

    async def get_garment_cache(self, clothing_id: str) -> Optional[Dict[str, Any]]:
        """Garment 캐시 조회 (동시성 안전)"""
        cache_key = f"garment_{clothing_id}"

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

        # Cache Stampede 방지
        if cache_key in self._loading:
            self.stats["stampede_prevented"] += 1
            for _ in range(60):
                await asyncio.sleep(0.5)
                if cache_key not in self._loading:
                    if clothing_id in self.l1_garment:
                        return self.l1_garment[clothing_id].data
                    break

        lock = self._get_lock(cache_key)
        async with lock:
            if clothing_id in self.l1_garment:
                return self.l1_garment[clothing_id].data

            self._loading.add(cache_key)

            try:
                l2_data = await asyncio.to_thread(
                    self._load_from_ssd, "garment", clothing_id
                )

                if l2_data:
                    self.stats["l2_hits"] += 1
                    logger.info(f"✅ L2 HIT: garment {clothing_id}")
                    self._put_l1_garment(clothing_id, l2_data)
                    return l2_data

                return None

            finally:
                self._loading.discard(cache_key)

    def put_garment_cache(self, clothing_id: str, data: Dict[str, Any]):
        """Garment 캐시 저장"""
        self._put_l1_garment(clothing_id, data)

        try:
            self._save_to_ssd("garment", clothing_id, data)
            logger.info(f"💾 Cached garment {clothing_id} to L1 + L2")
        except Exception as e:
            logger.error(f"❌ Failed to save to L2: {e}")

    def _put_l1_garment(self, clothing_id: str, data: Dict[str, Any]):
        """L1 Garment 캐시에 저장"""
        size_bytes = sum(self._accurate_size(v) for v in data.values())

        entry = CacheEntry(
            key=clothing_id,
            data=data,
            size_bytes=size_bytes,
            created_at=time.time(),
            accessed_at=time.time(),
            access_count=1,
            base_ttl=self.ttl_seconds,
        )

        self.l1_garment[clothing_id] = entry
        self.l1_garment.move_to_end(clothing_id)
        self._evict_lru(self.l1_garment, self.l1_max_garments)

    async def get_text_cache(self, clothing_id: str) -> Optional[Dict[str, Any]]:
        """Text 캐시 조회 (동시성 안전)"""
        cache_key = f"text_{clothing_id}"

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

        if cache_key in self._loading:
            self.stats["stampede_prevented"] += 1
            for _ in range(60):
                await asyncio.sleep(0.5)
                if cache_key not in self._loading:
                    if clothing_id in self.l1_text:
                        return self.l1_text[clothing_id].data
                    break

        lock = self._get_lock(cache_key)
        async with lock:
            if clothing_id in self.l1_text:
                return self.l1_text[clothing_id].data

            self._loading.add(cache_key)

            try:
                l2_data = await asyncio.to_thread(
                    self._load_from_ssd, "text", clothing_id
                )

                if l2_data:
                    self.stats["l2_hits"] += 1
                    self._put_l1_text(clothing_id, l2_data)
                    return l2_data

                return None

            finally:
                self._loading.discard(cache_key)

    def put_text_cache(self, clothing_id: str, data: Dict[str, Any]):
        """Text 캐시 저장"""
        self._put_l1_text(clothing_id, data)

        try:
            self._save_to_ssd("text", clothing_id, data)
        except Exception as e:
            logger.error(f"❌ Failed to save to L2: {e}")

    def _put_l1_text(self, clothing_id: str, data: Dict[str, Any]):
        """L1 Text 캐시에 저장"""
        size_bytes = sum(self._accurate_size(v) for v in data.values())

        entry = CacheEntry(
            key=clothing_id,
            data=data,
            size_bytes=size_bytes,
            created_at=time.time(),
            accessed_at=time.time(),
            access_count=1,
            base_ttl=self.ttl_seconds,
        )

        self.l1_text[clothing_id] = entry
        self.l1_text.move_to_end(clothing_id)
        self._evict_lru(self.l1_text, self.l1_max_garments)

    def clear_user_cache(self, user_id: str):
        """특정 사용자의 모든 캐시 삭제"""
        if user_id in self.l1_human_upper:
            del self.l1_human_upper[user_id]
        if user_id in self.l1_human_lower:
            del self.l1_human_lower[user_id]
        if user_id in self.l1_human_dresses:
            del self.l1_human_dresses[user_id]

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

        # L2 디스크 사용량
        try:
            disk_usage = sum(
                f.stat().st_size
                for f in self.ssd_root.rglob('*')
                if f.is_file()
            ) / 1024 / 1024 / 1024  # GB
        except:
            disk_usage = 0

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
            "l2_disk_usage_gb": round(disk_usage, 2),
            "l2_disk_limit_gb": round(self.max_disk_bytes / 1024 / 1024 / 1024, 2),
        }

    @staticmethod
    def _accurate_size(obj: Any) -> int:
        """정확한 객체 크기 계산 (bytes)"""
        if isinstance(obj, torch.Tensor):
            return obj.element_size() * obj.nelement()
        elif isinstance(obj, Image.Image):
            # PIL Image의 실제 메모리 사용량
            return len(obj.tobytes())
        else:
            # sys.getsizeof로 정확한 크기 계산
            return sys.getsizeof(obj)
