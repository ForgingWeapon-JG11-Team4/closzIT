# 옷펴기 데모 이미지 S3 저장 가이드

시연 시 Gemini API 지연/오류 발생 시 보여줄 데모 이미지를 S3에 저장하는 방법입니다.

## 1. S3 버킷 정보
- **버킷명**: `closzit-ai-results`
- **Region**: `ap-northeast-2` (Seoul)

## 2. 폴더 구조
S3 버킷 내에 아래 구조로 폴더와 이미지를 생성해야 합니다.

```text
closzit-ai-results/
└── demo/
    └── {SET_ID}/           <-- .env의 REACT_APP_DEMO_SET_ID 값 (예: 1)
        ├── outer.png       <-- 아우터 (대문자 불가, 소문자로 저장)
        ├── top.png         <-- 상의
        ├── bottom.png      <-- 하의
        └── shoes.png       <-- 신발
```

## 3. 파일 저장 규칙
1.  **파일명**: 각 카테고리 영문 소문자 (`outer`, `top`, `bottom`, `shoes`).
    - 확장자는 `.png` 권장 (투명 배경).
2.  **경로 예시**:
    - `REACT_APP_DEMO_SET_ID=1` 인 경우:
        - `https://closzit-ai-results.s3.ap-northeast-2.amazonaws.com/demo/1/top.png`
        - `https://closzit-ai-results.s3.ap-northeast-2.amazonaws.com/demo/1/bottom.png`

## 4. 환경 변수 설정 (Frontend)
`closzIT-front/.env` 파일에 아래 내용이 설정되어 있어야 합니다.

```env
REACT_APP_DEMO_SET_ID=1
REACT_APP_FLATTEN_TIMEOUT_MS=5000  # 5초 (5초 동안 응답 없으면 위 S3 이미지 로드)
REACT_APP_USE_DEMO_FALLBACK=true   # true일 때만 데모 기능 동작 (false 또는 없음: 동작 안 함)
```

## 5. 동작 방식 (Backend Proxy)
S3 권한(403) 및 CORS 문제를 피하기 위해 프론트엔드에서 S3를 직접 호출하지 않고 백엔드를 통해 이미지를 가져옵니다.
- **API**: `GET /analysis/demo-image?setId={SET_ID}&category={CATEGORY}`
- **Bucket**: `closzit-ai-results` (백엔드 코드에 하드코딩 되어 있음)
