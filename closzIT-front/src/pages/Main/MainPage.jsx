import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import OutfitRecommender from './OutfitRecommender';

// 카테고리 데이터
const categories = [
  { id: 'outerwear', name: '외투', icon: 'diversity_1' },
  { id: 'tops', name: '상의', icon: 'checkroom' },
  { id: 'bottoms', name: '하의', icon: 'straighten' },
  { id: 'shoes', name: '신발', icon: 'steps' },
];

const MainPage = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('tops');
  const [currentClothIndex, setCurrentClothIndex] = useState(0);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [userName, setUserName] = useState('');
  const [userClothes, setUserClothes] = useState({
    outerwear: [],
    tops: [],
    bottoms: [],
    shoes: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // 선택된 코디 (각 카테고리별 선택된 옷)
  const [selectedOutfit, setSelectedOutfit] = useState({
    outerwear: null,
    tops: null,
    bottoms: null,
    shoes: null,
  });

  // API에서 유저 정보 불러오기
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
          setUserName(userData.name || '');
        } else if (response.status === 401) {
          // 토큰 만료 시 로그인 페이지로
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

  const currentCategoryData = categories.find(c => c.id === activeCategory);
  const currentClothes = userClothes[activeCategory] || [];

  // 스크롤 컨테이너 ref
  const scrollContainerRef = useRef(null);
  const CARD_WIDTH = 168; // w-36 (144px) + gap-6 (24px)

  // 카테고리 이전/다음 핸들러
  const currentCategoryIndex = categories.findIndex(c => c.id === activeCategory);

  const handlePrevCategory = () => {
    if (currentCategoryIndex > 0) {
      setActiveCategory(categories[currentCategoryIndex - 1].id);
      setCurrentClothIndex(0);
    }
  };

  const handleNextCategory = () => {
    if (currentCategoryIndex < categories.length - 1) {
      setActiveCategory(categories[currentCategoryIndex + 1].id);
      setCurrentClothIndex(0);
    }
  };

  // 옷 선택 핸들러 (해당 카테고리의 선택 박스에 등록)
  const handleSelectCloth = (cloth) => {
    setSelectedOutfit(prev => ({
      ...prev,
      [activeCategory]: cloth,
    }));
  };

  // 선택 해제
  const handleDeselectCloth = (categoryId) => {
    setSelectedOutfit(prev => ({
      ...prev,
      [categoryId]: null,
    }));
  };

  // 옷 넘기기
  const handlePrevCloth = () => {
    if (currentClothIndex > 0) {
      setCurrentClothIndex(currentClothIndex - 1);
    }
  };

  const handleNextCloth = () => {
    if (currentClothIndex < currentClothes.length - 1) {
      setCurrentClothIndex(currentClothIndex + 1);
    }
  };

  // 스와이프 제스처
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNextCloth();
    } else if (isRightSwipe) {
      handlePrevCloth();
    }
  };

  // 모든 카테고리가 선택되었는지 확인
  const isAllSelected = Object.values(selectedOutfit).every(item => item !== null);

  // 스크롤 시 현재 인덱스 업데이트 (중앙에 가장 가까운 아이템 감지)
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const containerCenter = container.scrollLeft + (container.offsetWidth / 2);

    // 각 아이템의 중심 위치를 계산하여 가장 가까운 아이템 찾기
    let closestIndex = 0;
    let minDistance = Infinity;

    const items = container.querySelectorAll('[data-cloth-index]');
    items.forEach((item) => {
      const idx = parseInt(item.getAttribute('data-cloth-index'));
      const itemCenter = item.offsetLeft + (item.offsetWidth / 2);
      const distance = Math.abs(containerCenter - itemCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = idx;
      }
    });

    if (closestIndex !== currentClothIndex) {
      setCurrentClothIndex(closestIndex);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans flex flex-col">

      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between gap-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-40">
        {isSearchExpanded ? (
          <button
            onClick={() => setIsSearchExpanded(false)}
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-rounded text-2xl text-gray-700 dark:text-gray-200">arrow_back</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">closzIT</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-rounded text-2xl text-gray-700 dark:text-gray-200">
              {isSearchExpanded ? 'close' : 'auto_awesome'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24 px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

        {isSearchExpanded ? (
          <div className="animate-slideDown">
            <OutfitRecommender />
          </div>
        ) : (
          <div className="animate-fadeIn">
            {/* Greeting */}
            {userName && (
              <div className="text-center mt-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  반가워요, <span className="text-primary">{userName}</span>님! 👋
                </h1>
              </div>
            )}

            {/* Category Title with arrows */}
            <div className="flex items-center justify-center space-x-8 mt-4 mb-4">
              <button
                onClick={handlePrevCategory}
                disabled={currentCategoryIndex === 0}
                className={`p-2 transition-colors ${currentCategoryIndex === 0 ? 'text-gray-200 dark:text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}
              >
                <span className="material-symbols-rounded text-3xl">chevron_left</span>
              </button>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-wide min-w-[120px] text-center">
                {currentCategoryData?.name}
              </h2>
              <button
                onClick={handleNextCategory}
                disabled={currentCategoryIndex === categories.length - 1}
                className={`p-2 transition-colors ${currentCategoryIndex === categories.length - 1 ? 'text-gray-200 dark:text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}
              >
                <span className="material-symbols-rounded text-3xl">chevron_right</span>
              </button>
            </div>

            {/* Closet Rail with Hanging Clothes */}
            <div className="relative mb-6">
              {/* The Rail */}
              <div className="absolute top-4 left-0 right-0 h-2 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 dark:from-gray-600 dark:via-gray-500 dark:to-gray-600 rounded-full shadow-md z-0"></div>

              {/* Horizontal Scroll Container */}
              <div
                ref={scrollContainerRef}
                className="flex gap-6 overflow-x-auto pt-0 pb-4 hide-scrollbar scroll-smooth"
                style={{ scrollSnapType: 'x mandatory' }}
                onScroll={handleScroll}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                {/* Left Spacer for centering first item */}
                <div className="flex-shrink-0" style={{ width: 'calc(50vw - 84px)' }}></div>

                {currentClothes.map((cloth, idx) => (
                  <div
                    key={`${cloth.id}-${idx === currentClothIndex ? 'active' : 'inactive'}`}
                    data-cloth-index={idx}
                    onClick={() => handleSelectCloth(cloth)}
                    className={`flex-shrink-0 cursor-pointer transition-all duration-300 ${idx === currentClothIndex ? 'scale-105 animate-swing' : 'scale-95 opacity-70 hover:opacity-100'
                      }`}
                    style={{ scrollSnapAlign: 'center', transformOrigin: 'top center' }}
                  >
                    {/* Hook */}
                    <div className="flex justify-center relative z-10">
                      <div className={`w-6 h-8 border-4 rounded-t-full border-b-0 bg-transparent transition-colors ${idx === currentClothIndex
                          ? 'border-primary'
                          : 'border-gray-400 dark:border-gray-500'
                        }`}></div>
                    </div>

                    {/* Clothes Card */}
                    <div className={`w-36 h-44 bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border-2 transition-all ${idx === currentClothIndex
                        ? 'border-primary shadow-xl ring-2 ring-primary/30'
                        : 'border-gray-200 dark:border-gray-700'
                      }`}>
                      <img
                        alt={cloth.name}
                        className="w-full h-full object-cover"
                        src={cloth.image}
                      />
                    </div>
                  </div>
                ))}

                {/* Right Spacer for centering last item */}
                <div className="flex-shrink-0" style={{ width: 'calc(50vw - 84px)' }}></div>

                {/* Empty State - Full width centered */}
                {currentClothes.length === 0 && (
                  <div className="flex-shrink-0 w-full flex justify-center">
                    <div 
                      onClick={() => navigate('/register')}
                      className="w-44 cursor-pointer group"
                    >
                      <div className="flex justify-center">
                        <div className="w-6 h-8 border-4 border-gray-300 dark:border-gray-600 rounded-t-full border-b-0 group-hover:border-primary transition-colors"></div>
                      </div>
                      <div className="w-44 h-52 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 group-hover:border-primary group-hover:bg-primary/5 transition-all">
                        <span className="material-symbols-rounded text-5xl text-gray-400 dark:text-gray-500 group-hover:text-primary transition-colors">add_circle</span>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 group-hover:text-primary transition-colors">옷장이 비어있어요</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">탭하여 옷 등록하기</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Selection Boxes - 4 category boxes */}
            <div className="grid grid-cols-4 gap-3 px-2 mb-6">
              {categories.map((category) => {
                const selected = selectedOutfit[category.id];
                const isActive = activeCategory === category.id;

                return (
                  <div key={category.id} className="flex flex-col items-center">
                    <span className={`text-xs font-semibold mb-2 ${isActive ? 'text-primary' : 'text-gray-500'}`}>
                      {category.name}
                    </span>
                    <div
                      onClick={() => {
                        if (selected) {
                          handleDeselectCloth(category.id);
                        } else {
                          setActiveCategory(category.id);
                          setCurrentClothIndex(0);
                        }
                      }}
                      className={`w-full aspect-square rounded-xl overflow-hidden cursor-pointer transition-all ${isActive
                          ? 'ring-2 ring-primary shadow-lg'
                          : 'ring-2 ring-gray-200 dark:ring-gray-700'
                        } ${selected ? 'bg-white' : 'bg-gray-100 dark:bg-gray-800'}`}
                    >
                      {selected ? (
                        <div className="relative w-full h-full">
                          <img
                            src={selected.image}
                            alt={selected.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="material-symbols-rounded text-white text-xs">close</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-rounded text-3xl text-gray-400">
                            {category.icon}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Generate Button */}
            <div className="px-2 mb-4">
              <button
                disabled={!isAllSelected}
                className={`w-full h-14 rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${isAllSelected
                    ? 'bg-gradient-to-r from-orange-300 via-pink-400 to-purple-500 text-white hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }`}
              >
                <span className="material-symbols-rounded">auto_awesome</span>
                {isAllSelected ? '코디 생성하기' : '모든 카테고리를 선택해주세요'}
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 flex items-center justify-around pb-2 z-50 safe-area-pb">
        <button className="flex flex-col items-center justify-center w-16 h-full text-primary transition-colors gap-1">
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

export default MainPage;
