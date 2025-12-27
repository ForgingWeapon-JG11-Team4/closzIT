# CloszIT

AI 기반 개발 워크플로우가 적용된 프로젝트입니다.

---

## 🚀 Quick Start

### 커밋 & 푸시 (터미널)

```bash
# 변경사항 스테이징 → AI 커밋 → 푸시 (원라이너)
git add . && oco && git push
```

### PR 생성

```bash
gh pr create --title "feat: 기능 설명" --body "상세 설명" --base main
```

---

## 🤖 AI 자동화 기능

### 1. AI 커밋 메시지 (OpenCommit)

변경사항을 분석하여 **Conventional Commit** 형식의 커밋 메시지를 자동 생성합니다.

| 명령어 | 설명 |
|--------|------|
| `oco` | AI 커밋 메시지 생성 + 커밋 실행 |

**사용 예시:**
```bash
git add .
oco
# 🤖 AI가 변경사항 분석 후 커밋 메시지 제안
# feat: 사용자 인증 기능 추가
```

### 2. AI 코드 리뷰 (GitHub Actions)

PR이 생성되면 **자동으로 코드 리뷰**가 실행됩니다.

| 트리거 | 확인 위치 |
|--------|-----------|
| PR 생성/업데이트 시 자동 | GitHub PR 코멘트 |

**리뷰 내용:**
- 🔍 코드 리뷰 요약
- ✅ 잘된 부분
- ⚠️ 개선 제안
- 💡 추가 권장사항

---

## 📋 개발 워크플로우

```
1. 브랜치 생성      git checkout -b feature/기능명
2. 코드 작업        (개발)
3. 스테이징         git add .
4. AI 커밋          oco
5. 푸시             git push origin feature/기능명
6. PR 생성          gh pr create --base main
7. 🤖 AI 리뷰 확인   GitHub PR 페이지
8. 머지             (리뷰 후)
```

---

## ⚙️ 초기 설정

### OpenCommit 설치 (최초 1회)

```bash
npm install -g opencommit
oco config set OCO_AI_PROVIDER=gemini
oco config set OCO_API_KEY=<YOUR_GEMINI_API_KEY>
```

### GitHub Secrets 설정

Repository Settings → Secrets → Actions에 추가:
- `GEMINI_API_KEY`: Gemini API 키

---

## 🌿 브랜치 전략

| 브랜치 | 용도 |
|--------|------|
| `main` | 프로덕션 (직접 커밋 금지) |
| `develop` | 개발 통합 브랜치 |
| `feature/*` | 기능 개발 |
| `hotfix/*` | 긴급 수정 |

---

## 📁 프로젝트 구조

```
.agent/workflows/     # AI 에이전트 워크플로우 정의
.github/workflows/    # GitHub Actions (AI 코드 리뷰)
.husky/               # Git hooks
```
