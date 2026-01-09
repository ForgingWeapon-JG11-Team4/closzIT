# AWS GPU 서버 배포 가이드 (virtual-fit-one 브랜치)

## 📋 배포 개요

이 가이드는 virtual-fit-one 브랜치를 AWS GPU 서버에 배포하는 전체 과정을 다룹니다.

**서버 구성:**
- NestJS Backend (Port 3000)
- 기존 FastAPI (Port 8000, venv) - 팀원 서버
- 새 VTON API (Port 8001, conda) - IDM-VTON 서버

---

## 🚀 1단계: AWS 서버 접속 및 코드 업데이트

### 1.1 서버 접속
```bash
ssh user@your-gpu-server-ip
```

### 1.2 프로젝트 디렉토리로 이동
```bash
cd /home/your-workspace/closzIT
# 또는 프로젝트가 없다면:
# git clone https://github.com/your-repo/closzIT.git
# cd closzIT
```

### 1.3 현재 브랜치 및 상태 확인
```bash
git status
git branch
```

### 1.4 변경사항 스태시 (필요시)
```bash
# 로컬 변경사항이 있다면 백업
git stash
```

### 1.5 virtual-fit-one 브랜치로 체크아웃
```bash
# 원격 브랜치 정보 가져오기
git fetch origin

# virtual-fit-one 브랜치로 전환
git checkout virtual-fit-one

# 최신 코드 pull
git pull origin virtual-fit-one
```

### 1.6 코드 업데이트 확인
```bash
# 최근 커밋 확인
git log -3

# 변경된 파일 확인
git diff HEAD~1
```

---

## 🔧 2단계: NestJS 백엔드 배포

### 2.1 백엔드 디렉토리로 이동
```bash
cd closzIT-back
```

### 2.2 환경 변수 설정
```bash
# .env 파일이 없다면 생성
cat > .env << 'EOF'
# ====================================
# FastAPI Servers
# ====================================
# 기존 FastAPI 서버 (팀원, venv, port 8000)
FASTAPI_URL=http://localhost:8000

# IDM-VTON 서버 (당신, conda, port 8001)
VTON_API_URL=http://localhost:8001

# GPU 서버에서 실행 시 (외부 접근):
# FASTAPI_URL=http://your-gpu-server-ip:8000
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
EOF

# 환경 변수 확인
cat .env
```

### 2.3 의존성 설치
```bash
npm install
```

### 2.4 기존 NestJS 프로세스 종료 (실행 중이라면)
```bash
# NestJS 프로세스 찾기
ps aux | grep "node.*nest"

# 프로세스 종료 (PID 확인 후)
kill -9 <PID>

# 또는 모든 node 프로세스 종료 (주의!)
# pkill -f "node.*nest"
```

### 2.5 데이터베이스 마이그레이션 (필요시)
```bash
npx prisma generate
npx prisma migrate deploy
```

### 2.6 NestJS 서버 시작 (백그라운드)
```bash
# 프로덕션 빌드
npm run build

# 백그라운드로 실행
nohup npm run start:prod > nestjs-server.log 2>&1 &

# 프로세스 확인
ps aux | grep "node.*nest"

# 로그 확인
tail -f nestjs-server.log
```

### 2.7 NestJS 서버 상태 확인
```bash
# 로컬에서 확인
curl http://localhost:3000/health

# 외부에서 확인 (다른 터미널에서)
curl http://your-gpu-server-ip:3000/health
```

---

## 🤖 3단계: IDM-VTON 서버 배포 (Port 8001)

### 3.1 VTON 서버 디렉토리로 이동
```bash
cd /home/your-workspace/closzIT/ai-vton-server
```

### 3.2 Conda 환경 생성 (처음이라면)
```bash
# Conda 환경 생성 (Python 3.10)
conda create -n idm-vton python=3.10 -y

# 환경 활성화
conda activate idm-vton

# PyTorch 설치 (CUDA 11.8)
conda install pytorch torchvision torchaudio pytorch-cuda=11.8 -c pytorch -c nvidia -y

# 기본 의존성 설치
pip install -r requirements.txt
```

### 3.3 Conda 환경 이미 있다면 업데이트
```bash
# 환경 활성화
conda activate idm-vton

# 의존성 업데이트
pip install -r requirements.txt --upgrade
```

### 3.4 환경 변수 설정
```bash
# .env 파일 생성 (VTON 서버용)
cat > .env << 'EOF'
VTON_PORT=8001
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-northeast-2
EOF

# 환경 변수 확인
cat .env
```

### 3.5 기존 VTON 프로세스 종료 (실행 중이라면)
```bash
# VTON 서버 프로세스 찾기
ps aux | grep "python.*main.py"

# 프로세스 종료
kill -9 <PID>

# 또는 8001 포트 사용 프로세스 종료
lsof -ti:8001 | xargs kill -9
```

### 3.6 포트 열기
```bash
# 방화벽에서 8001 포트 열기
sudo ufw allow 8001/tcp

# 포트 상태 확인
sudo ufw status
```

### 3.7 VTON 서버 시작 (백그라운드)
```bash
# Conda 환경 활성화
conda activate idm-vton

# 백그라운드로 실행
nohup python main.py > vton-server.log 2>&1 &

# 프로세스 확인
ps aux | grep "python.*main.py"

# 로그 확인
tail -f vton-server.log
```

### 3.8 VTON 서버 상태 확인
```bash
# 로컬에서 확인
curl http://localhost:8001/health

# 외부에서 확인
curl http://your-gpu-server-ip:8001/health

# 상세 정보 확인
curl http://localhost:8001/
```

---

## ✅ 4단계: 전체 시스템 확인

### 4.1 모든 서버 상태 확인
```bash
# NestJS (Port 3000)
curl http://localhost:3000/health

# 기존 FastAPI (Port 8000) - 팀원 서버
curl http://localhost:8000/health

# VTON API (Port 8001) - 새 서버
curl http://localhost:8001/health
```

### 4.2 프로세스 확인
```bash
# 모든 관련 프로세스 확인
ps aux | grep -E "node.*nest|python.*main.py|uvicorn"

# 포트 사용 확인
sudo netstat -tulpn | grep -E "3000|8000|8001"
```

### 4.3 로그 모니터링
```bash
# NestJS 로그
tail -f /home/your-workspace/closzIT/closzIT-back/nestjs-server.log

# VTON API 로그
tail -f /home/your-workspace/closzIT/ai-vton-server/vton-server.log

# 실시간 에러 모니터링
tail -f /home/your-workspace/closzIT/ai-vton-server/vton-server.log | grep -i error
```

---

## 🔄 5단계: 서버 재시작 스크립트

### 5.1 전체 재시작 스크립트 생성
```bash
# 프로젝트 루트에서 실행
cd /home/your-workspace/closzIT

# 재시작 스크립트 생성
cat > restart-servers.sh << 'EOF'
#!/bin/bash

echo "=========================================="
echo "서버 재시작 시작..."
echo "=========================================="

# 1. NestJS 종료
echo "[1/4] NestJS 서버 종료 중..."
pkill -f "node.*nest"
sleep 2

# 2. VTON API 종료
echo "[2/4] VTON API 서버 종료 중..."
pkill -f "python.*main.py"
sleep 2

# 3. NestJS 재시작
echo "[3/4] NestJS 서버 시작 중..."
cd /home/your-workspace/closzIT/closzIT-back
nohup npm run start:prod > nestjs-server.log 2>&1 &
sleep 5

# 4. VTON API 재시작
echo "[4/4] VTON API 서버 시작 중..."
cd /home/your-workspace/closzIT/ai-vton-server
source $(conda info --base)/etc/profile.d/conda.sh
conda activate idm-vton
nohup python main.py > vton-server.log 2>&1 &
sleep 5

echo "=========================================="
echo "서버 재시작 완료!"
echo "=========================================="

# 상태 확인
echo ""
echo "프로세스 확인:"
ps aux | grep -E "node.*nest|python.*main.py"

echo ""
echo "포트 확인:"
sudo netstat -tulpn | grep -E "3000|8001"

echo ""
echo "Health Check:"
curl http://localhost:3000/health
echo ""
curl http://localhost:8001/health
EOF

# 실행 권한 부여
chmod +x restart-servers.sh

# 실행
./restart-servers.sh
```

---

## 🐛 트러블슈팅

### 포트가 이미 사용 중인 경우
```bash
# 특정 포트 사용 프로세스 확인 및 종료
lsof -ti:3000 | xargs kill -9  # NestJS
lsof -ti:8001 | xargs kill -9  # VTON API
```

### Conda 환경 활성화 안 됨
```bash
# Conda 초기화
conda init bash
source ~/.bashrc

# 환경 활성화
conda activate idm-vton
```

### CUDA 메모리 부족
```bash
# GPU 메모리 확인
nvidia-smi

# GPU 사용 중인 프로세스 확인
nvidia-smi --query-compute-apps=pid,used_memory --format=csv

# 특정 프로세스 종료
kill -9 <PID>
```

### 권한 오류
```bash
# 프로젝트 디렉토리 권한 확인
ls -la /home/your-workspace/closzIT

# 권한 변경 (필요시)
sudo chown -R $USER:$USER /home/your-workspace/closzIT
```

### npm 의존성 오류
```bash
cd /home/your-workspace/closzIT/closzIT-back

# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 시스템 아키텍처

```
┌─────────────────────────────────────────────────────┐
│              NestJS Backend (port 3000)             │
│                                                     │
│  - 사용자 관리, 옷 관리, 피팅 요청 처리             │
│  - S3 캐싱 관리                                     │
│  - VTON 파이프라인 오케스트레이션                   │
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

---

## 📝 배포 체크리스트

- [ ] Git 코드 업데이트 (virtual-fit-one 브랜치)
- [ ] NestJS .env 파일 설정
- [ ] NestJS 의존성 설치
- [ ] NestJS 서버 시작 (port 3000)
- [ ] Conda 환경 생성/활성화
- [ ] VTON 서버 의존성 설치
- [ ] VTON 서버 .env 파일 설정
- [ ] 포트 8001 방화벽 개방
- [ ] VTON 서버 시작 (port 8001)
- [ ] 전체 Health Check 확인
- [ ] 로그 모니터링

---

## 🚀 빠른 배포 (One-liner)

전체 과정을 한 번에 실행하려면:

```bash
cd /home/your-workspace/closzIT && \
git fetch origin && \
git checkout virtual-fit-one && \
git pull origin virtual-fit-one && \
cd closzIT-back && \
npm install && \
pkill -f "node.*nest" ; sleep 2 && \
nohup npm run start:prod > nestjs-server.log 2>&1 & \
sleep 5 && \
cd ../ai-vton-server && \
source $(conda info --base)/etc/profile.d/conda.sh && \
conda activate idm-vton && \
pkill -f "python.*main.py" ; sleep 2 && \
nohup python main.py > vton-server.log 2>&1 & \
sleep 5 && \
echo "배포 완료! Health Check:" && \
curl http://localhost:3000/health && \
curl http://localhost:8001/health
```

---

## 📞 문제 발생 시

1. **로그 확인**: `tail -f nestjs-server.log`, `tail -f vton-server.log`
2. **프로세스 확인**: `ps aux | grep -E "node.*nest|python.*main.py"`
3. **포트 확인**: `sudo netstat -tulpn | grep -E "3000|8001"`
4. **재시작**: `./restart-servers.sh`

---

## ✨ 다음 단계

서버 배포 후 실제 IDM-VTON 모델 통합:
1. OpenPose 모델 체크포인트 다운로드
2. DensePose 모델 체크포인트 다운로드
3. Parsing 모델 체크포인트 다운로드
4. IDM-VTON Diffusion 파이프라인 통합
5. Mock 구현을 실제 모델 실행으로 교체

자세한 내용은 [ai-vton-server/DEPLOY.md](ai-vton-server/DEPLOY.md) 참고.
