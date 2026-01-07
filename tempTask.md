# VTO Feature Enhancement Tasks

## Session: 2026-01-07

### 1. VTO Result Modal Image Centering Fix
- **File**: `closzIT-front/src/components/VtoResultModal.jsx`
- **Change**: Fixed carousel centering logic using `marginLeft: 50vw` and `translateX` calculation
- **Result**: VTO images now perfectly center on screen during swipe

---

### 2. Backend Partial VTO Endpoint
- **File**: `closzIT-back/src/fitting/fitting.service.ts`
  - Added `CreditTransactionType` import
  - Added `processPartialFitting` method for handling partial VTO (person + selected clothing items)
- **File**: `closzIT-back/src/fitting/fitting.controller.ts`
  - Added `@Post('partial-try-on')` endpoint with `FileFieldsInterceptor`

---

### 3. Global VTO State Management
- **NEW File**: `closzIT-front/src/context/VtoContext.jsx`
  - State: `vtoLoadingPosts`, `vtoCompletedPosts`, `vtoResults`, `unseenCount`, `toastMessage`, `isVtoModalOpen`
  - Actions: `requestVto`, `requestPartialVto`, `openVtoModal`, `closeVtoModal`, `deleteVtoResult`, `refreshVtoData`
- **File**: `closzIT-front/src/App.js`
  - Wrapped with `<VtoProvider>`
- **File**: `closzIT-front/src/pages/FeedPage.jsx`
  - Refactored to use `useVto()` hook
- **File**: `closzIT-front/src/pages/Fitting/DirectFittingPage.jsx`
  - Refactored for async VTO (immediate redirect while processing in background)

---

### 4. Shared Header Component
- **NEW File**: `closzIT-front/src/components/SharedHeader.jsx`
  - CloszIT logo, VTO button (spinning border, badge), Profile button, Credit display
  - VTO toast notification: small green block, white text/border, top-center, auto-dismiss 2s

#### Pages Refactored to Use SharedHeader:
| Page | File |
|------|------|
| Main | `pages/Main/MainPage.jsx` (search block moved below header) |
| Feed | `pages/FeedPage.jsx` |
| Create Post | `pages/CreatePostPage.jsx` |
| Register | `pages/Register/RegisterPage.jsx` |
| Fitting | `pages/Fitting/FittingPage.jsx` |
| Direct Fitting | `pages/Fitting/DirectFittingPage.jsx` |

---

### 5. Bug Fixes
- **File**: `closzIT-front/src/pages/Main/MainPage.jsx`
  - Removed duplicate `<VtoResultModal />` (now handled by SharedHeader)
