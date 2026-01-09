# GPU 서버 배포 가이드

## 📋 사전 준비

- GPU 서버 접속 권한
- Conda 설치 완료
- CUDA 11.8 이상 설치 완료

## 🚀 배포 단계

### 1. GPU 서버 접속

```bash
ssh user@gpu-server-ip
```

### 2. 프로젝트 클론

```bash
cd /home/your-workspace
git clone https://github.com/your-repo/closzIT.git
cd closzIT/ai-vton-server
```

### 3. Conda 환경 생성

```bash
# Conda 환경 생성 (Python 3.10)
conda create -n idm-vton python=3.10 -y
conda activate idm-vton

# PyTorch 설치 (CUDA 11.8)
conda install pytorch torchvision torchaudio pytorch-cuda=11.8 -c pytorch -c nvidia

# 기본 의존성 설치
pip install -r requirements.txt
```

### 4. 환경 변수 설정

```bash
# .env 파일 생성
cat > .env << EOF
VTON_PORT=8001
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
EOF
```

### 5. 포트 열기

```bash
# 방화벽에서 8001 포트 열기
sudo ufw allow 8001/tcp
```

### 6. 서버 실행

#### 테스트 실행 (포그라운드)

```bash
conda activate idm-vton
python main.py
```

#### 프로덕션 실행 (백그라운드)

```bash
conda activate idm-vton
nohup python main.py > vton-server.log 2>&1 &

# 프로세스 확인
ps aux | grep main.py

# 로그 확인
tail -f vton-server.log
```

### 7. 서버 상태 확인

```bash
# 로컬에서 확인
curl http://localhost:8001/health

# 외부에서 확인 (다른 서버나 로컬 PC에서)
curl http://gpu-server-ip:8001/health
```

## 🔧 서버 관리

### 서버 재시작

```bash
# 프로세스 찾기
ps aux | grep main.py

# 프로세스 종료
kill -9 <PID>

# 재시작
conda activate idm-vton
nohup python main.py > vton-server.log 2>&1 &
```

### 로그 모니터링

```bash
# 실시간 로그
tail -f vton-server.log

# 최근 100줄
tail -n 100 vton-server.log

# 에러만 필터링
grep -i error vton-server.log
```

## 🌐 NestJS 백엔드 연동

NestJS 서버의 `.env` 파일에 추가:

```env
# 기존 FastAPI (팀원 서버, port 8000)
FASTAPI_URL=http://gpu-server-ip:8000

# IDM-VTON 서버 (당신 서버, port 8001)
VTON_API_URL=http://gpu-server-ip:8001
```

## 📊 현재 시스템 구조

```
┌─────────────────────────────────────────────────────┐
│              NestJS Backend (port 3000)             │
│                                                     │
│  - 사용자 관리, 옷 관리, 피팅 요청 처리             │
│  - S3 캐싱 관리                                     │
└──────────────┬─────────────────┬────────────────────┘
               │                 │
               │                 │
       ┌───────▼────────┐ ┌─────▼──────────────┐
       │  FastAPI 8000  │ │  VTON API 8001     │
       │  (팀원, venv)  │ │  (당신, conda)     │
       │                │ │                    │
       │  - YOLO        │ │  - OpenPose        │
       │  - CLIP        │ │  - DensePose       │
       │  - 임베딩      │ │  - Parsing         │
       │                │ │  - IDM-VTON        │
       └────────────────┘ └────────────────────┘
```

## 🐛 트러블슈팅

### 포트가 이미 사용 중인 경우

```bash
# 8001 포트 사용 프로세스 확인
lsof -i :8001

# 프로세스 종료
kill -9 <PID>
```

### CUDA 메모리 부족

```bash
# GPU 메모리 확인
nvidia-smi

# 다른 프로세스 종료 후 재시작
```

### Conda 환경 활성화 안 됨

```bash
# Conda 초기화
conda init bash
source ~/.bashrc

# 환경 활성화
conda activate idm-vton
```

## 📝 TODO (실제 모델 통합)

아직 Mock 구현 상태입니다. 실제 IDM-VTON 모델을 통합하려면:

1. ✅ 서버 구조 완성
2. ⏳ OpenPose 모델 통합
3. ⏳ DensePose 모델 통합
4. ⏳ Parsing 모델 통합
5. ⏳ IDM-VTON Diffusion 파이프라인 통합
6. ⏳ S3 캐시 데이터 로드 로직
