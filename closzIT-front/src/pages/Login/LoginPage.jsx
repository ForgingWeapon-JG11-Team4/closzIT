import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleLoginButton from '../../components/GoogleLoginButton';

const LoginPage = () => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  // 토큰이 이미 있고 유효하면 바로 main으로 리다이렉트
  useEffect(() => {
    const checkExistingToken = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsChecking(false);
        return;
      }

      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://api.closzit.shop';
        const response = await fetch(`${backendUrl}/user/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const userData = await response.json();
          // 토큰 유효 - 프로필 완성 여부에 따라 리다이렉트
          navigate(userData.isProfileComplete ? '/main' : '/setup/profile1');
        } else {
          // 토큰 무효 - 삭제
          localStorage.removeItem('accessToken');
          setIsChecking(false);
        }
      } catch (error) {
        console.error('Token check failed:', error);
        setIsChecking(false);
      }
    };

    checkExistingToken();
  }, [navigate]);

  // 백엔드 Google OAuth 엔드포인트로 리다이렉트
  const handleGoogleLogin = () => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://api.closzit.shop';
    window.location.href = `${backendUrl}/auth/google`;
  };

  // CSS Keyframes for mascot animation
  const mascotKeyframes = `
    @keyframes float-mascot {
      0%, 100% { transform: translateY(0px) rotate(-2deg); }
      25% { transform: translateY(-6px) rotate(0deg); }
      50% { transform: translateY(0px) rotate(2deg); }
      75% { transform: translateY(-3px) rotate(0deg); }
    }
    @keyframes logo-glow {
      0%, 100% { text-shadow: 0 0 20px rgba(201, 168, 108, 0.3); }
      50% { text-shadow: 0 0 30px rgba(201, 168, 108, 0.5); }
    }
  `;

  // 토큰 확인 중일 때 로딩 표시
  if (isChecking) {
    return (
      <div className="bg-cream dark:bg-[#1A1918] h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="bg-cream dark:bg-[#1A1918] font-sans antialiased h-screen flex flex-col justify-between overflow-hidden relative">
      <style>{mascotKeyframes}</style>
      
      {/* 배경 블러 효과 - gold/cream 테마 */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] bg-gold/15 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] bg-gold-light/20 rounded-full blur-[100px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[30%] bg-gold/10 rounded-full blur-[120px]"></div>
      </div>

      {/* 중앙 로고 + 캐릭터 섹션 */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 w-full max-w-md mx-auto relative z-10">
        <div className="flex flex-col items-center">
          {/* CloszIT 로고 */}
          <h1 
            className="text-6xl md:text-7xl font-black tracking-tighter"
            style={{ animation: 'logo-glow 3s ease-in-out infinite' }}
          >
            <span className="text-gold">Closz</span>
            <span className="text-charcoal dark:text-cream">IT</span>
          </h1>
          <p className="mt-3 text-charcoal-light dark:text-cream-dark text-center font-medium">
            내 손안의 스마트 옷장
          </p>
          
          {/* 캐릭터 마스코트 이미지 */}
          <div 
            className="mt-16 w-40 h-40 flex items-center justify-center"
            style={{
              animation: 'float-mascot 3s ease-in-out infinite',
              transformOrigin: 'center bottom',
            }}
          >
            <img 
              src="/assets/closzit-mascot.png" 
              alt="CloszIT Mascot"
              className="w-full h-full object-contain drop-shadow-lg"
              style={{
                filter: 'drop-shadow(0 6px 12px rgba(201, 168, 108, 0.25))',
              }}
            />
          </div>
        </div>
      </div>

      {/* 하단 버튼/푸터 섹션 */}
      <div className="w-full max-w-md mx-auto p-8 pb-12 z-10">
        <div className="space-y-4">
          <GoogleLoginButton onClick={handleGoogleLogin} />
          <button className="w-full text-center text-sm text-charcoal-light dark:text-cream-dark hover:text-gold transition-colors mt-4">
            다른 방법으로 로그인
          </button>
        </div>
        
        <p className="mt-8 text-xs text-center text-charcoal-light/60 dark:text-cream-dark/60 leading-relaxed">
          계속 진행하면 CloszIT의 <a className="underline text-gold hover:text-gold-dark transition-colors" href="#">서비스 이용약관</a> 및 <br/>
          <a className="underline text-gold hover:text-gold-dark transition-colors" href="#">개인정보 처리방침</a>에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;