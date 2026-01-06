import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const DirectFittingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { outfit, fromMain } = location.state || {};

  // 피팅 관련 상태
  const [showCreditModal, setShowCreditModal] = useState(true);
  const [isFitting, setIsFitting] = useState(false);
  const [fittingResult, setFittingResult] = useState(null);
  const [fittingError, setFittingError] = useState(null);
  const [userFullBodyImage, setUserFullBodyImage] = useState(null);

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
            setShowCreditModal(false);
          } else {
            setUserFullBodyImage(userData.fullBodyImage);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        setFittingError('사용자 정보를 불러오지 못했습니다.');
        setShowCreditModal(false);
      }
    };

    fetchUserData();
  }, [outfit, fromMain, navigate]);

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

  // 피팅 API 호출
  const handleConfirmFitting = async () => {
    setShowCreditModal(false);
    setIsFitting(true);
    setFittingError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      
      const formData = new FormData();
      
      // 사용자 전신 사진 추가
      const personBlob = base64ToBlob(userFullBodyImage);
      formData.append('person', personBlob, 'person.jpg');
      
      // 선택된 의류 이미지들 추가
      const processImage = async (item, key) => {
        if (!item) return;
        const imageUrl = item.image || item.imageUrl || item.image_url;
        if (imageUrl.startsWith('data:')) {
          formData.append(key, base64ToBlob(imageUrl), `${key}.jpg`);
        } else {
          const blob = await urlToBlob(imageUrl);
          formData.append(key, blob, `${key}.jpg`);
        }
      };

      await processImage(outfit.outerwear, 'outer');
      await processImage(outfit.tops, 'top');
      await processImage(outfit.bottoms, 'bottom');
      await processImage(outfit.shoes, 'shoes');

      const response = await fetch(`${backendUrl}/api/fitting/partial-try-on`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setFittingResult(data);
      } else {
        setFittingError(data.message || '가상 피팅에 실패했습니다.');
      }
    } catch (err) {
      console.error('Fitting error:', err);
      setFittingError('피팅 처리 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsFitting(false);
    }
  };

  // 선택된 의류 표시용 배열
  const outfitItems = [
    outfit?.outerwear && { name: '외투', image: outfit.outerwear.image || outfit.outerwear.imageUrl },
    outfit?.tops && { name: '상의', image: outfit.tops.image || outfit.tops.imageUrl },
    outfit?.bottoms && { name: '하의', image: outfit.bottoms.image || outfit.bottoms.imageUrl },
    outfit?.shoes && { name: '신발', image: outfit.shoes.image || outfit.shoes.imageUrl },
  ].filter(Boolean);

  return (
    <div className="bg-cream dark:bg-[#1A1918] min-h-screen font-sans flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between gap-3 glass-warm border-b border-gold-light/20 sticky top-0 z-40">
        <button 
          onClick={() => fittingResult ? setFittingResult(null) : navigate('/main')}
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gold-light/20 transition-colors"
        >
          <span className="material-symbols-rounded text-2xl text-charcoal dark:text-cream">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold text-charcoal dark:text-cream">
          {fittingResult ? '피팅 결과' : '가상 피팅'}
        </h1>
        <div className="w-10"></div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center py-6 px-4">
        {/* 피팅 진행 중 */}
        {isFitting && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gold border-t-transparent mb-6"></div>
            <p className="text-charcoal dark:text-cream font-medium text-lg">가상 피팅 중...</p>
            <p className="text-sm text-charcoal-light dark:text-cream-dark mt-2">AI가 옷을 입혀보고 있어요</p>
          </div>
        )}

        {/* 피팅 결과 */}
        {fittingResult && !isFitting && (
          <div className="flex-1 w-full max-w-md">
            <div className="bg-warm-white dark:bg-charcoal rounded-2xl p-4 shadow-lifted border border-gold-light/20">
              {fittingResult.imageUrl ? (
                <>
                  <img
                    src={fittingResult.imageUrl}
                    alt="Fitting Result"
                    className="w-full rounded-xl mb-4"
                  />
                  <p className="text-sm text-charcoal-light dark:text-cream-dark text-center">
                    처리 시간: {fittingResult.processingTime?.total?.toFixed(2) || '-'}초
                  </p>
                </>
              ) : (
                <>
                  {fittingResult.note && (
                    <div className="bg-gold/10 border-l-4 border-gold p-3 rounded-lg mb-4">
                      <p className="text-sm text-charcoal dark:text-cream">{fittingResult.note}</p>
                    </div>
                  )}
                  <div className="prose dark:prose-invert">
                    <h3 className="text-lg font-semibold text-charcoal dark:text-cream mb-2">AI 분석 결과</h3>
                    <p className="text-charcoal-light dark:text-cream-dark whitespace-pre-wrap">
                      {fittingResult.description}
                    </p>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => navigate('/main')}
              className="mt-6 w-full py-3 btn-premium rounded-xl font-bold"
            >
              홈으로 돌아가기
            </button>
          </div>
        )}

        {/* 에러 화면 */}
        {fittingError && !isFitting && !fittingResult && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="material-symbols-rounded text-5xl text-red-400 mb-4">error</span>
            <p className="text-charcoal dark:text-cream font-medium mb-2">피팅 실패</p>
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
        )}

        {/* 선택된 옷 미리보기 (모달 전) */}
        {!isFitting && !fittingResult && !fittingError && !showCreditModal && (
          <div className="flex-1 w-full">
            <div className="grid grid-cols-2 gap-4 mb-6">
              {outfitItems.map((item, index) => (
                <div key={index} className="bg-warm-white dark:bg-charcoal rounded-xl p-3 shadow-soft border border-gold-light/20">
                  <img src={item.image} alt={item.name} className="w-full aspect-square object-cover rounded-lg mb-2" />
                  <p className="text-center text-sm font-medium text-charcoal dark:text-cream">{item.name}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowCreditModal(true)}
              className="w-full py-4 btn-premium rounded-xl font-bold text-lg"
            >
              피팅 시작하기
            </button>
          </div>
        )}
      </main>

      {/* 크레딧 확인 모달 */}
      {showCreditModal && userFullBodyImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-warm-white dark:bg-charcoal rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-rounded text-3xl text-gold">monetization_on</span>
              </div>
              <h3 className="text-xl font-bold text-charcoal dark:text-cream mb-2">피팅 크레딧 사용</h3>
              <p className="text-charcoal-light dark:text-cream-dark">
                가상 피팅에 <span className="text-gold font-bold">2 크레딧</span>이 사용됩니다.
              </p>
              <p className="text-sm text-charcoal-light/70 dark:text-cream-dark/70 mt-2">
                진행하시겠습니까?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/main')}
                className="flex-1 py-3 rounded-xl border border-gold-light/30 text-charcoal dark:text-cream font-medium hover:bg-gold-light/10 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirmFitting}
                className="flex-1 py-3 rounded-xl btn-premium font-bold"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectFittingPage;
