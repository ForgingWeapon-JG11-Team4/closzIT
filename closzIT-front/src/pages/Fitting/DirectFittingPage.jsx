import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVtoStore } from '../../stores/vtoStore';
import SharedHeader from '../../components/SharedHeader';

const DirectFittingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { requestPartialVtoByIds } = useVtoStore();
  const { outfit, fromMain } = location.state || {};


  // 피팅 관련 상태
  const [fittingError, setFittingError] = useState(null);
  const [userFullBodyImage, setUserFullBodyImage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 선택된 옷 개수
  const selectedCount = [outfit?.outerwear, outfit?.tops, outfit?.bottoms, outfit?.shoes].filter(Boolean).length;

  // 사용자 전신 사진 가져오기
  useEffect(() => {
    if (!outfit || !fromMain || selectedCount === 0) {
      navigate('/main');
      return;
    }

    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          navigate('/login');
          return;
        }

        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
        const response = await fetch(`${backendUrl}/user/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const userData = await response.json();
          if (!userData.fullBodyImage) {
            setFittingError('전신 사진이 등록되지 않았습니다.');
          } else {
            setUserFullBodyImage(userData.fullBodyImage);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        setFittingError('사용자 정보를 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [outfit, fromMain, navigate, selectedCount]);

  // base64를 Blob으로 변환
  const base64ToBlob = (base64, mimeType = 'image/jpeg') => {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType });
  };

  // URL에서 이미지를 Blob으로 가져오기
  const urlToBlob = async (url) => {
    const response = await fetch(url);
    return await response.blob();
  };

  // 피팅 요청 - VtoContext의 크레딧 모달 사용
  const handleStartFitting = async () => {
    if (!userFullBodyImage) {
      setFittingError('전신 사진이 없습니다.');
      return;
    }

    try {
      // 의류 ID만 추출하여 백엔드에 전송 (CORS 문제 우회)
      const clothingIds = {
        outerId: outfit.outerwear?.id || undefined,
        topId: outfit.tops?.id || undefined,
        bottomId: outfit.bottoms?.id || undefined,
        shoesId: outfit.shoes?.id || undefined,
      };

      // VtoContext의 requestPartialVtoByIds 호출 (크레딧 모달 포함)
      requestPartialVtoByIds(clothingIds, null, 'direct');

      // 즉시 메인 화면으로 이동
      navigate('/main');

    } catch (err) {
      console.error('Fitting setup error:', err);
      setFittingError('피팅 요청 준비 중 오류가 발생했습니다: ' + err.message);
    }
  };

  // 선택된 의류 표시용 배열
  const outfitItems = [
    outfit?.outerwear && { name: '외투', image: outfit.outerwear.image || outfit.outerwear.imageUrl },
    outfit?.tops && { name: '상의', image: outfit.tops.image || outfit.tops.imageUrl },
    outfit?.bottoms && { name: '하의', image: outfit.bottoms.image || outfit.bottoms.imageUrl },
    outfit?.shoes && { name: '신발', image: outfit.shoes.image || outfit.shoes.imageUrl },
  ].filter(Boolean);

  if (isLoading) {
    return (
      <div className="bg-cream dark:bg-[#1A1918] min-h-screen font-sans flex flex-col">
        <SharedHeader title="가상 피팅 준비" showBackButton onBackClick={() => navigate('/main')} />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="bg-cream dark:bg-[#1A1918] min-h-screen font-sans flex flex-col">
      {/* Shared Header */}
      <SharedHeader title="가상 피팅 준비" showBackButton onBackClick={() => navigate('/main')} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center py-6 px-4">

        {/* 에러 화면 */}
        {fittingError ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="material-symbols-rounded text-5xl text-red-400 mb-4">error</span>
            <p className="text-charcoal dark:text-cream font-medium mb-2">피팅 준비 실패</p>
            <p className="text-sm text-charcoal-light dark:text-cream-dark mb-6 text-center">{fittingError}</p>
            {!userFullBodyImage && (
              <button
                onClick={() => navigate('/setup3?edit=true')}
                className="px-6 py-3 btn-premium rounded-xl font-semibold mb-3"
              >
                전신 사진 등록하기
              </button>
            )}
            <button
              onClick={() => navigate('/main')}
              className="px-6 py-3 border border-gold text-gold rounded-xl font-semibold"
            >
              돌아가기
            </button>
          </div>
        ) : (
          /* 선택된 옷 미리보기 & 피팅 시작 버튼 */
          <div className="flex-1 w-full max-w-md">
            <p className="text-center text-charcoal dark:text-cream mb-4 font-medium">
              선택한 의류로 가상 피팅을 진행합니다
            </p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {outfitItems.map((item, index) => (
                <div key={index} className="bg-warm-white dark:bg-charcoal rounded-xl p-3 shadow-soft border border-gold-light/20">
                  <img src={item.image} alt={item.name} className="w-full aspect-square object-cover rounded-lg mb-2" />
                  <p className="text-center text-sm font-medium text-charcoal dark:text-cream">{item.name}</p>
                </div>
              ))}
            </div>
            <button
              onClick={handleStartFitting}
              className="w-full py-4 btn-premium rounded-xl font-bold text-lg flex items-center justify-center gap-2"
            >
              <span className="material-symbols-rounded text-xl">checkroom</span>
              피팅 시작하기
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default DirectFittingPage;
