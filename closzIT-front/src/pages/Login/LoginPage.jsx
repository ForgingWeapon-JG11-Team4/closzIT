import React from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleLoginButton from '../../components/GoogleLoginButton';

const LoginPage = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-gray-900 font-sans antialiased h-screen flex flex-col justify-between overflow-hidden relative">
      {/* 배경 블러 효과 */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] bg-green-400/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] bg-indigo-500/20 rounded-full blur-[100px]"></div>
      </div>

      {/* 중앙 로고 섹션 */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 w-full max-w-md mx-auto relative z-10">
        <div className="mb-24 flex flex-col items-center">
          <h1 className="text-6xl md:text-7xl font-black tracking-tighter logo-float">
            <span className="text-[#22c55e]">Closz</span>
            <span className="text-[#6366f1]">IT</span>
          </h1>
          <p className="mt-4 text-gray-500 text-center font-medium">내 손안의 스마트 옷장</p>
        </div>
      </div>

      {/* 하단 버튼/푸터 섹션 */}
      <div className="w-full max-w-md mx-auto p-8 pb-12 z-10">
        <div className="space-y-4">
          <GoogleLoginButton onClick={() => navigate('/setup/profile1')} />
          <button className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors mt-4">
            다른 방법으로 로그인
          </button>
        </div>
        
        <p className="mt-8 text-xs text-center text-gray-400 leading-relaxed">
          계속 진행하면 CloszIT의 <a className="underline" href="#">서비스 이용약관</a> 및 <br/>
          <a className="underline" href="#">개인정보 처리방침</a>에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;