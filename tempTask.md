# VTO 기능 개선 작업

## 세션: 2026-01-07

### 1. VTO 결과 모달 이미지 중앙 정렬 수정
- **파일**: `closzIT-front/src/components/VtoResultModal.jsx`
- **변경사항**: `marginLeft: 50vw`와 `translateX` 계산을 사용하여 캐러셀 중앙 정렬 로직 수정
- **결과**: 스와이프 시 VTO 이미지가 화면 중앙에 완벽하게 정렬됨

---

### 2. 백엔드 부분 VTO 엔드포인트
- **파일**: `closzIT-back/src/fitting/fitting.service.ts`
  - `CreditTransactionType` 임포트 추가
  - 부분 VTO 처리를 위한 `processPartialFitting` 메서드 추가 (인물 + 선택된 의상 아이템)
- **파일**: `closzIT-back/src/fitting/fitting.controller.ts`
  - `FileFieldsInterceptor`와 함께 `@Post('partial-try-on')` 엔드포인트 추가

---

### 3. 전역 VTO 상태 관리
- **신규 파일**: `closzIT-front/src/context/VtoContext.jsx`
  - 상태: `vtoLoadingPosts`, `vtoCompletedPosts`, `vtoResults`, `unseenCount`, `toastMessage`, `isVtoModalOpen`
  - 액션: `requestVto`, `requestPartialVto`, `openVtoModal`, `closeVtoModal`, `deleteVtoResult`, `refreshVtoData`
- **파일**: `closzIT-front/src/App.js`
  - `<VtoProvider>`로 래핑
- **파일**: `closzIT-front/src/pages/FeedPage.jsx`
  - `useVto()` 훅을 사용하도록 리팩토링
- **파일**: `closzIT-front/src/pages/Fitting/DirectFittingPage.jsx`
  - 비동기 VTO를 위해 리팩토링 (백그라운드에서 처리하면서 즉시 리다이렉트)

---

### 4. 공유 헤더 컴포넌트
- **신규 파일**: `closzIT-front/src/components/SharedHeader.jsx`
  - CloszIT 로고, VTO 버튼 (회전 테두리, 배지), 프로필 버튼, 크레딧 표시
  - VTO 토스트 알림: 작은 녹색 블록, 흰색 텍스트/테두리, 상단 중앙, 2초 후 자동 닫힘

#### SharedHeader를 사용하도록 리팩토링된 페이지:
| 페이지 | 파일 |
|------|------|
| 메인 | `pages/Main/MainPage.jsx` (검색 블록을 헤더 아래로 이동) |
| 피드 | `pages/FeedPage.jsx` |
| 게시물 작성 | `pages/CreatePostPage.jsx` |
| 의상 등록 | `pages/Register/RegisterPage.jsx` |
| 피팅 | `pages/Fitting/FittingPage.jsx` |
| 직접 피팅 | `pages/Fitting/DirectFittingPage.jsx` |

---

### 5. 버그 수정
- **파일**: `closzIT-front/src/pages/Main/MainPage.jsx`
  - 중복된 `<VtoResultModal />` 제거 (이제 SharedHeader에서 처리)
