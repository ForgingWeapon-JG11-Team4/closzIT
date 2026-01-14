import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/Login/LoginPage';
import AuthCallbackPage from './pages/Login/AuthCallbackPage';
import UserProfileSetup1 from './pages/UserProfileSetup/UserProfileSetup1';
import UserProfileSetup2 from './pages/UserProfileSetup/UserProfileSetup2';
import UserProfileSetup3 from './pages/UserProfileSetup/UserProfileSetup3';

import MultiTabContainer from './components/MultiTabContainer';
import MyPage from './pages/MyPage/MyPage';
import RegisterPage from './pages/Register/RegisterPage';
import LabelingPage from './pages/Labeling/LabelingPage';
import FittingPage from './pages/Fitting/FittingPage';
import DirectFittingPage from './pages/Fitting/DirectFittingPage';
import BatchTryOnPage from './pages/BatchTryOn/BatchTryOnPage';
import CreditShopPage from './pages/Credit/CreditShopPage';

import CreatePostPage from './pages/CreatePostPage';
import PostDetailPage from './pages/PostDetailPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import './App.css';

// 멀티탭 경로인지 확인
const MULTI_TAB_PATHS = ['/main', '/fitting-room', '/feed'];

// 멀티탭 컨테이너를 조건부로 표시하는 래퍼
const AppContent = () => {
  const location = useLocation();
  const isMultiTabRoute = MULTI_TAB_PATHS.includes(location.pathname);

  return (
    <>
      {/* 멀티탭 컨테이너 - 항상 마운트되어 있고 display로 표시/숨김 */}
      <div style={{ display: isMultiTabRoute ? 'block' : 'none' }}>
        <MultiTabContainer />
      </div>

      {/* 다른 페이지들 */}
      {!isMultiTabRoute && (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/setup/profile1" element={<UserProfileSetup1 />} />
          <Route path="/setup/profile2" element={<UserProfileSetup2 />} />
          <Route path="/setup2" element={<UserProfileSetup2 />} />
          <Route path="/setup3" element={<UserProfileSetup3 />} />
          <Route path="/setup/profile3" element={<UserProfileSetup3 />} />

          <Route path="/mypage" element={<MyPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/labeling" element={<LabelingPage />} />
          <Route path="/fitting" element={<FittingPage />} />
          <Route path="/fitting/direct" element={<DirectFittingPage />} />
          <Route path="/batch-tryon" element={<BatchTryOnPage />} />

          <Route path="/create-post" element={<CreatePostPage />} />
          <Route path="/edit-post/:postId" element={<CreatePostPage />} />
          <Route path="/post/:postId" element={<PostDetailPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/credit-shop" element={<CreditShopPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
