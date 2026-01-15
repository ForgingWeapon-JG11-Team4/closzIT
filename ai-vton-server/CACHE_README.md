# Production 2단계 캐싱 시스템 (2-Level Cache V2)

## 개요

IDM-VTON 서버에 **상용 서비스급 2단계 캐싱 시스템**을 도입하여 성능과 안정성을 최적화했습니다.

**✨ Production Features:**
- 🔒 **동시성 제어** (asyncio.Lock)
- 🛡️ **Cache Stampede 방지** (Single Flight)
- 📈 **Adaptive TTL** (사용 빈도 기반 자동 연장)
- 💾 **디스크 자동 관리** (용량 모니터링 + 정리)

```
요청 → L1 (메모리) → L2 (SSD) → L3 (S3)
         빠름         중간       느림
```

## 캐싱 알고리즘

### LRU (Least Recently Used)
- 최근 사용하지 않은 데이터부터 제거
- VTON 서비스 특성상 특정 사용자가 반복적으로 여러 옷을 입어보는 패턴에 최적화
- OrderedDict 자료구조를 사용하여 O(1) 시간복잡도로 접근 및 업데이트

### TTL (Time To Live)
- 기본값: 24시간
- 일정 시간 후 자동 만료로 오래된 캐시 방지
- 유저가 전신 사진을 변경했을 때 오래된 캐시가 남지 않도록 보장

### 알고리즘 선택 이유

1. **LRU**:
   - 특정 유저가 짧은 시간 내에 여러 옷을 입어볼 때 반복 접근 최소화
   - 인기있는 옷(많이 조회되는 옷)이 캐시에 오래 유지됨
   - 메모리 효율적 관리

2. **TTL**:
   - 사용자가 전신 사진 변경 시 자동으로 만료
   - 디스크 공간 무한 증가 방지
   - 데이터 일관성 보장

3. **대안 검토**:
   - **FIFO**: 접근 패턴을 고려하지 않아 비효율적
   - **LFU (Least Frequently Used)**: 새로운 옷이 캐시에 들어가기 어려움
   - **Random**: 예측 불가능하여 히트율 낮음

## 캐시 레벨

### L1 (Memory Cache)
- **위치**: Python 프로세스 메모리 (RAM)
- **자료구조**: OrderedDict (LRU)
- **용량**:
  - Human: 최대 10명 (category별로 분리: upper/lower/dresses)
  - Garment: 최대 100개
  - Text: 최대 100개
- **속도**: 가장 빠름 (~0.001초)
- **장점**: 즉각 접근, S3/SSD I/O 없음
- **단점**: 서버 재시작 시 초기화, 메모리 용량 제한

### L2 (SSD Cache)
- **위치**: `/opt/dlami/nvme/vton-cache`
- **파일시스템**: ext4
- **디스크**: NVMe SSD (412GB 사용 가능)
- **속도**: 중간 (~0.1-0.5초)
- **장점**:
  - S3보다 10-50배 빠름
  - 서버 재시작해도 유지
  - 용량 여유 (412GB)
- **단점**: 디스크 I/O 발생

### L3 (S3)
- **위치**: AWS S3 (closzit-user-upload bucket)
- **속도**: 가장 느림 (~1-3초, 네트워크 상황에 따라 변동)
- **장점**:
  - 영구 저장
  - 무제한 용량
  - 다른 서버와 공유 가능
- **단점**: 네트워크 레이턴시

## 캐시 구조

```
/opt/dlami/nvme/vton-cache/
├── human_upper_body/
│   └── {user_id}/
│       ├── human_img.png
│       ├── mask.png
│       ├── mask_gray.png
│       └── pose_tensor.pkl
├── human_lower_body/
│   └── {user_id}/
│       └── ...
├── human_dresses/
│   └── {user_id}/
│       └── ...
├── garment/
│   └── {clothing_id}/
│       ├── garm_img.png
│       └── garm_tensor.pkl
└── text/
    └── {clothing_id}/
        ├── prompt_embeds.pkl
        ├── negative_prompt_embeds.pkl
        ├── pooled_prompt_embeds.pkl
        ├── negative_pooled_prompt_embeds.pkl
        └── prompt_embeds_c.pkl
```

## 성능 최적화

### 1차 요청 (Cold Start)
```
S3 다운로드 (1-3초) → L2 저장 → L1 저장 → Diffusion (7-10초)
총: 8-13초
```

### 2차 요청 (L2 Hit)
```
L2 로드 (0.1-0.5초) → L1 저장 → Diffusion (7-10초)
총: 7-10.5초 (1-2.5초 단축)
```

### 3차 요청 (L1 Hit)
```
L1 로드 (0.001초) → Diffusion (7-10초)
총: 7-10초 (1-3초 단축, 최대 30% 성능 향상)
```

## API 사용법

### 캐시 통계 조회
```bash
curl http://localhost:8001/health
```

응답:
```json
{
  "status": "healthy",
  "models_loaded": true,
  "caching": "2-Level (L1: Memory LRU, L2: SSD)",
  "cache_stats": {
    "l1_hits": 150,
    "l2_hits": 50,
    "l3_hits": 20,
    "evictions": 5,
    "total_requests": 220,
    "l1_hit_rate": 68.18,
    "l2_hit_rate": 22.73,
    "l1_human_upper_count": 10,
    "l1_human_lower_count": 8,
    "l1_human_dresses_count": 5,
    "l1_garment_count": 85,
    "l1_text_count": 85
  }
}
```

### 특정 사용자 캐시 삭제 (전신 사진 변경 시)
```bash
curl -X DELETE http://localhost:8001/cache/human/{user_id}
```

### 특정 옷 캐시 삭제
```bash
curl -X DELETE http://localhost:8001/cache/garment/{clothing_id}
```

### 전체 캐시 삭제
```bash
curl -X DELETE http://localhost:8001/cache/all
```

## 모니터링

### L2 디스크 사용량 확인
```bash
du -sh /opt/dlami/nvme/vton-cache
```

### 캐시 파일 개수 확인
```bash
# Human 캐시
find /opt/dlami/nvme/vton-cache/human_* -type d -mindepth 1 | wc -l

# Garment 캐시
find /opt/dlami/nvme/vton-cache/garment -type d -mindepth 1 | wc -l

# Text 캐시
find /opt/dlami/nvme/vton-cache/text -type d -mindepth 1 | wc -l
```

### 캐시 히트율 모니터링
```python
# 로그에서 히트율 추적
# ✅ L1 HIT: ...
# ✅ L2 HIT: ...
# ❌ Cache MISS: ...
```

## 설정 (api_server.py)

```python
# Production V2
cache_manager = TwoLevelCacheV2(
    ssd_root="/opt/dlami/nvme/vton-cache",
    l1_max_users=10,        # L1에 최대 N명의 사용자
    l1_max_garments=100,    # L1에 최대 N개의 옷
    ttl_hours=24,           # 기본 TTL (Adaptive로 자동 연장됨)
    max_disk_usage_gb=50.0, # L2 최대 용량 (자동 정리)
)
```

### 튜닝 가이드

1. **메모리가 넉넉한 경우**:
   ```python
   l1_max_users=20
   l1_max_garments=200
   ```

2. **빠른 캐시 갱신이 필요한 경우**:
   ```python
   ttl_hours=12  # 12시간으로 단축
   ```

3. **디스크 용량이 부족한 경우**:
   - TTL을 짧게 조정
   - 주기적으로 `/cache/all` 호출

## 장애 대응

### L2 디스크 가득 참
```bash
# 오래된 캐시 삭제 (7일 이상)
find /opt/dlami/nvme/vton-cache -type f -mtime +7 -delete
```

### 서버 재시작
- L1 (메모리)는 초기화됨
- L2 (SSD)는 유지됨
- 재시작 후 첫 요청은 L2 Hit으로 빠르게 처리

### 전신 사진 변경 후 캐시 미갱신
```bash
# NestJS에서 자동 호출되어야 함
curl -X DELETE http://localhost:8001/cache/human/{user_id}
```

## 예상 효과

- **첫 요청**: 8-13초 (S3 다운로드 포함)
- **두 번째 요청 (L2 Hit)**: 7-10.5초 (**1-2.5초 단축**)
- **세 번째+ 요청 (L1 Hit)**: 7-10초 (**1-3초 단축, 최대 30% 개선**)

### 실제 시나리오

**사용자가 10벌의 옷을 연속으로 입어볼 때:**
- 기존: 13초 × 10 = 130초
- 개선: 13초 + 7초 × 9 = 76초
- **절감: 54초 (41% 감소)**

## 주의사항

1. **SSD 수명**: NVMe SSD는 쓰기 횟수 제한이 있으므로 TTL을 너무 짧게 설정하지 말 것
2. **메모리 사용량**: L1 캐시 크기를 너무 크게 하면 OOM 발생 가능
3. **일관성**: 전신 사진 변경 시 반드시 캐시 삭제 호출
4. **동시성**: 여러 요청이 동일한 데이터를 동시에 다운로드할 수 있음 (향후 개선 필요)

## 문의

문제 발생 시:
1. `/health` 엔드포인트로 캐시 통계 확인
2. `/opt/dlami/nvme/vton-cache` 디렉토리 권한 확인
3. 로그에서 `Cache HIT/MISS` 패턴 분석
