import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MyPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          navigate('/login');
          return;
        }

        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
        const response = await fetch(`${backendUrl}/user/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else if (response.status === 401) {
          localStorage.removeItem('accessToken');
          navigate('/login');
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
        await fetch(`${backendUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // 백엔드 호출 성공/실패와 관계없이 로컬 토큰 삭제
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userProfile');
      navigate('/login');
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/user/me`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userProfile');
        navigate('/login');
      }
    } catch (error) {
      console.error('Delete account error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="material-symbols-rounded text-2xl text-gray-700 dark:text-gray-200">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">마이페이지</h1>
      </div>

      {/* Profile Section */}
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
          {/* Profile Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.name || '사용자'}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email || ''}</p>
            </div>
          </div>

          {/* Profile Info */}
          <div className="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 dark:text-gray-400">성별</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {user?.gender === 'male' ? '남성' : user?.gender === 'female' ? '여성' : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 dark:text-gray-400">생년월일</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {user?.birthday ? new Date(user.birthday).toLocaleDateString('ko-KR') : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 dark:text-gray-400">지역</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {user?.province && user?.city ? `${user.province} ${user.city}` : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 dark:text-gray-400">퍼스널 컬러</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {user?.personalColor === 'spring' ? '봄 웜톤' :
                 user?.personalColor === 'summer' ? '여름 쿨톤' :
                 user?.personalColor === 'autumn' ? '가을 웜톤' :
                 user?.personalColor === 'winter' ? '겨울 쿨톤' : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 dark:text-gray-400">체형</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {user?.bodyType === 'triangle' ? '삼각형' :
                 user?.bodyType === 'invertedTriangle' ? '역삼각형' :
                 user?.bodyType === 'oval' ? '둥근형' :
                 user?.bodyType === 'rectangle' ? '직사각형' :
                 user?.bodyType === 'trapezoid' ? '사다리꼴형' :
                 user?.bodyType === 'unknown' ? '잘 모르겠어요' : '-'}
              </span>
            </div>
            {user?.preferredStyles && user.preferredStyles.length > 0 && (
              <div className="py-2">
                <span className="text-gray-500 dark:text-gray-400 block mb-2">선호 스타일</span>
                <div className="flex flex-wrap gap-2">
                  {user.preferredStyles.map((style, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                    >
                      {style}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => navigate('/setup/profile1?edit=true')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-rounded text-gray-500">edit</span>
              <span className="text-gray-900 dark:text-white">프로필 수정</span>
            </div>
            <span className="material-symbols-rounded text-gray-400">chevron_right</span>
          </button>
          
          {/* Closet Source Toggle */}
          <div className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <span className="material-symbols-rounded text-gray-500">checkroom</span>
              <div>
                <span className="text-gray-900 dark:text-white">옷장 소스</span>
                <p className="text-xs text-gray-400 mt-0.5">
                  {user?.useAdminCloset !== false ? '샘플 옷장 사용 중' : '내 옷장 사용 중'}
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                const token = localStorage.getItem('accessToken');
                if (!token) return;
                const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
                const newValue = user?.useAdminCloset === false;
                try {
                  const response = await fetch(`${backendUrl}/user/profile`, {
                    method: 'PUT',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ useAdminCloset: newValue })
                  });
                  if (response.ok) {
                    setUser(prev => ({ ...prev, useAdminCloset: newValue }));
                  }
                } catch (error) {
                  console.error('Toggle closet error:', error);
                }
              }}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                user?.useAdminCloset !== false ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                user?.useAdminCloset !== false ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          <button
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-rounded text-gray-500">notifications</span>
              <span className="text-gray-900 dark:text-white">알림 설정</span>
            </div>
            <span className="material-symbols-rounded text-gray-400">chevron_right</span>
          </button>
          <button
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-rounded text-gray-500">help</span>
              <span className="text-gray-900 dark:text-white">고객센터</span>
            </div>
            <span className="material-symbols-rounded text-gray-400">chevron_right</span>
          </button>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full mt-6 py-4 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 font-bold rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-rounded">logout</span>
          로그아웃
        </button>

        {/* Delete Account Button */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full mt-3 py-3 text-gray-400 text-sm hover:text-red-500 transition-colors"
        >
          회원 탈퇴
        </button>

        {/* App Version */}
        <p className="text-center text-gray-400 text-xs mt-6">
          closzIT v1.0.0
        </p>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <span className="material-symbols-rounded text-3xl text-red-500">warning</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">회원 탈퇴</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                정말 탈퇴하시겠습니까?<br/>
                모든 데이터가 삭제되며 복구할 수 없습니다.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
              >
                탈퇴하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPage;
