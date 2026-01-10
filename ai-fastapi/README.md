# AI FastAPI 서버

의류 이미지 분석을 위한 FastAPI 서버입니다.

## 기능

- **YOLO 객체 탐지**: 의류, 신발 등 패션 아이템 탐지
- **SAM2 세그멘테이션**: 정밀한 배경 제거
- **FashionSigLIP 임베딩**: 유사 의류 검색을 위한 벡터 추출

## 설치 방법

### 1. 의존성 설치

```bash
pip install -r requirements.txt
```

### 2. 모델 다운로드 (필수!)

처음 클론 후 반드시 모델을 다운로드해야 합니다:

```bash
python download_models.py
```

이 스크립트는 다음 모델들을 Hugging Face에서 자동으로 다운로드합니다:

| 모델 | 크기 | 용도 |
|------|------|------|
| `yolov8n-clothing/best.pt` | ~6MB | 의류/신발/가방/액세서리 분류 |
| `deepfashion2_yolov8s-seg.pt` | ~23MB | 의류 상세 분류 |
| `sam2_hiera_large.pt` | ~857MB | 정밀 세그멘테이션 |

> ⚠️ SAM2 모델은 857MB로 다운로드에 시간이 걸릴 수 있습니다.

### 3. 서버 실행

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 55554
```

## API 엔드포인트

### `GET /`
서버 상태 확인

### `GET /status`
로드된 모델 목록 확인

### `POST /analyze`
이미지 업로드 → 객체 탐지 + 세그멘테이션

### `POST /analyze-all`
이미지 업로드 → 객체 탐지 + 세그멘테이션 + 임베딩 추출

## 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `USE_SAM2` | `false` | SAM2 세그멘테이션 활성화 (true/false) |

## 문제 해결

### 모델 다운로드 실패 시

수동으로 다운로드할 수 있습니다:

1. **yolov8n-clothing**: https://huggingface.co/kesimeg/yolov8n-clothing-detection
2. **SAM2**: https://huggingface.co/facebook/sam2-hiera-large

다운로드한 파일을 `checkpoints/` 폴더에 저장하세요.
