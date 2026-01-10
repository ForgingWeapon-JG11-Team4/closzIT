import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login/LoginPage';
import AuthCallbackPage from './pages/Login/AuthCallbackPage';
import UserProfileSetup1 from './pages/UserProfileSetup/UserProfileSetup1';
import UserProfileSetup2 from './pages/UserProfileSetup/UserProfileSetup2';
import UserProfileSetup3 from './pages/UserProfileSetup/UserProfileSetup3';
import MainPage from './pages/Main/MainPage';
import MainPage2 from './pages/Main/MainPage2';
import MyPage from './pages/MyPage/MyPage';
import RegisterPage from './pages/Register/RegisterPage';
import LabelingPage from './pages/Labeling/LabelingPage';
import FittingPage from './pages/Fitting/FittingPage';
import DirectFittingPage from './pages/Fitting/DirectFittingPage';

import FeedPage from './pages/FeedPage';
import CreatePostPage from './pages/CreatePostPage';
import PostDetailPage from './pages/PostDetailPage';
import ProfilePage from './pages/ProfilePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import { VtoProvider } from './context/VtoContext';
import './App.css';

function App() {
  return (
    <VtoProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/setup/profile1" element={<UserProfileSetup1 />} />
          <Route path="/setup/profile2" element={<UserProfileSetup2 />} />
          <Route path="/setup2" element={<UserProfileSetup2 />} />
          <Route path="/setup3" element={<UserProfileSetup3 />} />
          <Route path="/setup/profile3" element={<UserProfileSetup3 />} />
          <Route path="/main" element={<MainPage2 />} />
          <Route path="/main_ex" element={<MainPage />} />
          {/* <Route path="/main2" element={<MainPage2 />} /> */}
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/labeling" element={<LabelingPage />} />
          <Route path="/fitting" element={<FittingPage />} />
          <Route path="/fitting/direct" element={<DirectFittingPage />} />

          <Route path="/feed" element={<FeedPage />} />
          <Route path="/create-post" element={<CreatePostPage />} />
          <Route path="/edit-post/:postId" element={<CreatePostPage />} />
          <Route path="/post/:postId" element={<PostDetailPage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </VtoProvider>
  );
}

export default App;
