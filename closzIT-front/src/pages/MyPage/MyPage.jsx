import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileEditModal from '../../components/ProfileEditModal';
import FullBodyImageModal from '../../components/FullBodyImageModal';

const MyPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageCacheBuster, setImageCacheBuster] = useState(Date.now());
  const [imageBlobUrl, setImageBlobUrl] = useState(null);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (imageBlobUrl) {
        URL.revokeObjectURL(imageBlobUrl);
      }
    };
  }, [imageBlobUrl]);

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
          console.log('[MyPage] Initial user data loaded:', userData);
          console.log('[MyPage] Initial fullBodyImage URL:', userData.fullBodyImage);
          setUser(userData);

          // Presigned URL에서 이미지 fetch하여 blob URL 생성
          if (userData.fullBodyImage) {
            try {
              const imgResponse = await fetch(userData.fullBodyImage);
              if (imgResponse.ok) {
                const blob = await imgResponse.blob();
                const blobUrl = URL.createObjectURL(blob);
                setImageBlobUrl(blobUrl);
                console.log('[MyPage] Initial image blob URL created:', blobUrl);
              } else {
                console.error('[MyPage] Failed to fetch initial image:', imgResponse.status, imgResponse.statusText);
              }
            } catch (imgError) {
              console.error('[MyPage] Error fetching initial image:', imgError);
            }
          }
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

  const refreshUserData = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/user/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const userData = await response.json();
        console.log('[MyPage] User data loaded:', userData);
        console.log('[MyPage] fullBodyImage URL:', userData.fullBodyImage);
        setUser(userData);
        setImageCacheBuster(Date.now()); // 이미지 캐시 갱신

        // Presigned URL에서 이미지 fetch하여 blob URL 생성
        if (userData.fullBodyImage) {
          try {
            const imgResponse = await fetch(userData.fullBodyImage);
            if (imgResponse.ok) {
              const blob = await imgResponse.blob();
              const blobUrl = URL.createObjectURL(blob);
              setImageBlobUrl(blobUrl);
              console.log('[MyPage] Image blob URL created:', blobUrl);
            } else {
              console.error('[MyPage] Failed to fetch image:', imgResponse.status, imgResponse.statusText);
            }
          } catch (imgError) {
            console.error('[MyPage] Error fetching image:', imgError);
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

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

  if (isLoading) {
    return (
      <div className="bg-cream dark:bg-[#1A1918] min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="bg-cream dark:bg-[#1A1918] min-h-screen font-sans">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-3 glass-warm border-b border-gold-light/20 sticky top-0 z-40">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gold-light/20 transition-colors"
        >
          <span className="material-symbols-rounded text-2xl text-charcoal dark:text-cream">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold text-charcoal dark:text-cream">마이페이지</h1>
      </div>

      {/* Profile Section */}
      <div className="p-6">
        <div className="bg-warm-white dark:bg-charcoal rounded-2xl p-6 shadow-soft border border-gold-light/20">
          {/* Profile Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-warm-white text-3xl font-bold shadow-lg">
              {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-charcoal dark:text-cream">{user?.name || '사용자'}</h2>
              <p className="text-sm text-charcoal-light dark:text-cream-dark">{user?.email || ''}</p>
            </div>
          </div>

          {/* Profile Info */}
          <div className="space-y-4 border-t border-gold-light/30 pt-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-charcoal-light dark:text-cream-dark flex items-center gap-2">
                <span className="material-symbols-rounded text-lg text-gold">monetization_on</span>
                보유 크레딧
              </span>
              <span className="text-charcoal dark:text-cream font-bold text-lg text-gold">
                {user?.credit || 0}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-charcoal-light dark:text-cream-dark">성별</span>
              <span className="text-charcoal dark:text-cream font-medium">
                {user?.gender === 'male' ? '남성' : user?.gender === 'female' ? '여성' : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-charcoal-light dark:text-cream-dark">생년월일</span>
              <span className="text-charcoal dark:text-cream font-medium">
                {user?.birthday ? new Date(user.birthday).toLocaleDateString('ko-KR') : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-charcoal-light dark:text-cream-dark">지역</span>
              <span className="text-charcoal dark:text-cream font-medium">
                {user?.province && user?.city ? `${user.province} ${user.city}` : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-charcoal-light dark:text-cream-dark">퍼스널 컬러</span>
              <span className="text-charcoal dark:text-cream font-medium">
                {user?.personalColor === 'spring' ? '봄 웜톤' :
                  user?.personalColor === 'summer' ? '여름 쿨톤' :
                    user?.personalColor === 'autumn' ? '가을 웜톤' :
                      user?.personalColor === 'winter' ? '겨울 쿨톤' : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-charcoal-light dark:text-cream-dark">체형</span>
              <span className="text-charcoal dark:text-cream font-medium">
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
                <span className="text-charcoal-light dark:text-cream-dark block mb-2">선호 스타일</span>
                <div className="flex flex-wrap gap-2">
                  {user.preferredStyles.map((style, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gold/10 text-gold rounded-full text-sm font-medium border border-gold/20"
                    >
                      {style}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* 전신 사진 섹션 */}
            <div className="py-4 border-t border-gold-light/30 mt-2">
              <span className="text-charcoal-light dark:text-cream-dark block mb-3">전신 사진</span>
              {user?.fullBodyImage ? (
                <div className="flex items-center gap-4">
                  <div className="w-24 h-32 rounded-xl overflow-hidden border-2 border-gold-light/30 bg-charcoal/5 dark:bg-charcoal/30">
                    {imageBlobUrl ? (
                      <img
                        src={imageBlobUrl}
                        alt="전신 사진"
                        className="w-full h-full object-contain"
                        onLoad={() => console.log('[MyPage] Blob image loaded successfully')}
                        onError={(e) => {
                          console.error('[MyPage] Blob image load error');
                          console.error('[MyPage] Error details:', e);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowImageModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gold/10 text-gold rounded-xl text-sm font-medium border border-gold/20 hover:bg-gold/20 transition-colors"
                  >
                    <span className="material-symbols-rounded text-base">edit</span>
                    사진 변경
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowImageModal(true)}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-gold/10 text-gold rounded-xl text-sm font-medium border border-dashed border-gold/30 hover:bg-gold/20 transition-colors"
                >
                  <span className="material-symbols-rounded text-lg">add_a_photo</span>
                  전신 사진 등록하기
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="mt-6 bg-warm-white dark:bg-charcoal rounded-2xl overflow-hidden shadow-soft border border-gold-light/20">
          <button
            onClick={() => setShowEditModal(true)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gold-light/20 transition-colors border-b border-gold-light/20"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-rounded text-charcoal-light dark:text-cream-dark">edit</span>
              <span className="text-charcoal dark:text-cream">프로필 수정</span>
            </div>
            <span className="material-symbols-rounded text-charcoal-light dark:text-cream-dark">chevron_right</span>
          </button>
          <button
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gold-light/20 transition-colors border-b border-gold-light/20"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-rounded text-charcoal-light dark:text-cream-dark">notifications</span>
              <span className="text-charcoal dark:text-cream">알림 설정</span>
            </div>
            <span className="material-symbols-rounded text-charcoal-light dark:text-cream-dark">chevron_right</span>
          </button>
          <button
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gold-light/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-rounded text-charcoal-light dark:text-cream-dark">help</span>
              <span className="text-charcoal dark:text-cream">고객센터</span>
            </div>
            <span className="material-symbols-rounded text-charcoal-light dark:text-cream-dark">chevron_right</span>
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

        {/* App Version */}
        <p className="text-center text-charcoal-light/60 dark:text-cream-dark/60 text-xs mt-8">
          closzIT v1.0.0
        </p>
      </div>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={refreshUserData}
        initialData={user}
      />

      {/* Full Body Image Modal */}
      <FullBodyImageModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onSave={refreshUserData}
        initialImage={user?.fullBodyImage}
      />
    </div>
  );
};

export default MyPage;
