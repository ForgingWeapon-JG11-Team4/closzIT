# 🎯 VTO (Virtual Try-On) 기술 문서

> CloszIT 가상착장 시스템의 기술적 구현 상세 문서

## 📌 목차

1. [전체 아키텍처](#1-전체-아키텍처)
2. [AI/ML 모델 및 파이프라인](#2-aiml-모델-및-파이프라인)
3. [이미지 처리 파이프라인](#3-이미지-처리-파이프라인)
4. [3단계 캐싱 시스템](#4-3단계-캐싱-시스템)
5. [비동기 작업 처리 (BullMQ)](#5-비동기-작업-처리-bullmq)
6. [데이터베이스 설계](#6-데이터베이스-설계)
7. [API 설계](#7-api-설계)
8. [프론트엔드 상태 관리](#8-프론트엔드-상태-관리)
9. [성능 최적화](#9-성능-최적화)
10. [에러 핸들링](#10-에러-핸들링)
11. [면접 예상 질문](#11-면접-예상-질문)

---

## 1. 전체 아키텍처

### 1.1 시스템 구성도

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Frontend (React + Zustand)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────────────┐   │
│  │  vtoStore   │  │ vtoStorage   │  │  Polling (/queue/job/vto/:id) │   │
│  └─────────────┘  └──────────────┘  └───────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Backend API (NestJS - Port 3000)                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐     │
│  │ FittingController│  │ VtonCacheService │  │ VtoProcessor       │     │
│  │ - sns-full-try-on│  │ - preprocess*    │  │ (BullMQ Worker)    │     │
│  │ - single-item    │  │ - generateTryOn  │  │ concurrency: 3     │     │
│  └──────────────────┘  └──────────────────┘  └────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                    │               │               │
                    ▼               ▼               ▼
        ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐
        │ Redis (BullMQ)│  │ PostgreSQL   │  │ AWS S3          │
        │ - Job Queue   │  │ - VtoCache   │  │ - 캐시 데이터   │
        └───────────────┘  └──────────────┘  └─────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    AI Server (FastAPI - Port 55554)                      │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │                      IDM-VTON Model                             │     │
│  │  OpenPose → Parsing → DensePose → CLIP → Stable Diffusion XL   │     │
│  └────────────────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │              TwoLevelCacheV2 (L1: Memory + L2: SSD)             │     │
│  └────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 기술 스택

| 레이어 | 기술 | 용도 |
|--------|------|------|
| Frontend | React, Zustand | UI, 상태관리 |
| Backend | NestJS, Prisma | REST API, ORM |
| Queue | BullMQ, Redis | 비동기 작업 처리 |
| AI Server | FastAPI, PyTorch | ML 모델 서빙 |
| Database | PostgreSQL | 캐시 메타데이터 |
| Storage | AWS S3 | 이미지/텐서 저장 |
| ML Models | IDM-VTON, SDXL, CLIP | 이미지 생성 |

### 1.3 주요 파일 구조

```
closzIT/
├── closzIT-back/
│   └── src/
│       ├── fitting/
│       │   ├── fitting.controller.ts   # VTO API 엔드포인트
│       │   └── fitting.service.ts      # Gemini API 연동
│       ├── vton-cache/
│       │   ├── vton-cache.controller.ts
│       │   └── vton-cache.service.ts   # IDM-VTON 연동, S3 캐싱
│       └── queue/
│           └── processors/
│               └── vto.processor.ts    # BullMQ Worker
│
├── closzIT-front/
│   └── src/
│       ├── stores/
│       │   └── vtoStore.js             # Zustand 상태관리
│       └── utils/
│           └── vtoStorage.js           # sessionStorage 유틸
│
├── ai-vton-server/
│   ├── api_server.py                   # FastAPI 서버
│   └── cache_manager.py                # 2단계 캐시 시스템
│
└── prisma/
    └── schema/
        └── vto-cache.prisma            # DB 스키마
```

---

## 2. AI/ML 모델 및 파이프라인

### 2.1 IDM-VTON 구성요소

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          IDM-VTON Pipeline                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1️⃣ OpenPose (Pose Detection)                                           │
│     └─ Input: 사람 이미지 (384x512)                                      │
│     └─ Output: 18개 신체 키포인트                                        │
│     └─ 역할: 팔, 다리, 몸통 위치 파악                                    │
│                                                                          │
│  2️⃣ Parsing Model (Body Segmentation)                                   │
│     └─ Input: 사람 이미지 + 키포인트                                     │
│     └─ Output: 신체 부위별 마스크 (상의/하의/원피스)                     │
│     └─ 역할: 옷을 입힐 영역 결정                                         │
│                                                                          │
│  3️⃣ DensePose (3D Body Structure)                                       │
│     └─ Input: 사람 이미지                                                │
│     └─ Output: UV 좌표 텐서 (3D 신체 표면)                               │
│     └─ 역할: 옷의 주름, 굴곡 표현                                        │
│                                                                          │
│  4️⃣ CLIP Text Encoder                                                   │
│     └─ Input: 옷 설명 ("Cardigan Gray Button")                           │
│     └─ Output: 5개 텐서 임베딩                                           │
│     └─ 역할: 텍스트 → 벡터 변환                                          │
│                                                                          │
│  5️⃣ IP-Adapter                                                          │
│     └─ Input: 옷 이미지 (768x1024)                                       │
│     └─ Output: 이미지 임베딩                                             │
│     └─ 역할: 옷 디테일 보존 (색상, 패턴)                                 │
│                                                                          │
│  6️⃣ Stable Diffusion XL                                                 │
│     └─ Input: 위의 모든 데이터                                           │
│     └─ Output: 최종 착장 이미지 (768x1024)                               │
│     └─ 역할: Denoising Diffusion 이미지 생성                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Diffusion 파라미터

```python
# api_server.py
images = pipe(
    prompt_embeds=prompt_embeds,           # 긍정 프롬프트 임베딩
    negative_prompt_embeds=negative_prompt_embeds,
    pooled_prompt_embeds=pooled_prompt_embeds,
    negative_pooled_prompt_embeds=negative_pooled_prompt_embeds,
    num_inference_steps=10,                # Denoising 스텝 (기본값)
    generator=torch.Generator(device).manual_seed(42),
    strength=1.0,
    pose_img=pose_img_tensor,              # DensePose 3D 정보
    text_embeds_cloth=prompt_embeds_c,
    cloth=garm_tensor,                     # 옷 텐서
    mask_image=mask,                       # 착장 영역 마스크
    image=human_img,                       # 원본 사람 이미지
    height=1024, width=768,
    ip_adapter_image=garm_img,             # IP-Adapter용
    guidance_scale=2.0,                    # 프롬프트 가이드 강도
)
```

### 2.3 텍스트 임베딩 (5종류)

| 임베딩 | 용도 |
|--------|------|
| `prompt_embeds` | "model is wearing {description}" 인코딩 |
| `negative_prompt_embeds` | "monochrome, lowres, bad anatomy..." |
| `pooled_prompt_embeds` | 풀링된 전역 의미 |
| `negative_pooled_prompt_embeds` | 부정 풀링 버전 |
| `prompt_embeds_c` | IP-Adapter용 "a photo of {description}" |

---

## 3. 이미지 처리 파이프라인

### 3.1 사람 이미지 전처리

```python
def preprocess_human_internal(human_img, category="upper_body"):
    """
    처리 단계:
    1. 리사이즈 (768x1024, 비율 유지)
    2. 패딩 (흰색 배경)
    3. OpenPose 실행 → 키포인트
    4. Parsing Model → 마스크 (category별)
    5. DensePose → 3D 텐서
    """
    # 비율 계산
    aspect_ratio = original_size[0] / original_size[1]
    target_aspect = 768 / 1024

    if aspect_ratio > target_aspect:
        new_width = 768
        new_height = int(768 / aspect_ratio)
    else:
        new_height = 1024
        new_width = int(1024 * aspect_ratio)

    # 패딩 적용
    padded_img = Image.new("RGB", (768, 1024), (255, 255, 255))
    padded_img.paste(human_img, ((768-new_width)//2, (1024-new_height)//2))

    # OpenPose + Parsing + DensePose
    keypoints = openpose_model(human_img.resize((384, 512)))
    model_parse, _ = parsing_model(human_img.resize((384, 512)))
    mask, mask_gray = get_mask_location("hd", category, model_parse, keypoints)
    pose_img_tensor = densepose_model(human_img)
```

### 3.2 카테고리별 마스크

```
┌─────────────────┐
│      Head       │  ← 항상 보존
├─────────────────┤
│   Upper Body    │  ← category="upper_body"
├─────────────────┤
│   Lower Body    │  ← category="lower_body"
├─────────────────┤
│     Shoes       │
└─────────────────┘

category="dresses" → Upper + Lower 전체 마스킹
```

### 3.3 S3 저장 구조

```
closzit-ai-cache/
└── users/{userId}/vton-cache/
    ├── upper/                      # 상의용 전처리
    │   ├── human_img.png
    │   ├── mask.png
    │   ├── mask_gray.png
    │   └── pose_tensor.pkl
    ├── lower/                      # 하의용 전처리
    ├── dresses/                    # 원피스용 전처리
    ├── garments/                   # 옷 전처리
    │   ├── {clothingId}_img.png
    │   └── {clothingId}_tensor.pkl
    └── text/                       # 텍스트 임베딩
        ├── {clothingId}_prompt_embeds.pkl
        ├── {clothingId}_negative_prompt_embeds.pkl
        ├── {clothingId}_pooled_prompt_embeds.pkl
        ├── {clothingId}_negative_pooled_prompt_embeds.pkl
        └── {clothingId}_prompt_embeds_c.pkl

closzit-ai-results/
└── vto/{userId}/{hashKey}.png      # 최종 VTO 결과
```

---

## 4. 3단계 캐싱 시스템

### 4.1 캐시 계층 구조

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    L1: Memory LRU Cache (FastAPI)                        │
├─────────────────────────────────────────────────────────────────────────┤
│  • Human: 최대 10명 (upper/lower/dresses 각각)                           │
│  • Garment: 최대 100개                                                   │
│  • Text: 최대 100개                                                      │
│  • TTL: 24시간 (Adaptive - 최대 96시간)                                  │
│  • 조회: ~1ms                                                            │
└─────────────────────────────────────────────────────────────────────────┘
                              │ 캐시 미스
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    L2: SSD 디스크 캐시 (NVMe)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  • 최대 용량: 50GB                                                       │
│  • 저장 형식: PNG (이미지), PKL (텐서)                                   │
│  • 자동 정리: 용량 초과 시 오래된 파일 삭제                               │
│  • 조회: ~50-100ms                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                              │ 캐시 미스
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    L3: AWS S3 (영구 저장소)                              │
├─────────────────────────────────────────────────────────────────────────┤
│  • 용량: 무제한                                                          │
│  • 조회: ~1-2초                                                          │
│  • 서버 재시작 후에도 유지                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Adaptive TTL (적응형 만료)

```python
@dataclass
class CacheEntry:
    access_count: int
    base_ttl: float = 24 * 3600  # 24시간

    @property
    def effective_ttl(self) -> float:
        if self.access_count >= 50:
            return self.base_ttl * 4  # 96시간 (4일)
        elif self.access_count >= 10:
            return self.base_ttl * 2  # 48시간
        return self.base_ttl          # 24시간
```

### 4.3 Cache Stampede 방지

```python
# Single Flight 패턴
async def get_human_cache(self, user_id, category):
    cache_key = f"human_{category}_{user_id}"

    # 1. L1 체크
    if user_id in l1_cache and not expired:
        return l1_cache[user_id].data

    # 2. 이미 로딩 중인지 확인 (Stampede 방지)
    if cache_key in self._loading:
        # 대기 (최대 30초)
        for _ in range(60):
            await asyncio.sleep(0.5)
            if cache_key not in self._loading:
                if user_id in l1_cache:
                    return l1_cache[user_id].data
                break

    # 3. Lock 획득 후 로드
    async with self._get_lock(cache_key):
        self._loading.add(cache_key)
        try:
            # L2 → L3 순서로 조회
            data = await self._load_from_ssd(...)
            if not data:
                data = await self._load_from_s3(...)
            return data
        finally:
            self._loading.discard(cache_key)
```

### 4.4 LRU Eviction

```python
def _evict_lru(self, cache: OrderedDict, max_size: int):
    while len(cache) > max_size:
        key, entry = cache.popitem(last=False)  # 가장 오래된 항목
        self.stats["evictions"] += 1
```

---

## 5. 비동기 작업 처리 (BullMQ)

### 5.1 Queue 아키텍처

```
Client Request → FittingController → vtoQueue.add('vto', jobData)
                                            │
                                            ▼
                                    ┌───────────────┐
                                    │  Redis Queue  │
                                    │  (vto-queue)  │
                                    └───────┬───────┘
                                            │
                                            ▼
                              ┌─────────────────────────┐
                              │   VtoProcessor Worker   │
                              │   concurrency: 3        │
                              │                         │
                              │  ┌─────┐ ┌─────┐ ┌─────┐│
                              │  │Job 1│ │Job 2│ │Job 3││
                              │  └─────┘ └─────┘ └─────┘│
                              └─────────────────────────┘
```

### 5.2 VTO Processor 구현

```typescript
// vto.processor.ts
@Processor('vto-queue', { concurrency: 3 })
export class VtoProcessor extends WorkerHost {

    async process(job: Job<VtoJobData>): Promise<any> {
        const MAX_RETRIES = 3;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                await job.updateProgress(10 + (attempt - 1) * 10);

                // VTO 실행
                const result = await this.fittingService
                    .processVirtualFittingFromUrls(personImageUrl, clothingUrls, userId);

                // 결과 캐싱
                if (hashKey && clothingIds) {
                    const s3Url = await this.s3Service.uploadBase64Image(...);
                    await this.prisma.vtoCache.upsert({
                        where: { hashKey },
                        update: { s3Url, isVisible: true },
                        create: { hashKey, userId, clothingIds, s3Url, isVisible: true },
                    });
                }

                return result;
            } catch (error) {
                if (isRetryableError && attempt < MAX_RETRIES) {
                    // Exponential Backoff: 2초 → 4초 → 8초
                    await sleep(Math.pow(2, attempt) * 1000);
                    continue;
                }
                throw error;
            }
        }
    }
}
```

### 5.3 재시도 가능한 에러

```typescript
const isRetryableError =
    errorMsg.includes('Invalid response structure') ||
    errorMsg.includes('did not generate any candidates') ||
    error.status === 429 ||  // Rate Limit
    error.status === 503 ||  // Service Unavailable
    error.status === 500;    // Server Error
```

### 5.4 클라이언트 폴링

```javascript
// vtoStore.js
while (pollCount < 300) {  // 최대 5분
    await sleep(1000);  // 1초 간격

    const status = await fetch(`/queue/job/vto/${jobId}`);

    if (status.status === 'completed') {
        await refreshVtoData();
        return;
    } else if (status.status === 'failed') {
        throw new Error(status.error);
    }
    // 'active', 'waiting' → 계속 폴링
}
```

---

## 6. 데이터베이스 설계

### 6.1 VtoCache 스키마

```prisma
model VtoCache {
  id          String   @id @default(dbgenerated("gen_random_uuid()"))

  // 조합 해시 (userId + modelHash + sorted(clothingIds))
  hashKey     String   @unique @map("hash_key")

  userId      String   @map("user_id")
  postId      String   @map("post_id")
  clothingIds String[] @map("clothing_ids")
  s3Url       String   @map("s3_url")

  // Soft Delete
  isVisible   Boolean  @default(true) @map("is_visible")
  // 읽음 여부
  seen        Boolean  @default(false) @map("seen")

  createdAt   DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([hashKey])
  @@index([userId, isVisible, createdAt(sort: Desc)])
  @@map("vto_cache")
}
```

### 6.2 Hash Key 생성

```typescript
// 동일한 사람 + 동일한 옷 조합 → 동일한 hashKey
const sortedClothingIds = [...clothingIds].sort();
const modelHash = crypto.createHash('md5')
    .update(user.fullBodyImage)
    .digest('hex').slice(0, 8);

const hashKey = crypto.createHash('sha256')
    .update(`${userId}:${modelHash}:${sortedClothingIds.join(',')}`)
    .digest('hex');
```

---

## 7. API 설계

### 7.1 전처리 API (FastAPI)

| 엔드포인트 | 메서드 | 설명 | 시간 |
|------------|--------|------|------|
| `/vton/preprocess-human` | POST | OpenPose + Parsing + DensePose | ~10초 |
| `/vton/preprocess-garment` | POST | 옷 리사이즈 + 텐서화 | ~3초 |
| `/vton/preprocess-text` | POST | CLIP 임베딩 생성 | ~2초 |
| `/vton/generate-tryon` | POST | Diffusion 이미지 생성 | ~5초 |

### 7.2 클라이언트 API (NestJS)

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/api/fitting/sns-full-try-on` | POST | SNS 전체 입어보기 (Gemini) |
| `/api/fitting/sns-virtual-try-on` | POST | SNS 하나만 입어보기 (IDM-VTON) |
| `/api/fitting/partial-try-on-by-ids` | POST | 선택한 옷들로 착장 |
| `/api/fitting/single-item-tryon` | POST | 단일 아이템 즉시 착장 |
| `/api/fitting/vto-history` | GET | VTO 히스토리 조회 |
| `/api/fitting/vto/:id/hide` | PATCH | 결과 숨기기 |
| `/api/fitting/vto/mark-all-seen` | PATCH | 모두 읽음 처리 |
| `/queue/job/vto/:jobId` | GET | Job 상태 조회 |

---

## 8. 프론트엔드 상태 관리

### 8.1 Zustand Store

```javascript
// vtoStore.js
export const useVtoStore = create((set, get) => ({
    // State
    vtoLoadingPosts: new Set(),
    vtoResults: [],
    fullVtoResults: [],
    singleVtoResults: [],
    unseenCount: 0,
    isVtoModalOpen: false,
    showCreditModal: false,
    pendingVtoRequest: null,
    userCredit: 0,

    // Actions
    refreshVtoData: async () => {
        const data = await fetch('/api/fitting/vto-history');
        set({
            fullVtoResults: data.fullResults,
            singleVtoResults: data.singleResults,
            unseenCount: data.unseenCount,
        });
    },

    requestVtoWithCreditCheck: (type, data, buttonPosition) => {
        get().fetchUserCredit();
        set({ pendingVtoRequest: { type, data, buttonPosition }, showCreditModal: true });
    },

    executeVtoRequest: async (postId) => { /* 폴링 로직 */ },
    executePartialVtoByIds: async (clothingIds) => { /* 폴링 로직 */ },
    deleteVtoResult: async (id) => { /* Soft Delete */ },
}));
```

### 8.2 sessionStorage 관리

```javascript
// vtoStorage.js
// 용량 초과 시 가장 오래된 항목부터 삭제
const saveVtoResults = (results) => {
    let dataToSave = [...results];

    for (let attempt = 0; attempt < 10; attempt++) {
        try {
            sessionStorage.setItem(VTO_STORAGE_KEY, JSON.stringify(dataToSave));
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError' && dataToSave.length > 1) {
                dataToSave.pop();  // 가장 오래된 항목 제거
                continue;
            }
            return false;
        }
    }
};
```

---

## 9. 성능 최적화

### 9.1 GPU 최적화

```python
def apply_gpu_optimizations():
    # ✅ 활성화
    torch.backends.cudnn.benchmark = True      # cuDNN 최적 알고리즘
    torch.backends.cuda.matmul.allow_tf32 = True  # TF32 (Ampere GPU)
    pipe.vae.enable_slicing()                  # VAE 슬라이싱

    # ❌ 비활성화 (호환성/성능 문제)
    # pipe.enable_attention_slicing()  # 오히려 느려짐
    # torch.compile(pipe.unet)         # 첫 실행 30초+
```

### 9.2 S3 병렬 다운로드

```python
with concurrent.futures.ThreadPoolExecutor(max_workers=11) as executor:
    futures = {
        "human_img": executor.submit(download_s3_as_pil, ...),
        "mask": executor.submit(download_s3_as_pil, ...),
        # ... 총 11개 파일
    }
    results = {k: f.result() for k, f in futures.items()}

# 성능: 순차 8-10초 → 병렬 1-2초 (7배 개선)
```

### 9.3 텐서 메모리 최적화

```python
def download_s3_as_tensor(key, device):
    tensor = pickle.loads(download_from_s3(key))
    # contiguous: GPU 메모리 접근 패턴 최적화 → 5-10% 성능 향상
    return tensor.to(device, torch.float16).contiguous()
```

### 9.4 GPU 동시성 제어

```python
gpu_lock = asyncio.Lock()

async def generate_tryon(request):
    async with gpu_lock:  # 한 번에 하나만 실행
        result = generate_tryon_internal(...)
        return result
```

---

## 10. 에러 핸들링

### 10.1 재시도 전략 (Exponential Backoff)

```
Attempt 1 실패 → 2초 대기 → Attempt 2
Attempt 2 실패 → 4초 대기 → Attempt 3
Attempt 3 실패 → 에러 반환
```

### 10.2 크레딧 보호 (Fail-Fast)

```typescript
async processVirtualFitting(images, userId) {
    // 1. 크레딧 차감 먼저
    if (userId) {
        await this.creditService.deductVtoCredit(userId);  // 실패 시 즉시 에러
    }

    // 2. VTO 처리 (크레딧 이미 차감됨)
    const result = await generateContent(...);
    return result;
}
```

### 10.3 Graceful Degradation

```typescript
// 캐싱 실패해도 결과는 반환
if (hashKey) {
    try {
        await saveToS3AndDB(...);
    } catch (saveError) {
        logger.error('Cache save failed');
        // 캐싱 실패해도 사용자에게 결과 반환
        return { ...result };
    }
}
```

---

## 11. 면접 예상 질문

### Q1. 3단계 캐싱이 필요한 이유?

**A:** 처리 시간 단축과 비용 절감을 위해 설계했습니다.
- L1 (메모리): 자주 사용되는 데이터 (~1ms)
- L2 (SSD): 최근 사용 데이터 (~100ms)
- L3 (S3): 영구 저장 (~1-2초)

결과: 첫 VTO 15-20초 → 캐시 히트 시 2초로 단축

### Q2. Cache Stampede 해결 방법?

**A:** Single Flight 패턴을 사용했습니다.
- `_loading` Set으로 로딩 중인 키 추적
- 첫 요청만 S3에서 로드
- 나머지는 대기 후 L1에서 조회

### Q3. BullMQ를 선택한 이유?

**A:**
- VTO는 15-20초 소요 → 동기 처리 시 타임아웃
- `concurrency: 3`으로 GPU 메모리 보호
- 재시도, 모니터링 기능 내장
- Redis 기반으로 확장성 좋음

### Q4. Hash Key 설계 이유?

**A:** 동일한 조합의 재요청 시 캐시 재사용을 위해:
- `userId + modelHash + sorted(clothingIds)`
- 옷 선택 순서 무관 (정렬)
- 사람 이미지 변경 시 다른 해시

### Q5. 프롬프트 임베딩 5개인 이유?

**A:** SDXL 파이프라인 요구사항:
- `prompt_embeds`: 긍정 프롬프트
- `negative_prompt_embeds`: 부정 프롬프트
- `pooled_prompt_embeds`: 전역 의미
- `negative_pooled_prompt_embeds`: 부정 전역
- `prompt_embeds_c`: IP-Adapter용

---

## 성능 벤치마크

| 작업 | 시간 | 비고 |
|------|------|------|
| 사람 전처리 | ~10초 | OpenPose + DensePose |
| 옷 전처리 | ~3초 | 리사이즈 + 텐서화 |
| 텍스트 임베딩 | ~2초 | CLIP |
| L1 캐시 조회 | ~1ms | 메모리 |
| L2 캐시 조회 | ~100ms | SSD |
| L3 캐시 조회 | ~1-2초 | S3 |
| Diffusion | ~4초 | 10 steps |
| **첫 VTO** | **15-20초** | 전처리 포함 |
| **캐시 히트** | **~2초** | L1 + Diffusion |

---

## 크레딧 정책

| 기능 | 크레딧 |
|------|--------|
| 전체 VTO | -3 |
| 부분 VTO | -2 |
| 옷 펴기 | -1 |
| 옷 등록 | +10 |

---

## 환경 변수

```env
# AI Server
VTON_API_URL=http://localhost:55554
VTON_PORT=55554
CUDA_VISIBLE_DEVICES=0

# AWS S3
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=closzit-ai-cache

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Queue
VTO_QUEUE_NAME=vto-queue
```

---

## 참고 문서

- [IDM-VTON Paper](https://arxiv.org/abs/2403.05139)
- [Stable Diffusion XL](https://stability.ai/stable-diffusion)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
