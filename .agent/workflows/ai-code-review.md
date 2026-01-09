---
description: PR이 올라오면 AI가 자동으로 코드 리뷰를 수행합니다.
---

## AI 코드 리뷰 설정

이 워크플로우는 **GitHub Actions**를 통해 자동으로 실행됩니다.

### 작동 방식
1. PR이 열리거나 업데이트되면 자동 트리거
2. 변경된 코드 파일들을 수집
3. Gemini API로 코드 리뷰 요청
4. PR에 리뷰 코멘트 자동 등록

### 필요한 설정
- GitHub Secrets에 `GEMINI_API_KEY` 등록 ✅ (이미 완료)

### 리뷰 내용
- 🔍 코드 리뷰 요약
- ✅ 잘된 부분
- ⚠️ 개선 제안
- 💡 추가 권장사항

### 주의사항
- 워크플로우 파일: `.github/workflows/ai-code-review.yml`
- PR을 열거나 커밋을 푸시할 때마다 실행됨

이제 되야되는디