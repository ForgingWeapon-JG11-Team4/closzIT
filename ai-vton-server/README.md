# IDM-VTON FastAPI Server

IDM-VTON 가상 피팅 전용 서버 (GPU 필수)

## 환경 설정

### 1. Conda 환경 생성

```bash
# Conda 환경 생성
conda create -n idm-vton python=3.10 -y
conda activate idm-vton

# 의존성 설치
pip install -r requirements.txt
```

### 2. PyTorch 설치 (CUDA 11.8)

```bash
# CUDA 11.8용 PyTorch 설치
conda install pytorch torchvision torchaudio pytorch-cuda=11.8 -c pytorch -c nvidia
```

### 3. IDM-VTON 모델 다운로드

```bash
# 모델 체크포인트 다운로드
# TODO: 실제 모델 파일 경로 추가
```

## 서버 실행

### 로컬 테스트

```bash
conda activate idm-vton
python main.py
```

서버 주소: `http://localhost:55554`

### GPU 서버 배포

```bash
# GPU 서버에서 실행
conda activate idm-vton
nohup python main.py > vton-server.log 2>&1 &

# 포트 확인
curl http://localhost:55554/health
```

## API 엔드포인트

### Health Check
- `GET /health` - 서버 상태 확인

### VTON Preprocessing
- `POST /vton/preprocess-human` - 사람 이미지 전처리
- `POST /vton/preprocess-garment` - 옷 이미지 전처리
- `POST /vton/preprocess-text` - 텍스트 임베딩

### VTON Generation
- `POST /vton/generate-tryon` - Diffusion 생성

## NestJS 백엔드 연동

`.env` 파일에 추가:

```env
# 기존 FastAPI (팀원 서버)
FASTAPI_URL=http://gpu-server:8000

# IDM-VTON 서버 (당신 서버)
VTON_API_URL=http://gpu-server:55554
```

## 포트 구분

- **8000**: 기존 FastAPI (venv, YOLO/CLIP/임베딩)
- **55554**: IDM-VTON 서버 (conda, OpenPose/DensePose/Diffusion)
