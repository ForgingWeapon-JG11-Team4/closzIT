// src/pages/Login/AuthCallbackPage.jsx
// OAuth 콜백 처리: URL에서 토큰 추출 후 localStorage에 저장하고 리다이렉트

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const redirect = searchParams.get('redirect') || '/main';

    if (token) {
      // JWT 토큰을 localStorage에 저장
      localStorage.setItem('accessToken', token);
      console.log('Token saved to localStorage');
    }

    // 지정된 경로로 리다이렉트 (신규 사용자: /setup/profile1, 기존 사용자: /main)
    navigate(redirect, { replace: true });
  }, [searchParams, navigate]);

  return (
    <div className="bg-white dark:bg-gray-900 h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
        <p className="text-gray-500">로그인 처리 중...</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
