# 🚀 CloszIT 전체 시스템 배포 가이드 (virtual-fit-one 브랜치)

## 📋 시스템 구성

```
┌─────────────────────────────────────────────────────┐
│         클라이언트 (React Frontend)                  │
│         POST /api/fitting/single-item-tryon         │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│         NestJS Backend (Port 3000)                  │
│   - VtonCacheService                                │
│   - FittingController                               │
│   - S3 캐시 관리                                    │
└──────────────┬─────────────────┬────────────────────┘
               │                 │
       ┌───────▼────────┐ ┌─────▼──────────────────┐
       │  FastAPI 8000  │ │  IDM-VTON API 8001     │
       │  (팀원, venv)  │ │  ~/app/virtual-try/    │
       │                │ │  IDM-VTON/             │
       │  - YOLO        │ │                        │
       │  - CLIP        │ │  - OpenPose            │
       │  - 임베딩      │ │  - DensePose           │
       │                │ │  - Parsing             │
       │                │ │  - IDM-VTON Diffusion  │
       └────────────────┘ └────────────────────────┘
```

---

## 🎯 1단계: Git 코드 업데이트

### AWS 서버 접속
```bash
ssh ubuntu@your-gpu-server-ip
```

### 코드 업데이트
```bash
cd /path/to/closzIT

# 현재 변경사항 백업
git stash

# virtual-fit-one 브랜치로 전환
git fetch origin
git checkout virtual-fit-one
git pull origin virtual-fit-one

# 최근 커밋 확인
git log -3
```

---

## 🤖 2단계: IDM-VTON API 서버 배포 (Port 8001)

### 2.1 API 서버 파일 배치

```bash
# IDM-VTON 디렉토리로 이동
cd ~/app/virtual-try/IDM-VTON
```

**방법 1: 로컬에서 SCP로 전송 (Windows PC에서 실행)**
```powershell
# Windows PowerShell에서
scp C:\Users\kmj00\Desktop\project\closzIT\ai-vton-server\api_server.py ubuntu@your-gpu-server-ip:~/app/virtual-try/IDM-VTON/
```

**방법 2: 직접 생성 (AWS 서버에서)**
```bash
cd ~/app/virtual-try/IDM-VTON

# GitHub에서 다운로드
wget https://raw.githubusercontent.com/your-repo/closzIT/virtual-fit-one/ai-vton-server/api_server.py

# 또는 nano로 직접 작성
nano api_server.py
# (api_server.py 내용 붙여넣기)
```

### 2.2 환경 변수 설정

```bash
cd ~/app/virtual-try/IDM-VTON

cat > .env << 'EOF'
VTON_PORT=8001
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-northeast-2
EOF
```

### 2.3 의존성 설치

```bash
# Conda 환경 활성화
source ~/miniconda3/etc/profile.d/conda.sh
conda activate vton

# FastAPI 설치
pip install fastapi uvicorn[standard] python-multipart
```

### 2.4 포트 개방

```bash
sudo ufw allow 8001/tcp
sudo ufw status
```

### 2.5 서버 시작

```bash
cd ~/app/virtual-try/IDM-VTON
source ~/miniconda3/etc/profile.d/conda.sh
conda activate vton

# 기존 프로세스 종료
pkill -f "python.*api_server.py"
sleep 2

# 백그라운드 실행
nohup python api_server.py > vton-api.log 2>&1 &

# 프로세스 확인
ps aux | grep api_server.py

# 로그 확인
tail -f vton-api.log
```

### 2.6 Health Check

```bash
# 로컬
curl http://localhost:8001/health

# 외부
curl http://your-gpu-server-ip:8001/health
```

**예상 응답:**
```json
{
  "status": "healthy",
  "models_loaded": true,
  "cache_stats": {
    "humans": 0,
    "garments": 0,
    "texts": 0
  }
}
```

---

## 🏗️ 3단계: NestJS 백엔드 배포 (Port 3000)

### 3.1 백엔드 디렉토리로 이동

```bash
cd /path/to/closzIT/closzIT-back
```

### 3.2 환경 변수 설정

```bash
# .env 파일 편집
nano .env
```

**추가/수정할 내용:**
```env
# ====================================
# FastAPI Servers
# ====================================
# 기존 FastAPI 서버 (팀원, venv, port 8000)
FASTAPI_URL=http://localhost:8000

# IDM-VTON 서버 (당신, conda, port 8001)
VTON_API_URL=http://localhost:8001

# 외부 접근 시:
# VTON_API_URL=http://your-gpu-server-ip:8001

# ====================================
# Database
# ====================================
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# ====================================
# AWS
# ====================================
AWS_REGION=ap-northeast-1
AWS_S3_REGION=ap-northeast-2
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# ====================================
# Google API
# ====================================
GOOGLE_API_KEY=your-google-api-key

# ====================================
# JWT
# ====================================
JWT_SECRET=your-jwt-secret
```

### 3.3 의존성 설치

```bash
npm install
```

### 3.4 데이터베이스 마이그레이션 (필요시)

```bash
npx prisma generate
npx prisma migrate deploy
```

### 3.5 기존 프로세스 종료

```bash
# NestJS 프로세스 찾기
ps aux | grep "node.*nest"

# 종료
kill -9 <PID>
```

### 3.6 빌드 및 실행

```bash
# 프로덕션 빌드
npm run build

# 백그라운드 실행
nohup npm run start:prod > nestjs.log 2>&1 &

# 프로세스 확인
ps aux | grep "node.*nest"

# 로그 확인
tail -f nestjs.log
```

### 3.7 Health Check

```bash
# 로컬
curl http://localhost:3000/health

# 외부
curl http://your-gpu-server-ip:3000/health
```

---

## ✅ 4단계: 전체 시스템 확인

### 4.1 모든 서버 상태 확인

```bash
echo "=========================================="
echo "서버 상태 확인"
echo "=========================================="

# NestJS (Port 3000)
echo "NestJS Backend:"
curl -s http://localhost:3000/health | jq

# 기존 FastAPI (Port 8000) - 팀원 서버
echo ""
echo "FastAPI (8000):"
curl -s http://localhost:8000/health | jq

# IDM-VTON API (Port 8001)
echo ""
echo "IDM-VTON API (8001):"
curl -s http://localhost:8001/health | jq

echo ""
echo "=========================================="
```

### 4.2 프로세스 확인

```bash
echo "실행 중인 프로세스:"
ps aux | grep -E "node.*nest|python.*api_server|uvicorn"

echo ""
echo "포트 사용 확인:"
sudo netstat -tulpn | grep -E "3000|8000|8001"
```

### 4.3 통합 테스트

#### 방법 1: curl로 테스트

```bash
# 1. 사람 이미지를 Base64로 인코딩
base64 -w 0 test_human.jpg > human_b64.txt

# 2. NestJS를 통해 전처리 요청
curl -X POST http://localhost:3000/api/vton-cache/preprocess-human \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "image_base64": "'$(cat human_b64.txt)'"
  }'
```

#### 방법 2: 프론트엔드에서 테스트

1. React 앱 접속
2. 로그인
3. Main 페이지에서 옷 선택
4. "하나만 입어보기 (AI)" 버튼 클릭
5. 브라우저 개발자 도구에서 네트워크 확인

---

## 🔄 5단계: 자동 재시작 스크립트

### 전체 시스템 재시작 스크립트 생성

```bash
cd /path/to/closzIT

cat > restart-all-servers.sh << 'EOF'
#!/bin/bash

echo "=========================================="
echo "전체 시스템 재시작 시작..."
echo "=========================================="

# 1. NestJS 종료
echo "[1/4] NestJS 서버 종료 중..."
pkill -f "node.*nest"
sleep 2

# 2. IDM-VTON API 종료
echo "[2/4] IDM-VTON API 서버 종료 중..."
pkill -f "python.*api_server.py"
sleep 2

# 3. IDM-VTON API 시작
echo "[3/4] IDM-VTON API 서버 시작 중..."
cd ~/app/virtual-try/IDM-VTON
source ~/miniconda3/etc/profile.d/conda.sh
conda activate vton
nohup python api_server.py > vton-api.log 2>&1 &
sleep 5

# 4. NestJS 시작
echo "[4/4] NestJS 서버 시작 중..."
cd /path/to/closzIT/closzIT-back
nohup npm run start:prod > nestjs.log 2>&1 &
sleep 5

echo "=========================================="
echo "재시작 완료!"
echo "=========================================="

# 상태 확인
echo ""
echo "프로세스 확인:"
ps aux | grep -E "node.*nest|python.*api_server"

echo ""
echo "포트 확인:"
sudo netstat -tulpn | grep -E "3000|8001"

echo ""
echo "Health Check:"
echo "NestJS:"
curl -s http://localhost:3000/health | jq
echo ""
echo "IDM-VTON:"
curl -s http://localhost:8001/health | jq
EOF

chmod +x restart-all-servers.sh

# 실행
./restart-all-servers.sh
```

---

## 🐛 6단계: 트러블슈팅

### 문제 1: IDM-VTON 모델 로딩 실패

```bash
# gradio_demo/app.py 확인
ls -la ~/app/virtual-try/IDM-VTON/gradio_demo/app.py

# 모델 체크포인트 확인
ls -la ~/app/virtual-try/IDM-VTON/ckpt/

# 로그 확인
tail -100 ~/app/virtual-try/IDM-VTON/vton-api.log
```

### 문제 2: NestJS → VTON API 연결 실패

```bash
# 환경 변수 확인
cd /path/to/closzIT/closzIT-back
grep VTON_API_URL .env

# NestJS 로그 확인
tail -100 nestjs.log | grep -i vton

# 네트워크 연결 테스트
curl -v http://localhost:8001/health
```

### 문제 3: CUDA Out of Memory

```bash
# GPU 메모리 확인
nvidia-smi

# 다른 프로세스 종료
nvidia-smi --query-compute-apps=pid,used_memory --format=csv
kill -9 <PID>

# IDM-VTON API 재시작
cd ~/app/virtual-try/IDM-VTON
pkill -f api_server.py
sleep 2
source ~/miniconda3/etc/profile.d/conda.sh
conda activate vton
nohup python api_server.py > vton-api.log 2>&1 &
```

### 문제 4: 포트 충돌

```bash
# 포트 사용 확인
lsof -i :3000  # NestJS
lsof -i :8001  # VTON API

# 프로세스 종료
lsof -ti:8001 | xargs kill -9
```

### 문제 5: S3 업로드 실패

```bash
# AWS 자격 증명 확인
cat /path/to/closzIT/closzIT-back/.env | grep AWS

# NestJS 로그에서 S3 오류 확인
tail -100 /path/to/closzIT/closzIT-back/nestjs.log | grep -i s3
```

---

## 📊 7단계: 성능 모니터링

### 실시간 로그 모니터링

```bash
# IDM-VTON API 로그
tail -f ~/app/virtual-try/IDM-VTON/vton-api.log

# NestJS 로그
tail -f /path/to/closzIT/closzIT-back/nestjs.log

# 에러만 필터링
tail -f ~/app/virtual-try/IDM-VTON/vton-api.log | grep -i error
```

### GPU 모니터링

```bash
# 실시간 GPU 상태 (1초마다 갱신)
watch -n 1 nvidia-smi
```

### 처리 시간 추적

IDM-VTON API 로그에서 성능 메트릭 확인:
```bash
# 사람 전처리 시간
grep "Human.*cached in" ~/app/virtual-try/IDM-VTON/vton-api.log

# 옷 전처리 시간
grep "Garment.*cached in" ~/app/virtual-try/IDM-VTON/vton-api.log

# Diffusion 생성 시간
grep "Generated in" ~/app/virtual-try/IDM-VTON/vton-api.log
```

---

## 🚀 빠른 배포 (One-liner)

전체 시스템을 한 번에 배포:

```bash
cd /path/to/closzIT && \
git fetch origin && \
git checkout virtual-fit-one && \
git pull origin virtual-fit-one && \
cd ~/app/virtual-try/IDM-VTON && \
source ~/miniconda3/etc/profile.d/conda.sh && \
conda activate vton && \
pip install fastapi uvicorn[standard] python-multipart -q && \
pkill -f "python.*api_server.py" ; sleep 2 && \
nohup python api_server.py > vton-api.log 2>&1 & \
sleep 5 && \
cd /path/to/closzIT/closzIT-back && \
npm install && \
pkill -f "node.*nest" ; sleep 2 && \
npm run build && \
nohup npm run start:prod > nestjs.log 2>&1 & \
sleep 10 && \
echo "배포 완료! Health Check:" && \
curl -s http://localhost:8001/health | jq && \
curl -s http://localhost:3000/health | jq
```

---

## ✨ 다음 단계 (선택 사항)

### 1. Systemd 서비스 등록

자동 시작 및 관리를 위해 systemd 서비스로 등록:

```bash
# IDM-VTON API 서비스
sudo nano /etc/systemd/system/vton-api.service
```

```ini
[Unit]
Description=IDM-VTON API Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/app/virtual-try/IDM-VTON
Environment="PATH=/home/ubuntu/miniconda3/envs/vton/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=/home/ubuntu/miniconda3/envs/vton/bin/python api_server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable vton-api
sudo systemctl start vton-api
sudo systemctl status vton-api
```

### 2. Nginx 리버스 프록시

외부 접근을 위한 Nginx 설정:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api/vton/ {
        proxy_pass http://localhost:8001/vton/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. 모니터링 대시보드

Prometheus + Grafana를 사용한 모니터링 구축

---

## 📝 체크리스트

배포 전 확인사항:

- [ ] Git 코드 업데이트 완료 (virtual-fit-one 브랜치)
- [ ] IDM-VTON 모델 파일 존재 확인 (`~/app/virtual-try/IDM-VTON/ckpt/`)
- [ ] `api_server.py` 파일 배치 완료
- [ ] IDM-VTON API 서버 실행 (Port 8001)
- [ ] IDM-VTON API Health Check 성공
- [ ] NestJS `.env` 파일 설정 (VTON_API_URL)
- [ ] NestJS 의존성 설치 (`npm install`)
- [ ] NestJS 서버 실행 (Port 3000)
- [ ] NestJS Health Check 성공
- [ ] 전체 통합 테스트 성공
- [ ] 로그 모니터링 설정

---

## 📞 문제 발생 시

1. **로그 확인**:
   - IDM-VTON: `~/app/virtual-try/IDM-VTON/vton-api.log`
   - NestJS: `/path/to/closzIT/closzIT-back/nestjs.log`

2. **프로세스 확인**:
   ```bash
   ps aux | grep -E "api_server|node.*nest"
   ```

3. **포트 확인**:
   ```bash
   sudo netstat -tulpn | grep -E "3000|8001"
   ```

4. **재시작**:
   ```bash
   ./restart-all-servers.sh
   ```

---

## 🎉 완료!

모든 배포가 완료되었습니다. 이제 프론트엔드에서 "하나만 입어보기 (AI)" 버튼을 사용할 수 있습니다.

처리 시간:
- **첫 요청**: 사람 전처리(4s) + 옷 전처리(0.03s) + 텍스트(3s) + Diffusion(7s) = ~14초
- **이후 요청**: Diffusion만 실행 = ~7초
