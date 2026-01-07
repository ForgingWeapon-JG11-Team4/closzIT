import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SharedHeader from '../../components/SharedHeader';
import { useVto } from '../../context/VtoContext';

const FittingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { requestPartialVto, isPartialVtoLoading } = useVto();
  const { calendarEvent, isToday } = location.state || {};

  const [outfit, setOutfit] = useState(null);
  const [context, setContext] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fittingError, setFittingError] = useState(null);
  const [userFullBodyImage, setUserFullBodyImage] = useState(null);

  // API에서 추천 받아오기 + 사용자 전신 사진 가져오기
  useEffect(() => {
    if (!calendarEvent) {
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
            isToday,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.results) {
            const outfitSet = {
              outer: data.results.outer?.[0] || null,
              top: data.results.top?.[0] || null,
              bottom: data.results.bottom?.[0] || null,
              shoes: data.results.shoes?.[0] || null,
            };

            const hasAnyItem = outfitSet.outer || outfitSet.top || outfitSet.bottom || outfitSet.shoes;
            if (hasAnyItem) {
              setOutfit(outfitSet);
            }
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

  // 피팅하기 버튼 클릭 - VtoContext 사용 (크레딧 모달 + 백그라운드 실행)
  const handleFittingClick = async (event) => {
    // 버튼 위치 저장 (플라이 애니메이션용)
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

    try {
      const formData = new FormData();

      // 사용자 전신 사진 추가
      const personBlob = base64ToBlob(userFullBodyImage);
      formData.append('person', personBlob, 'person.jpg');

      // 추천된 의류 이미지들 추가
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

      await processImage(outfit.outer, 'outer');
      await processImage(outfit.top, 'top');
      await processImage(outfit.bottom, 'bottom');
      await processImage(outfit.shoes, 'shoes');

      // VtoContext의 requestPartialVto 호출 (크레딧 모달 표시 → 확인 시 백그라운드 실행)
      requestPartialVto(formData, buttonPosition);

    } catch (err) {
      console.error('Fitting setup error:', err);
      setFittingError('피팅 요청 준비 중 오류가 발생했습니다: ' + err.message);
    }
  };

  // 로딩 화면
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
  if (!outfit) {
    return (
      <div className="bg-cream dark:bg-[#1A1918] min-h-screen font-sans flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-rounded text-4xl text-gold">checkroom</span>
          </div>
          <p className="text-charcoal dark:text-cream font-medium mb-2">추천할 코디가 없어요</p>
          <p className="text-sm text-charcoal-light dark:text-cream-dark mb-6">옷장에 옷을 더 등록해보세요</p>
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
    outfit.outer && {
      name: '외투',
      image: outfit.outer.image || outfit.outer.imageUrl || outfit.outer.image_url,
      position: 'top-[10%] left-[5%]',
      size: 'w-[45%] h-[35%]',
      rotate: '-rotate-3',
      zIndex: 'z-20'
    },
    outfit.top && {
      name: '상의',
      image: outfit.top.image || outfit.top.imageUrl || outfit.top.image_url,
      position: 'top-[15%] right-[8%]',
      size: 'w-[40%] h-[30%]',
      rotate: 'rotate-2',
      zIndex: 'z-10'
    },
    outfit.bottom && {
      name: '하의',
      image: outfit.bottom.image || outfit.bottom.imageUrl || outfit.bottom.image_url,
      position: 'bottom-[15%] left-[10%]',
      size: 'w-[35%] h-[40%]',
      rotate: 'rotate-1',
      zIndex: 'z-15'
    },
    outfit.shoes && {
      name: '신발',
      image: outfit.shoes.image || outfit.shoes.imageUrl || outfit.shoes.image_url,
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
      <main className="flex-1 flex flex-col items-center justify-between py-6 px-4">
        {/* Outfit Display */}
        <div className="flex-1 w-full flex items-center justify-center">
          <div className="w-full h-[420px] relative mx-2 bg-warm-white/50 dark:bg-charcoal/30 rounded-3xl border border-gold-light/20 shadow-soft">
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
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {fittingError && (
          <div className="w-full mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{fittingError}</p>
          </div>
        )}

        {/* Fitting Button */}
        <div className="w-full px-4 mt-6 mb-4">
          <button
            onClick={(e) => {
              if (!isPartialVtoLoading) {
                handleFittingClick(e);
              }
            }}
            disabled={isPartialVtoLoading}
            className={`w-full h-14 rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${isPartialVtoLoading
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
      <div className="h-20 glass-warm border-t border-gold-light/20 flex items-center justify-around pb-2 z-50 safe-area-pb">
        <button
          onClick={() => navigate('/main')}
          className="flex flex-col items-center justify-center w-16 h-full text-charcoal-light dark:text-cream-dark hover:text-gold transition-colors gap-1"
        >
          <span className="material-symbols-rounded text-2xl">home</span>
          <span className="text-[10px] font-medium">홈</span>
        </button>

        <div className="relative -top-5">
          <button
            onClick={() => navigate('/register')}
            className="w-16 h-16 bg-gradient-to-br from-gold to-gold-dark text-warm-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform border-4 border-cream dark:border-[#1A1918]"
          >
            <span className="material-symbols-rounded text-4xl">add</span>
          </button>
        </div>

        <button
          onClick={() => navigate('/feed')}
          className="flex flex-col items-center justify-center w-16 h-full text-charcoal-light dark:text-cream-dark hover:text-gold transition-colors gap-1"
        >
          <span className="material-symbols-rounded text-2xl">grid_view</span>
          <span className="text-[10px] font-medium">SNS</span>
        </button>
      </div>
    </div>
  );
};

export default FittingPage;