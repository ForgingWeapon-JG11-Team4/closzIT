import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const FittingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { calendarEvent, isToday } = location.state || {};

  const [outfit, setOutfit] = useState(null);
  const [context, setContext] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // API에서 추천 받아오기
  useEffect(() => {
    if (!calendarEvent) {
      navigate('/');
      return;
    }

    const fetchRecommendation = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          navigate('/login');
          return;
        }

        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
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
          // 백엔드는 카테고리별 배열을 반환함
          // { outer: [], top: [...], bottom: [...], shoes: [...] }
          if (data.results) {
            // 각 카테고리에서 첫 번째 아이템을 가져와서 코디 세트 구성
            const outfitSet = {
              outer: data.results.outer?.[0] || null,
              top: data.results.top?.[0] || null,
              bottom: data.results.bottom?.[0] || null,
              shoes: data.results.shoes?.[0] || null,
            };
            
            // 최소 1개 이상의 아이템이 있으면 outfit으로 설정
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

    fetchRecommendation();
  }, [calendarEvent, isToday, navigate]);

  // 로딩 화면
  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gold border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-800 dark:text-gray-100 font-medium">AI가 코디를 추천하고 있어요...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">"{calendarEvent}" 일정에 맞는 옷을 찾는 중</p>
        </div>
      </div>
    );
  }

  // 에러 화면
  if (error) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <span className="material-symbols-rounded text-5xl text-red-400 mb-4 block">error</span>
          <p className="text-gray-800 dark:text-gray-100 font-medium mb-2">추천을 불러오지 못했어요</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-gold text-white rounded-xl font-semibold"
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
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <span className="material-symbols-rounded text-5xl text-gray-300 mb-4 block">checkroom</span>
          <p className="text-gray-800 dark:text-gray-100 font-medium mb-2">추천할 코디가 없어요</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">옷장에 옷을 더 등록해보세요</p>
          <button
            onClick={() => navigate('/register')}
            className="px-6 py-2 bg-gold text-white rounded-xl font-semibold"
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
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between gap-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-40">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="material-symbols-rounded text-2xl text-gray-600 dark:text-gray-300">arrow_back</span>
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">코디 추천</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">"{calendarEvent}"</p>
        </div>
        <div className="w-10"></div>
      </div>

      {/* Context Info */}
      {context && (
        <div className="px-4 py-2 bg-gold/10 border-b border-gold/20">
          <div className="flex items-center justify-center gap-4 text-sm">
            {context.tpo && (
              <div className="flex items-center gap-1">
                <span className="material-symbols-rounded text-gold text-base">label</span>
                <span className="text-gray-800 dark:text-gray-100 font-medium">{context.tpo}</span>
              </div>
            )}
            {context.weather && (
              <div className="flex items-center gap-1">
                <span className="material-symbols-rounded text-gold text-base">thermostat</span>
                <span className="text-gray-800 dark:text-gray-100">{context.weather.temp}°C</span>
                <span className="text-gray-500 dark:text-gray-400">{context.weather.condition}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-between py-6 px-4">
        {/* Outfit Display */}
        <div className="flex-1 w-full flex items-center justify-center">
          <div className="w-full h-[420px] relative mx-2">
            {outfitItems.map((item, index) => (
              <div 
                key={index}
                className={`absolute ${item.position} ${item.size} bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-none dark:border dark:border-gray-700 flex items-center justify-center p-3 transform ${item.rotate} transition-all duration-300 hover:scale-105 ${item.zIndex}`}
              >
                <img 
                  alt={item.name} 
                  className="w-full h-full object-contain rounded-xl" 
                  src={item.image}
                />
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] bg-black/50 text-white px-2 py-0.5 rounded-full">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Fitting Button */}
        <div className="w-full px-4 mt-6 mb-4">
          <button className="w-full h-14 rounded-2xl bg-gradient-to-r from-orange-300 via-pink-400 to-purple-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-rounded">checkroom</span>
            피팅하기
          </button>
        </div>
      </main>

      {/* Bottom Navigation */}
      <div className="h-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 flex items-center justify-around pb-2 z-50 safe-area-pb">
        <button 
          onClick={() => navigate('/main')}
          className="flex flex-col items-center justify-center w-16 h-full text-gray-400 hover:text-primary transition-colors gap-1"
        >
          <span className="material-symbols-rounded text-2xl">home</span>
          <span className="text-[10px] font-medium">홈</span>
        </button>
        
        <div className="relative -top-5">
          <button 
            onClick={() => navigate('/register')}
            className="w-16 h-16 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform border-4 border-white dark:border-gray-900"
          >
            <span className="material-symbols-rounded text-4xl">add</span>
          </button>
        </div>
        
        <button className="flex flex-col items-center justify-center w-16 h-full text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors gap-1">
          <span className="material-symbols-rounded text-2xl">grid_view</span>
          <span className="text-[10px] font-medium">SNS</span>
        </button>
      </div>
    </div>
  );
};

export default FittingPage;