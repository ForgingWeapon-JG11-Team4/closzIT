// src/pages/Login/AuthCallbackPage.jsx

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const redirect = searchParams.get('redirect') || '/main';
    const needConsent = searchParams.get('needConsent');

    if (token) {
      localStorage.setItem('accessToken', token);
      console.log('Token saved to localStorage');
    }

    // refresh token 없으면 consent 화면으로 리다이렉트
    if (needConsent === 'true') {
      window.location.href = 'https://api.closzit.shop/auth/google?prompt=consent';
      return;
    }

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