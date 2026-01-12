// src/pages/fitting/FittingPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SharedHeader from '../../components/SharedHeader';
import { useVto } from '../../context/VtoContext';

const FittingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { requestPartialVtoByIds, checkPartialVtoLoading } = useVto();
  const isPartialVtoLoading = checkPartialVtoLoading('fitting');
  const { calendarEvent, isToday, userQuery, keywords } = location.state || {};

  const [outfits, setOutfits] = useState([]);         // 상위 5개 조합
  const [candidates, setCandidates] = useState(null); // 카테고리별 후보
  const [meta, setMeta] = useState(null);             // 검색 메타 정보
  const [currentOutfitIndex, setCurrentOutfitIndex] = useState(0); // 현재 선택된 조합
  const [context, setContext] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fittingError, setFittingError] = useState(null);
  const [userFullBodyImage, setUserFullBodyImage] = useState(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);

  // 현재 선택된 outfit
  const currentOutfit = outfits[currentOutfitIndex] || null;

  // API에서 추천 받아오기 + 사용자 전신 사진 가져오기
  useEffect(() => {
    // calendarEvent 또는 userQuery 또는 keywords 중 하나라도 있어야 함
    if (!calendarEvent && !userQuery && (!keywords || keywords.length === 0)) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          navigate('/login');
          return;
        }

        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

        // 사용자 정보 가져오기 (전신 사진 포함)
        const userResponse = await fetch(`${backendUrl}/user/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserFullBodyImage(userData.fullBodyImage);
        }

        // 코디 추천 받기
        const response = await fetch(`${backendUrl}/recommendation/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            calendarEvent,
            calendarEvent,
            isToday,
            query: userQuery,
            keywords,
          }),
        });

        if (response.ok) {
          const data = await response.json();

          // 새로운 응답 구조: outfits (조합 배열) + candidates (카테고리별 후보) + meta
          if (data.outfits && data.outfits.length > 0) {
            setOutfits(data.outfits);
          }

          if (data.candidates) {
            setCandidates(data.candidates);
          }

          if (data.meta) {
            setMeta(data.meta);
          }

          setContext(data.context);
        } else {
          throw new Error('추천 요청 실패');
        }
      } catch (err) {
        setError(err.message);
        console.error('Recommendation error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [calendarEvent, isToday, navigate]);

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

  // 이미지 URL 가져오기 헬퍼 (flatten_image_url 우선)
  const getImageUrl = (item) => {
    if (!item) return null;
    // flatten_image_url이 있으면 우선 사용
    return item.flatten_image_url || item.flattenImageUrl
      || item.image_url || item.imageUrl || item.image;
  };

  // 이전 조합으로 이동
  const handlePrevOutfit = () => {
    setCurrentOutfitIndex((prev) =>
      prev === 0 ? outfits.length - 1 : prev - 1
    );
  };

  // 다음 조합으로 이동
  const handleNextOutfit = () => {
    setCurrentOutfitIndex((prev) =>
      prev === outfits.length - 1 ? 0 : prev + 1
    );
  };

  // 피팅하기 버튼 클릭
  const handleFittingClick = async (event) => {
    let buttonPosition = null;
    if (event?.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      buttonPosition = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }

    if (!userFullBodyImage) {
      const confirm = window.confirm(
        '피팅 모델 이미지가 없어서 착장서비스 이용이 불가합니다. 등록하시겠습니까?'
      );
      if (confirm) {
        navigate('/setup3?edit=true');
      }
      return;
    }

    if (!currentOutfit) {
      setFittingError('선택된 코디가 없습니다.');
      return;
    }

    try {
      // 의류 ID만 추출하여 백엔드에 전송 (CORS 문제 우회)
      const clothingIds = {
        outerId: currentOutfit.outer?.id || undefined,
        topId: currentOutfit.top?.id || undefined,
        bottomId: currentOutfit.bottom?.id || undefined,
        shoesId: currentOutfit.shoes?.id || undefined,
      };

      // VtoContext의 requestPartialVtoByIds 호출 (크레딧 모달 + 애니메이션)
      requestPartialVtoByIds(clothingIds, buttonPosition, 'fitting');

    } catch (err) {
      console.error('Fitting setup error:', err);
      setFittingError('피팅 요청 준비 중 오류가 발생했습니다: ' + err.message);
    }
  };

  // 피드백 전송
  const handleFeedback = async (feedbackType) => {
    if (!currentOutfit || isFeedbackLoading) return;

    setIsFeedbackLoading(true);

    const feedbackTypeMap = {
      'accept': 'ACCEPT',
      'reject': 'REJECT',
      'worn': 'WORN',
    };

    try {
      const token = localStorage.getItem('accessToken');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

      const response = await fetch(`${backendUrl}/recommendation/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          outer_id: currentOutfit.outer?.id,
          top_id: currentOutfit.top?.id,
          bottom_id: currentOutfit.bottom?.id,
          shoes_id: currentOutfit.shoes?.id,
          feedback_type: feedbackTypeMap[feedbackType],
        }),
      });

      const result = await response.json();

      if (result.duplicate) {
        console.log('이미 처리된 피드백:', result.message);
      }
    } catch (err) {
      console.error('Feedback error:', err);
    } finally {
      setIsFeedbackLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-cream dark:bg-[#1A1918] min-h-screen font-sans flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gold border-t-transparent mx-auto mb-4"></div>
          <p className="text-charcoal dark:text-cream font-medium">AI가 코디를 추천하고 있어요...</p>
          <p className="text-sm text-charcoal-light dark:text-cream-dark mt-2">"{calendarEvent}" 일정에 맞는 옷을 찾는 중</p>
        </div>
      </div>
    );
  }

  // 에러 화면
  if (error) {
    return (
      <div className="bg-cream dark:bg-[#1A1918] min-h-screen font-sans flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <span className="material-symbols-rounded text-5xl text-red-400 mb-4 block">error</span>
          <p className="text-charcoal dark:text-cream font-medium mb-2">추천을 불러오지 못했어요</p>
          <p className="text-sm text-charcoal-light dark:text-cream-dark mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 btn-premium rounded-xl font-semibold"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 추천 결과 없음
  if (outfits.length === 0) {
    return (
      <div className="bg-cream dark:bg-[#1A1918] min-h-screen font-sans flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-rounded text-4xl text-gold">checkroom</span>
          </div>
          <p className="text-charcoal dark:text-cream font-medium mb-2">추천할 코디가 없어요</p>

          {/* 적용된 필터 정보 */}
          {meta?.appliedFilters && (
            <div className="mb-4 p-3 bg-warm-white dark:bg-charcoal/50 rounded-xl">
              <p className="text-xs text-charcoal-light dark:text-cream-dark mb-2">적용된 필터</p>
              <div className="flex flex-wrap justify-center gap-2">
                <span className="px-2 py-1 bg-gold/10 rounded-full text-xs text-charcoal dark:text-cream">
                  TPO: {meta.appliedFilters.tpo}
                </span>
                <span className="px-2 py-1 bg-gold/10 rounded-full text-xs text-charcoal dark:text-cream">
                  계절: {meta.appliedFilters.season}
                </span>
              </div>
            </div>
          )}

          {/* 카테고리별 후보 개수 */}
          {meta?.totalCandidates && (
            <div className="mb-4 p-3 bg-warm-white dark:bg-charcoal/50 rounded-xl">
              <p className="text-xs text-charcoal-light dark:text-cream-dark mb-2">카테고리별 후보</p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-charcoal dark:text-cream">{meta.totalCandidates.outer}</p>
                  <p className="text-[10px] text-charcoal-light dark:text-cream-dark">아우터</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-charcoal dark:text-cream">{meta.totalCandidates.top}</p>
                  <p className="text-[10px] text-charcoal-light dark:text-cream-dark">상의</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-charcoal dark:text-cream">{meta.totalCandidates.bottom}</p>
                  <p className="text-[10px] text-charcoal-light dark:text-cream-dark">하의</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-charcoal dark:text-cream">{meta.totalCandidates.shoes}</p>
                  <p className="text-[10px] text-charcoal-light dark:text-cream-dark">신발</p>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-charcoal-light dark:text-cream-dark mb-6">
            조건에 맞는 옷을 더 등록해보세요
          </p>
          <button
            onClick={() => navigate('/register')}
            className="px-6 py-3 btn-premium rounded-xl font-semibold"
          >
            옷 등록하기
          </button>
        </div>
      </div>
    );
  }

  // 추천된 아이템들을 표시용 배열로 변환
  const outfitItems = [
    currentOutfit?.outer && {
      name: '외투',
      image: getImageUrl(currentOutfit.outer),
      subCategory: currentOutfit.outer.sub_category,
      position: 'top-[10%] left-[5%]',
      size: 'w-[45%] h-[35%]',
      rotate: '-rotate-3',
      zIndex: 'z-20'
    },
    currentOutfit?.top && {
      name: '상의',
      image: getImageUrl(currentOutfit.top),
      subCategory: currentOutfit.top.sub_category,
      position: 'top-[15%] right-[8%]',
      size: 'w-[40%] h-[30%]',
      rotate: 'rotate-2',
      zIndex: 'z-10'
    },
    currentOutfit?.bottom && {
      name: '하의',
      image: getImageUrl(currentOutfit.bottom),
      subCategory: currentOutfit.bottom.sub_category,
      position: 'bottom-[15%] left-[10%]',
      size: 'w-[35%] h-[40%]',
      rotate: 'rotate-1',
      zIndex: 'z-15'
    },
    currentOutfit?.shoes && {
      name: '신발',
      image: getImageUrl(currentOutfit.shoes),
      subCategory: currentOutfit.shoes.sub_category,
      position: 'bottom-[5%] right-[15%]',
      size: 'w-[30%] h-[25%]',
      rotate: 'rotate-6',
      zIndex: 'z-25'
    },
  ].filter(item => item && item.image);

  return (
    <div className="bg-cream dark:bg-[#1A1918] min-h-screen font-sans flex flex-col">
      {/* Shared Header */}
      <SharedHeader
        title="코디 추천"
        showBackButton
        onBackClick={() => navigate(-1)}
      />

      {/* Context Info */}
      {context && (
        <div className="px-4 py-3 bg-gradient-to-r from-gold/10 to-gold-light/5 border-b border-gold/20">
          <div className="flex items-center justify-center gap-4 text-sm">
            {context.tpo && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-warm-white dark:bg-charcoal/50 rounded-full border border-gold-light/30">
                <span className="material-symbols-rounded text-gold text-base">label</span>
                <span className="text-charcoal dark:text-cream font-medium">{context.tpo}</span>
              </div>
            )}
            {context.weather && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-warm-white dark:bg-charcoal/50 rounded-full border border-gold-light/30">
                <span className="material-symbols-rounded text-gold text-base">thermostat</span>
                <span className="text-charcoal dark:text-cream font-medium">{context.weather.temp}°C</span>
                <span className="text-charcoal-light dark:text-cream-dark">{context.weather.condition}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-between py-4 px-4">
        {/* 조합 선택 인디케이터 */}
        {outfits.length > 1 && (
          <div className="w-full flex items-center justify-between mb-3">
            <button
              onClick={handlePrevOutfit}
              className="w-10 h-10 rounded-full bg-warm-white dark:bg-charcoal border border-gold-light/30 flex items-center justify-center hover:bg-gold/10 transition-colors"
            >
              <span className="material-symbols-rounded text-charcoal dark:text-cream">chevron_left</span>
            </button>

            <div className="flex items-center gap-2">
              {outfits.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentOutfitIndex(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${index === currentOutfitIndex
                    ? 'bg-gold w-6'
                    : 'bg-gold/30 hover:bg-gold/50'
                    }`}
                />
              ))}
            </div>

            <button
              onClick={handleNextOutfit}
              className="w-10 h-10 rounded-full bg-warm-white dark:bg-charcoal border border-gold-light/30 flex items-center justify-center hover:bg-gold/10 transition-colors"
            >
              <span className="material-symbols-rounded text-charcoal dark:text-cream">chevron_right</span>
            </button>
          </div>
        )}

        {/* 조합 점수 표시 */}
        {currentOutfit?.displayScore && (
          <div className="mb-2 px-4 py-1.5 bg-gold/10 rounded-full">
            <span className="text-xs text-charcoal dark:text-cream">
              매칭 점수: <span className="font-bold text-gold">{(currentOutfit.displayScore * 100).toFixed(0)}점</span>
            </span>
          </div>
        )}

        {/* Outfit Display */}
        <div className="flex-1 w-full flex items-center justify-center">
          <div className="w-full h-[380px] relative mx-2 bg-warm-white/50 dark:bg-charcoal/30 rounded-3xl border border-gold-light/20 shadow-soft">
            {outfitItems.map((item, index) => (
              <div
                key={index}
                className={`absolute ${item.position} ${item.size} bg-warm-white dark:bg-charcoal rounded-2xl border-2 border-gold-light/30 dark:border-charcoal-light/30 shadow-lifted flex items-center justify-center p-3 transform ${item.rotate} transition-all duration-300 hover:scale-105 hover:border-gold hover:shadow-xl ${item.zIndex}`}
              >
                <img
                  alt={item.name}
                  className="w-full h-full object-contain rounded-xl"
                  src={item.image}
                />
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] bg-charcoal/70 dark:bg-charcoal text-cream px-2 py-0.5 rounded-full font-medium">
                  {item.subCategory || item.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {fittingError && (
          <div className="w-full mb-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{fittingError}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full space-y-3 mt-4 mb-4">
          {/* 피드백 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={() => handleFeedback('reject')}
              disabled={isFeedbackLoading}
              className={`flex-1 h-12 rounded-xl font-medium border-2 border-red-300 dark:border-red-700 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 ${
                isFeedbackLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isFeedbackLoading ? (
                <span className="material-symbols-rounded text-xl animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-rounded text-xl">thumb_down</span>
              )}
              싫어요
            </button>
            <button
              onClick={() => handleFeedback('accept')}
              disabled={isFeedbackLoading}
              className={`flex-1 h-12 rounded-xl font-medium border-2 border-green-300 dark:border-green-700 text-green-500 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center justify-center gap-2 ${
                isFeedbackLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isFeedbackLoading ? (
                <span className="material-symbols-rounded text-xl animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-rounded text-xl">thumb_up</span>
              )}
              좋아요
            </button>
          </div>

          {/* 피팅 버튼 */}
          <button
            onClick={(e) => {
              if (!isPartialVtoLoading && !isFeedbackLoading) {
                handleFeedback('accept');
                handleFittingClick(e);
              }
            }}
            disabled={isPartialVtoLoading || isFeedbackLoading}
            className={`w-full h-14 rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
              isPartialVtoLoading || isFeedbackLoading
                ? 'bg-gold-light/50 text-charcoal cursor-wait'
                : 'btn-premium text-warm-white hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0'
            }`}
          >
            {isPartialVtoLoading ? (
              <>
                <span className="material-symbols-rounded animate-spin">progress_activity</span>
                생성 중...
              </>
            ) : (
              <>
                <span className="material-symbols-rounded">checkroom</span>
                입어보기
              </>
            )}
          </button>
        </div>
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-16 glass-warm border-t border-gold-light/20 flex items-center justify-around px-4 z-50 safe-area-pb">
        <button
          onClick={() => navigate('/main')}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] text-charcoal-light dark:text-cream-dark hover:text-gold transition-colors"
        >
          <span className="material-symbols-rounded text-[22px]">checkroom</span>
          <span className="text-[10px] font-semibold">내 옷장</span>
        </button>
        <button
          onClick={() => navigate('/feed')}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] text-charcoal-light dark:text-cream-dark hover:text-gold transition-colors"
        >
          <span className="material-symbols-rounded text-[22px]">grid_view</span>
          <span className="text-[10px] font-semibold">SNS</span>
        </button>
      </div>
    </div>
  );
};

export default FittingPage;