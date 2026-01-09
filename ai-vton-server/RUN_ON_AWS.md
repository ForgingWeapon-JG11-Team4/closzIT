# AWS GPU 서버에서 IDM-VTON API 서버 실행

## 📋 사전 준비

이미 `~/app/virtual-try/IDM-VTON/` 디렉토리에 모델이 설치되어 있다고 가정합니다.

## 🚀 배포 단계

### 1. AWS 서버 접속

```bash
ssh ubuntu@your-gpu-server-ip
```

### 2. IDM-VTON 디렉토리로 이동

```bash
cd ~/app/virtual-try/IDM-VTON
```

### 3. API 서버 파일 복사

로컬에서 작성한 `api_server.py`를 AWS 서버로 복사합니다.

**방법 1: SCP 사용 (로컬 PC에서 실행)**
```bash
scp c:\Users\kmj00\Desktop\project\closzIT\ai-vton-server\api_server.py ubuntu@your-gpu-server-ip:~/app/virtual-try/IDM-VTON/
```

**방법 2: 직접 생성 (AWS 서버에서 실행)**
```bash
cd ~/app/virtual-try/IDM-VTON

# api_server.py 파일 생성
cat > api_server.py << 'EOFAPI'
# 위의 api_server.py 내용을 여기에 붙여넣기
EOFAPI
```

### 4. 환경 변수 설정

```bash
cd ~/app/virtual-try/IDM-VTON

# .env 파일 생성
cat > .env << 'EOF'
VTON_PORT=8001
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-northeast-2
EOF
```

### 5. 필요한 의존성 설치 (FastAPI)

```bash
# Conda 환경 활성화
source ~/miniconda3/etc/profile.d/conda.sh
conda activate vton

# FastAPI 및 Uvicorn 설치
pip install fastapi uvicorn[standard] python-multipart
```

### 6. 포트 8001 개방

```bash
# 방화벽에서 8001 포트 열기
sudo ufw allow 8001/tcp

# 포트 상태 확인
sudo ufw status
```

### 7. API 서버 실행

#### 테스트 실행 (포그라운드)

```bash
cd ~/app/virtual-try/IDM-VTON
source ~/miniconda3/etc/profile.d/conda.sh
conda activate vton

python api_server.py
```

#### 프로덕션 실행 (백그라운드)

```bash
cd ~/app/virtual-try/IDM-VTON
source ~/miniconda3/etc/profile.d/conda.sh
conda activate vton

nohup python api_server.py > vton-api.log 2>&1 &

# 프로세스 확인
ps aux | grep api_server.py

# 로그 확인
tail -f vton-api.log
```

### 8. 서버 상태 확인

```bash
# 로컬에서 확인
curl http://localhost:8001/health

# 외부에서 확인
curl http://your-gpu-server-ip:8001/health

# 상세 정보
curl http://localhost:8001/
```

**예상 응답:**
```json
{
  "service": "IDM-VTON API Server",
  "status": "running",
  "port": 8001,
  "environment": "conda",
  "models_loaded": true,
  "cache_stats": {
    "humans": 0,
    "garments": 0,
    "texts": 0
  }
}
```

---

## 🔧 서버 관리

### 서버 재시작

```bash
# 프로세스 찾기
ps aux | grep api_server.py

# 프로세스 종료
kill -9 <PID>

# 또는 포트로 종료
lsof -ti:8001 | xargs kill -9

# 재시작
cd ~/app/virtual-try/IDM-VTON
source ~/miniconda3/etc/profile.d/conda.sh
conda activate vton
nohup python api_server.py > vton-api.log 2>&1 &
```

### 로그 모니터링

```bash
# 실시간 로그
tail -f ~/app/virtual-try/IDM-VTON/vton-api.log

# 최근 100줄
tail -n 100 ~/app/virtual-try/IDM-VTON/vton-api.log

# 에러만 필터링
grep -i error ~/app/virtual-try/IDM-VTON/vton-api.log
```

### 자동 재시작 스크립트

```bash
cd ~/app/virtual-try/IDM-VTON

# restart-vton-api.sh 생성
cat > restart-vton-api.sh << 'EOF'
#!/bin/bash

echo "=========================================="
echo "IDM-VTON API 서버 재시작 시작..."
echo "=========================================="

# 기존 프로세스 종료
echo "[1/3] 기존 프로세스 종료 중..."
pkill -f "python.*api_server.py"
sleep 2

# Conda 환경 활성화
echo "[2/3] Conda 환경 활성화..."
source ~/miniconda3/etc/profile.d/conda.sh
conda activate vton

# 서버 재시작
echo "[3/3] 서버 시작 중..."
cd ~/app/virtual-try/IDM-VTON
nohup python api_server.py > vton-api.log 2>&1 &
sleep 5

echo "=========================================="
echo "재시작 완료!"
echo "=========================================="

# 상태 확인
echo ""
echo "프로세스 확인:"
ps aux | grep api_server.py

echo ""
echo "Health Check:"
curl http://localhost:8001/health
EOF

# 실행 권한 부여
chmod +x restart-vton-api.sh

# 실행
./restart-vton-api.sh
```

---

## 🧪 API 테스트

### 1. Health Check

```bash
curl http://localhost:8001/health
```

### 2. 사람 전처리 테스트

```bash
# 이미지를 Base64로 인코딩
base64 -w 0 test_human.jpg > human_b64.txt

# API 호출
curl -X POST http://localhost:8001/vton/preprocess-human \
  -H "Content-Type: application/json" \
  -d '{
    "image_base64": "'$(cat human_b64.txt)'"
  }'
```

### 3. 옷 전처리 테스트

```bash
base64 -w 0 test_garment.jpg > garment_b64.txt

curl -X POST http://localhost:8001/vton/preprocess-garment \
  -H "Content-Type: application/json" \
  -d '{
    "image_base64": "'$(cat garment_b64.txt)'"
  }'
```

### 4. 텍스트 임베딩 테스트

```bash
curl -X POST http://localhost:8001/vton/preprocess-text \
  -H "Content-Type: application/json" \
  -d '{
    "garment_description": "a blue shirt"
  }'
```

---

## 🔗 NestJS 백엔드 연동

NestJS 서버에서 이 API를 사용하려면:

### 1. NestJS .env 파일 설정

```bash
cd ~/app/your-nestjs-backend

# .env 파일 수정
nano .env
```

**추가할 내용:**
```env
# IDM-VTON API 서버
VTON_API_URL=http://localhost:8001

# 외부 접근 시
# VTON_API_URL=http://your-gpu-server-ip:8001
```

### 2. NestJS 재시작

```bash
# NestJS 프로세스 종료
pkill -f "node.*nest"

# 재시작
cd ~/app/your-nestjs-backend
nohup npm run start:prod > nestjs.log 2>&1 &
```

---

## 📊 시스템 아키텍처

```
┌─────────────────────────────────────────────────────┐
│         NestJS Backend (port 3000)                  │
│   - /api/fitting/single-item-tryon                  │
└────────────────────┬────────────────────────────────┘
                     │
                     │ HTTP Request
                     │
       ┌─────────────▼──────────────────┐
       │  IDM-VTON API (port 8001)      │
       │  ~/app/virtual-try/IDM-VTON/   │
       │                                │
       │  - /vton/preprocess-human      │
       │  - /vton/preprocess-garment    │
       │  - /vton/preprocess-text       │
       │  - /vton/generate-tryon        │
       │                                │
       │  [메모리 캐시]                 │
       │  - human_cache                 │
       │  - garment_cache               │
       │  - text_cache                  │
       └────────────────────────────────┘
```

---

## 🐛 트러블슈팅

### 모델 로딩 실패

```bash
# gradio_demo/app.py 파일 확인
ls -la ~/app/virtual-try/IDM-VTON/gradio_demo/app.py

# 모델 체크포인트 확인
ls -la ~/app/virtual-try/IDM-VTON/ckpt/
```

### CUDA Out of Memory

```bash
# GPU 메모리 확인
nvidia-smi

# 다른 프로세스 종료
nvidia-smi --query-compute-apps=pid,used_memory --format=csv
kill -9 <PID>
```

### 포트 충돌

```bash
# 8001 포트 사용 확인
lsof -i :8001

# 프로세스 종료
lsof -ti:8001 | xargs kill -9
```

### Import 오류

```bash
# Python 경로 확인
cd ~/app/virtual-try/IDM-VTON
source ~/miniconda3/etc/profile.d/conda.sh
conda activate vton

python -c "import sys; print('\n'.join(sys.path))"

# gradio_demo 모듈 확인
ls -la gradio_demo/
```

---

## ✨ 다음 단계

1. **S3 캐시 통합**: S3에서 전처리 데이터 로드/저장
2. **캐시 키 매핑**: user_id, clothing_id를 캐시 키로 사용
3. **배치 처리**: 여러 이미지를 한 번에 전처리
4. **모니터링**: Prometheus + Grafana 연동

---

## 📝 참고사항

- 기존 Gradio 서버(`run.sh`)와 FastAPI 서버를 **동시에 실행 가능**
- Gradio: Port 7860 (테스트용)
- FastAPI: Port 8001 (프로덕션용)
- 모델은 공유되며, 각자 독립적인 캐시를 사용

---

## 🚀 빠른 배포 (One-liner)

```bash
cd ~/app/virtual-try/IDM-VTON && \
source ~/miniconda3/etc/profile.d/conda.sh && \
conda activate vton && \
pip install fastapi uvicorn[standard] python-multipart -q && \
pkill -f "python.*api_server.py" ; sleep 2 && \
nohup python api_server.py > vton-api.log 2>&1 & \
sleep 10 && \
echo "서버 시작 완료!" && \
curl http://localhost:8001/health
```
