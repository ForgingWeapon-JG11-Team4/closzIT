import React, { useState, useEffect } from 'react';
import { useVtoStore } from '../../stores/vtoStore';
import { useUserStore } from '../../stores/userStore';
import { useNavigate } from 'react-router-dom';

const FittingResult = ({ 
  recommendationParams = {}, 
  onClose,
  onClothClick,
  backendUrl 
}) => {
  const navigate = useNavigate();
  const { requestPartialVtoByIds, checkPartialVtoLoading } = useVtoStore();
  const { userFullBodyImage: storeFullBodyImage, fetchUser } = useUserStore();
  const isPartialVtoLoading = checkPartialVtoLoading('fitting-result');

  const { calendarEvent, isToday, userQuery, keywords } = recommendationParams;

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
  const [feedbackStatus, setFeedbackStatus] = useState({}); // { [index]: 'accept' | 'reject' }
  const [isOutfitLogLoading, setIsOutfitLogLoading] = useState(false);

  // 현재 선택된 outfit
  const currentOutfit = outfits[currentOutfitIndex] || null;

  // API에서 추천 받아오기 + 사용자 전신 사진 가져오기
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
           // 토큰이 없으면 처리는 상위에서 하거나 조용히 실패
          return;
        }

        const url = backendUrl || process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

        // 사용자 정보 가져오기 (전신 사진 포함)
        const userData = await fetchUser();
        if (userData) {
          setUserFullBodyImage(userData.fullBodyImage);
        }

        // 코디 추천 받기
        const response = await fetch(`${url}/recommendation/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            calendarEvent,
            isToday,
            query: userQuery,
            keywords,
          }),
        });

        if (response.ok) {
          const data = await response.json();

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
  }, [calendarEvent, isToday, userQuery, keywords, backendUrl]);

  // 이미지 URL 가져오기 헬퍼
  const getImageUrl = (item) => {
    if (!item) return null;
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
      const clothingIds = {
        outerId: currentOutfit.outer?.id || undefined,
        topId: currentOutfit.top?.id || undefined,
        bottomId: currentOutfit.bottom?.id || undefined,
        shoesId: currentOutfit.shoes?.id || undefined,
      };

      // VtoContext의 requestPartialVtoByIds 호출 (identifier='fitting-result')
      requestPartialVtoByIds(clothingIds, buttonPosition, 'fitting-result');

    } catch (err) {
      console.error('Fitting setup error:', err);
      setFittingError('피팅 요청 준비 중 오류가 발생했습니다: ' + err.message);
    }
  };

  // 피드백 전송
  const handleFeedback = async (feedbackType) => {
    if (!currentOutfit || isFeedbackLoading) return;

    // Prevent clicking the same feedback type again if it's already selected
    if (feedbackStatus[currentOutfitIndex] === feedbackType) return;

    setIsFeedbackLoading(true);

    const feedbackTypeMap = {
      'accept': 'ACCEPT',
      'reject': 'REJECT',
      'worn': 'WORN',
    };

    try {
      const token = localStorage.getItem('accessToken');
      const url = backendUrl || process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

      const response = await fetch(`${url}/recommendation/feedback`, {
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
      
      // Update local state to reflect the new feedback
      setFeedbackStatus(prev => ({
        ...prev,
        [currentOutfitIndex]: feedbackType
      }));

    } catch (err) {
      console.error('Feedback error:', err);
    } finally {
      setIsFeedbackLoading(false);
    }
  };

  // 오늘 이 코디 입기 버튼 클릭
  const handleWearTodayClick = async () => {
    if (!currentOutfit || isOutfitLogLoading) return;

    // 최소한 상의, 하의, 신발이 있어야 함
    if (!currentOutfit.top?.id || !currentOutfit.bottom?.id || !currentOutfit.shoes?.id) {
      alert('상의, 하의, 신발은 필수입니다.');
      return;
    }

    setIsOutfitLogLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const url = backendUrl || process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

      const response = await fetch(`${url}/outfit-log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outerId: currentOutfit.outer?.id,
          topId: currentOutfit.top?.id,
          bottomId: currentOutfit.bottom?.id,
          shoesId: currentOutfit.shoes?.id,
          tpo: context?.tpo || 'Daily',
        }),
      });

      if (response.ok) {
        alert('오늘의 코디로 저장되었습니다! 👍');
        // 피드백도 자동으로 worn 처리
        handleFeedback('worn');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '착장 기록 저장 실패');
      }
    } catch (err) {
      console.error('Outfit log error:', err);
      alert(`착장 기록 저장 실패: ${err.message}`);
    } finally {
      setIsOutfitLogLoading(false);
    }
  };

  // 추천된 아이템들을 표시용 배열로 변환
  const outfitItems = [
    currentOutfit?.outer && {
      name: '외투',
      image: getImageUrl(currentOutfit.outer),
      subCategory: currentOutfit.outer.sub_category,
      category: 'outerwear',
      isHanging: true
    },
    currentOutfit?.top && {
      name: '상의',
      image: getImageUrl(currentOutfit.top),
      subCategory: currentOutfit.top.sub_category,
      category: 'tops',
      isHanging: true
    },
    currentOutfit?.bottom && {
      name: '하의',
      image: getImageUrl(currentOutfit.bottom),
      subCategory: currentOutfit.bottom.sub_category,
      category: 'bottoms',
      isHanging: true
    },
    currentOutfit?.shoes && {
      name: '신발',
      image: getImageUrl(currentOutfit.shoes),
      subCategory: currentOutfit.shoes.sub_category,
      category: 'shoes',
      isHanging: false
    },
  ].filter(item => item && item.image);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="w-full py-10 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-[32px] border border-gold/20 shadow-sm animate-pulse">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-gold border-t-transparent mb-3"></div>
        <p className="text-charcoal dark:text-cream font-medium">AI 스타일리스트가 옷을 고르고 있어요...</p>
        <p className="text-xs text-charcoal-light dark:text-cream-dark mt-1">잠시만 기다려주세요 ✨</p>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="w-full py-6 px-4 bg-red-50 rounded-[32px] border border-red-100 flex flex-col items-center text-center">
        <span className="material-symbols-rounded text-3xl text-red-400 mb-2">error</span>
        <p className="text-sm text-red-500 mb-3">{error}</p>
        <button 
          onClick={onClose}
          className="text-xs text-red-400 underline"
        >
          닫기
        </button>
      </div>
    );
  }

  // 결과 없음
  if (outfits.length === 0) {
    return (
      <div className="w-full py-8 text-center bg-white/50 rounded-[32px] border border-gold/20">
        <span className="material-symbols-rounded text-3xl text-gold/50 mb-2 block">checkroom</span>
        <p className="text-sm text-charcoal-light mb-4">추천할 수 있는 코디가 충분하지 않아요</p>
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-charcoal text-white rounded-xl text-xs font-bold"
        >
          확인
        </button>
      </div>
    );
  }

  // 정상 렌더링
  return (
    <div className="w-full mt-2 animate-slideDown">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex flex-col">
          <h3 className="text-lg font-bold text-charcoal dark:text-cream flex items-center gap-2">
            AI 추천 코디
            <span className="px-2 py-0.5 rounded-full bg-gold/10 text-gold text-[10px] font-bold">
              {currentOutfitIndex + 1} / {outfits.length}
            </span>
          </h3>
          {context && (
             <div className="text-[10px] text-charcoal-light dark:text-cream-dark flex gap-1 mt-0.5">
               {context.tpo && <span>#{context.tpo}</span>}
               {context.weather && <span>{context.weather.temp}°C {context.weather.condition}</span>}
             </div>
          )}
        </div>
        <button 
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-rounded text-charcoal-light text-lg">close</span>
        </button>
      </div>

      {/* Main Content Card */}
      <div className="relative rounded-[32px] overflow-hidden bg-warm-white dark:bg-charcoal border border-gold-light/20 shadow-md">
        
        {/* Navigation Arrows */}
        {outfits.length > 1 && (
          <>
            <button
              onClick={handlePrevOutfit}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/60 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-30 shadow-sm border border-white/20"
            >
              <span className="material-symbols-rounded text-charcoal dark:text-cream">chevron_left</span>
            </button>
            <button
              onClick={handleNextOutfit}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/60 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-30 shadow-sm border border-white/20"
            >
              <span className="material-symbols-rounded text-charcoal dark:text-cream">chevron_right</span>
            </button>
          </>
        )}

        {/* Outfit Visualizer */}
        <div className="w-full h-[280px] relative bg-gradient-to-br from-warm-white via-white to-gold/5 dark:from-charcoal dark:to-charcoal-dark overflow-hidden flex flex-col justify-center">
          
          {/* Items Container - Simple Row */}
          <div className="flex items-center justify-center gap-4 px-6 h-full w-full">
            {outfitItems.map((item, index) => (
              <div
                key={index}
                className="relative flex flex-col items-center justify-center group flex-1 h-full max-h-[220px] cursor-pointer"
                onClick={() => {
                  if (!onClothClick) return;
                  
                  // Map display category to currentOutfit keys
                  const categoryKeyMap = {
                    outerwear: 'outer',
                    tops: 'top',
                    bottoms: 'bottom',
                    shoes: 'shoes'
                  };
                  const originalKey = categoryKeyMap[item.category];
                  const originalItem = currentOutfit[originalKey];

                  if (originalItem) {
                    onClothClick({
                      ...originalItem,
                      // Ensure essential props for Modal are present if different
                      image: originalItem.image || originalItem.imageUrl || item.image,
                      category: item.category // Maintain the display category string if needed
                    });
                  }
                }}
              >
                  <div className="w-full h-full rounded-2xl overflow-hidden border border-black/5 dark:border-white/10 shadow-lg relative bg-white dark:bg-charcoal transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center justify-center p-2">
                    <img
                      alt={item.name}
                      className="w-full h-full object-contain"
                      src={item.image}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                  </div>
              </div>
            ))}
          </div>

          {/* Score Badge */}
          {currentOutfit?.displayScore && (
          <div className="absolute top-3 right-4 bg-white/80 dark:bg-charcoal/80 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm border border-gold/20 z-40">
            <span className="text-[10px] text-charcoal-light dark:text-cream-dark">매칭률 </span>
            <span className="text-xs font-bold text-gold">{(currentOutfit.displayScore * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="p-4 bg-white/60 dark:bg-charcoal/60 backdrop-blur-md border-t border-gold/10">
          
          {/* Feedback Buttons */}
          <div className="flex items-center gap-2 mb-3">
             <button
               onClick={() => handleFeedback('reject')}
               disabled={isFeedbackLoading}
               className={`flex-1 h-9 rounded-xl border transition-all flex items-center justify-center gap-1.5 text-xs font-medium ${
                 feedbackStatus[currentOutfitIndex] === 'reject'
                   ? 'bg-red-500 border-red-500 text-white shadow-md'
                   : 'border-red-200 dark:border-red-800 text-red-500 bg-red-50/50 hover:bg-red-50'
               }`}
             >
               <span className="material-symbols-rounded text-base">thumb_down</span>
               {feedbackStatus[currentOutfitIndex] === 'reject' ? '별로예요' : '별로예요'}
             </button>
             <button
               onClick={() => handleFeedback('accept')}
               disabled={isFeedbackLoading}
               className={`flex-1 h-9 rounded-xl border transition-all flex items-center justify-center gap-1.5 text-xs font-medium ${
                 feedbackStatus[currentOutfitIndex] === 'accept'
                   ? 'bg-green-600 border-green-600 text-white shadow-md'
                   : 'border-green-200 dark:border-green-800 text-green-600 bg-green-50/50 hover:bg-green-50'
               }`}
             >
               <span className="material-symbols-rounded text-base">thumb_up</span>
               {feedbackStatus[currentOutfitIndex] === 'accept' ? '좋아요!' : '좋아요'}
             </button>
          </div>

          {/* Action Buttons Row */}
          <div className="flex gap-2">
            {/* Try On Button */}
            <button
              onClick={(e) => {
                if (!isPartialVtoLoading && !isFeedbackLoading) {
                  handleFeedback('accept');
                  handleFittingClick(e);
                }
              }}
              disabled={isPartialVtoLoading || isFeedbackLoading}
              className={`flex-1 h-12 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 text-xs shadow-lg ${
                isPartialVtoLoading
                  ? 'bg-gold/50 text-white cursor-wait'
                  : 'bg-gradient-to-r from-gold to-gold-dark text-white hover:shadow-gold/30 hover:-translate-y-0.5'
              }`}
            >
              {isPartialVtoLoading ? (
                <>
                  <span className="material-symbols-rounded animate-spin text-base">progress_activity</span>
                  생성 중...
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded text-base">auto_awesome</span>
                  가상착장 해보기
                </>
              )}
            </button>

            {/* Wear Today Button */}
            <button
              onClick={handleWearTodayClick}
              disabled={isOutfitLogLoading || !currentOutfit?.top || !currentOutfit?.bottom || !currentOutfit?.shoes}
              className={`flex-1 h-12 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 text-xs shadow-lg ${
                isOutfitLogLoading
                  ? 'bg-charcoal/50 text-white cursor-wait'
                  : 'bg-charcoal text-white hover:bg-charcoal-dark hover:shadow-lg hover:-translate-y-0.5'
              }`}
            >
              {isOutfitLogLoading ? (
                <>
                  <span className="material-symbols-rounded animate-spin text-base">progress_activity</span>
                  저장 중...
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded text-base">today</span>
                  오늘 입기
                </>
              )}
            </button>
          </div>
          
          {fittingError && (
             <p className="text-[10px] text-red-500 mt-2 text-center">{fittingError}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FittingResult;
