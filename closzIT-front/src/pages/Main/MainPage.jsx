import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import OutfitRecommender from './OutfitRecommender';
import SharedHeader from '../../components/SharedHeader';
import { useVto } from '../../context/VtoContext';

// 카테고리 데이터
const categories = [
  { id: 'outerwear', name: '외투' },
  { id: 'tops', name: '상의' },
  { id: 'bottoms', name: '하의' },
  { id: 'shoes', name: '신발' },
];

const MainPage = () => {
  const navigate = useNavigate();
  const { requestPartialVtoByIds, checkPartialVtoLoading } = useVto();
  const isPartialVtoLoading = checkPartialVtoLoading('main');

  const [activeCategory, setActiveCategory] = useState('outerwear');
  const [currentClothIndex, setCurrentClothIndex] = useState(0);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [userName, setUserName] = useState('');
  const [userCredit, setUserCredit] = useState(0);
  const [userFullBodyImage, setUserFullBodyImage] = useState(null);
  const [vtoResultImage, setVtoResultImage] = useState(null); // VTO 결과 이미지
  const [userClothes, setUserClothes] = useState({
    outerwear: [],
    tops: [],
    bottoms: [],
    shoes: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showGreeting, setShowGreeting] = useState(true);
  const [selectedClothDetail, setSelectedClothDetail] = useState(null); // 상세정보 모달용
  const [selectedKeywords, setSelectedKeywords] = useState([]); // 키워드 검색용

  const [selectedOutfit, setSelectedOutfit] = useState({
    outerwear: null,
    tops: null,
    bottoms: null,
    shoes: null,
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          navigate('/login');
          return;
        }

        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

        const userResponse = await fetch(`${backendUrl}/user/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserName(userData.name || '');
          setUserCredit(userData.credit || 0);
          setUserFullBodyImage(userData.fullBodyImage || null);
        } else if (userResponse.status === 401) {
          localStorage.removeItem('accessToken');
          navigate('/login');
          return;
        }

        const itemsResponse = await fetch(`${backendUrl}/items/by-category`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (itemsResponse.ok) {
          const itemsData = await itemsResponse.json();
          setUserClothes(itemsData);

          // 🔥 백그라운드로 캐시 Warm-up 실행 (로그인 후 첫 요청부터 빠르게!)
          fetch(`${backendUrl}/vton-cache/warmup`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
            .then(res => res.json())
            .then(data => {
              console.log('✅ Cache warmup completed:', data);
            })
            .catch(err => {
              console.warn('⚠️ Cache warmup failed (non-critical):', err);
            });
        }

      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  useEffect(() => {
    if (userName && showGreeting) {
      const timer = setTimeout(() => {
        setShowGreeting(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [userName, showGreeting]);

  // 메인페이지에서 직접 피팅 요청 (페이지 이동 없이)
  const handleDirectFitting = async (event) => {
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
      // 의류 ID만 추출하여 백엔드에 전송 (CORS 문제 우회)
      const clothingIds = {
        outerId: selectedOutfit.outerwear?.id || undefined,
        topId: selectedOutfit.tops?.id || undefined,
        bottomId: selectedOutfit.bottoms?.id || undefined,
        shoesId: selectedOutfit.shoes?.id || undefined,
      };

      // VtoContext의 requestPartialVtoByIds 호출 (크레딧 모달 + 애니메이션)
      requestPartialVtoByIds(clothingIds, buttonPosition, 'main');

    } catch (err) {
      console.error('Fitting setup error:', err);
      alert('피팅 요청 준비 중 오류가 발생했습니다: ' + err.message);
    }
  };


  const currentCategoryData = categories.find(c => c.id === activeCategory);

  const allClothes = [
    ...(userClothes.outerwear || []).map(c => ({ ...c, category: 'outerwear' })),
    ...(userClothes.tops || []).map(c => ({ ...c, category: 'tops' })),
    ...(userClothes.bottoms || []).map(c => ({ ...c, category: 'bottoms' })),
    ...(userClothes.shoes || []).map(c => ({ ...c, category: 'shoes' })),
  ];

  const getCategoryStartIndex = (categoryId) => {
    if (categoryId === 'outerwear') return 0;
    if (categoryId === 'tops') return (userClothes.outerwear || []).length;
    if (categoryId === 'bottoms') return (userClothes.outerwear || []).length + (userClothes.tops || []).length;
    if (categoryId === 'shoes') return (userClothes.outerwear || []).length + (userClothes.tops || []).length + (userClothes.bottoms || []).length;
    return 0;
  };

  const handleCategoryClick = (categoryId) => {
    setActiveCategory(categoryId);
    const startIndex = getCategoryStartIndex(categoryId);
    setCurrentClothIndex(startIndex);

    if (scrollContainerRef.current) {
      // 실제 해당 인덱스의 DOM 요소를 찾아서 스크롤
      const container = scrollContainerRef.current;
      const targetCard = container.querySelector(`[data-cloth-index="${startIndex}"]`);

      if (targetCard) {
        const containerCenter = container.offsetWidth / 2;
        const targetCenter = targetCard.offsetLeft + (targetCard.offsetWidth / 2);
        const scrollPosition = targetCenter - containerCenter;

        container.scrollTo({
          left: Math.max(0, scrollPosition),
          behavior: 'smooth'
        });
      }
    }
  };

  const scrollContainerRef = useRef(null);
  const CARD_WIDTH = 136; // w-28 (112px) + gap-6 (24px)

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

  const handleSelectCloth = (cloth) => {
    setSelectedOutfit(prev => ({
      ...prev,
      [activeCategory]: cloth,
    }));
  };

  const handleDeselectCloth = (categoryId) => {
    setSelectedOutfit(prev => ({
      ...prev,
      [categoryId]: null,
    }));
  };

  const handlePrevCloth = () => {
    if (currentClothIndex > 0) {
      setCurrentClothIndex(currentClothIndex - 1);
    }
  };

  const handleNextCloth = () => {
    if (currentClothIndex < allClothes.length - 1) {
      setCurrentClothIndex(currentClothIndex + 1);
    }
  };

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

  const isAllSelected = Object.values(selectedOutfit).every(item => item !== null);
  const hasAnySelected = Object.values(selectedOutfit).some(item => item !== null);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const containerCenter = container.scrollLeft + (container.offsetWidth / 2);

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

      const cloth = allClothes[closestIndex];
      if (cloth && cloth.category !== activeCategory) {
        setActiveCategory(cloth.category);
      }
    }
  };

  // CSS Keyframes for character wobble animation
  const wobbleKeyframes = `
    @keyframes wobble {
      0%, 100% { transform: rotate(-3deg); }
      50% { transform: rotate(3deg); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(-2deg); }
      25% { transform: translateY(-4px) rotate(0deg); }
      50% { transform: translateY(0px) rotate(2deg); }
      75% { transform: translateY(-2px) rotate(0deg); }
    }
    @keyframes bounce-subtle {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
  `;

  return (
    <div className="bg-cream dark:bg-[#1A1918] min-h-screen font-sans flex flex-col">
      {/* Inject keyframes */}
      <style>{wobbleKeyframes}</style>

      {/* Shared Header */}
      <SharedHeader />

      {/* Search Block - Below Header */}
      <div className="px-4 py-3 bg-cream dark:bg-[#1A1918]">
        {isSearchExpanded && (
          <button
            onClick={() => setIsSearchExpanded(false)}
            className="w-10 h-10 mb-2 -ml-2 rounded-full flex items-center justify-center hover:bg-gold-light/20 transition-colors"
          >
            <span className="material-symbols-rounded text-2xl text-charcoal dark:text-cream">arrow_back</span>
          </button>
        )}

        <div
          onClick={() => !isSearchExpanded && setIsSearchExpanded(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl cursor-pointer transition-all duration-300 min-h-[44px] ${isSearchExpanded
            ? 'bg-gold/10 border-2 border-gold shadow-glow-gold'
            : 'bg-cream-dark dark:bg-charcoal/50 hover:bg-gold-light/30 border border-gold-light/30'
            }`}
        >
          {/* 선택된 키워드 칩 */}
          {isSearchExpanded && selectedKeywords.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 flex-1">
              {selectedKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-gold/20 text-gold text-xs font-semibold rounded-full border border-gold/30"
                >
                  {keyword}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedKeywords(selectedKeywords.filter(k => k !== keyword));
                    }}
                    className="w-3.5 h-3.5 flex items-center justify-center hover:bg-white/20 rounded-full"
                  >
                    <span className="material-symbols-rounded text-xs">close</span>
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="relative flex-1 h-5 overflow-hidden">
              <span
                className={`absolute inset-0 text-sm text-charcoal-light dark:text-cream-dark transition-all duration-500 ease-in-out ${showGreeting && userName
                  ? 'translate-y-0 opacity-100'
                  : '-translate-y-full opacity-0'
                  }`}
              >
                반가워요, <span className="text-gold font-semibold">{userName}</span>님!
              </span>
              <span
                className={`absolute inset-0 text-sm transition-all duration-500 ease-in-out ${showGreeting && userName
                  ? 'translate-y-full opacity-0'
                  : 'translate-y-0 opacity-100'
                  } ${isSearchExpanded ? 'text-gold font-semibold' : 'text-charcoal-light dark:text-cream-dark'}`}
              >
                {isSearchExpanded
                  ? '오늘 어떤 스타일을 추천해드릴까요?'
                  : <>오늘 뭐 입지? <span className="text-gold font-semibold">AI에게 추천받기</span></>
                }
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24 px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

        {isSearchExpanded ? (
          <div className="animate-slideDown">
            <OutfitRecommender
              selectedKeywords={selectedKeywords}
              onKeywordsChange={setSelectedKeywords}
            />
          </div>
        ) : (
          <div className="animate-fadeIn">

            {/* Category Pill Buttons - More spacing */}
            <div className="flex items-center gap-4 overflow-x-auto hide-scrollbar py-3 px-1 mt-2 mb-4">
              {categories.map((category, index) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 animate-reveal animate-reveal-${index + 1} ${activeCategory === category.id
                    ? 'bg-charcoal dark:bg-cream text-cream dark:text-charcoal shadow-soft'
                    : 'bg-cream-dark dark:bg-charcoal/50 text-charcoal-light dark:text-cream-dark hover:bg-gold-light/30 border border-transparent hover:border-gold-light/50'
                    }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* ========== Closet Rail with Wardrobe Background ========== */}
            <div className="relative mb-6 animate-reveal animate-reveal-2">

              {/* Wardrobe Background Container */}
              <div
                className="absolute inset-0 -top-2 -bottom-4 -left-4 -right-4 rounded-3xl overflow-hidden z-0"
                style={{
                  background: 'linear-gradient(180deg, rgba(250, 248, 245, 0.95) 0%, rgba(255, 255, 255, 0.98) 100%)',
                }}
              >
                <img
                  src="/assets/wardrobe-background.png"
                  alt="wardrobe background"
                  className="max-w-[300px] max-h-[200px] object-contain opacity-40 mx-auto mt-4"
                  style={{ mixBlendMode: 'multiply' }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(180deg, transparent 0%, rgba(250, 248, 245, 0.3) 50%, rgba(250, 248, 245, 0.6) 100%)',
                  }}
                />
              </div>

              {/* ========== The Rail - Modern & Minimal Gold ========== */}
              <div className="absolute top-4 left-0 right-0 z-10">
                {/* Simple Clean Rail */}
                <div
                  className="h-[6px] rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #C9A962 0%, #D4AF37 50%, #C9A962 100%)',
                    boxShadow: '0 2px 8px rgba(201, 169, 98, 0.25)',
                  }}
                />
              </div>

              {/* Horizontal Scroll Container */}
              <div
                ref={scrollContainerRef}
                className="relative z-20 flex gap-6 overflow-x-auto pt-1 pb-4 hide-scrollbar scroll-smooth"
                style={{ scrollSnapType: 'x mandatory' }}
                onScroll={handleScroll}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                <div className="flex-shrink-0" style={{ width: 'calc(50vw - 64px)' }}></div>

                {allClothes.map((cloth, idx) => {
                  // 이전 아이템과 카테고리가 다르면 구분선 추가
                  const prevCloth = idx > 0 ? allClothes[idx - 1] : null;
                  const showCategorySpacer = prevCloth && prevCloth.category !== cloth.category;

                  return (
                    <React.Fragment key={`${cloth.id}-${idx}`}>
                      {/* 카테고리 구분 Spacer */}
                      {showCategorySpacer && (
                        <div className="flex-shrink-0 w-6 flex items-center justify-center">
                          <div className="w-[2px] h-20 bg-gradient-to-b from-transparent via-gold-light/40 to-transparent rounded-full"></div>
                        </div>
                      )}

                      <div
                        data-cloth-index={idx}
                        onClick={() => handleSelectCloth(cloth)}
                        className={`flex-shrink-0 cursor-pointer transition-all duration-300 ${idx === currentClothIndex ? 'scale-105 animate-swing' : 'scale-95 opacity-60 hover:opacity-90'
                          }`}
                        style={{ scrollSnapAlign: 'center', transformOrigin: 'top center' }}
                      >
                        {/* ========== Hook - Modern Minimal Style ========== */}
                        <div className="flex justify-center relative z-30">
                          <div className="relative w-16 h-10 -mb-2">
                            {/* Simple Hook Circle */}
                            <div
                              className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full"
                              style={{
                                background: 'linear-gradient(135deg, #D4AF37 0%, #C9A962 100%)',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
                              }}
                            />
                            {/* Simple Vertical Line */}
                            <div
                              className="absolute top-3.5 left-1/2 -translate-x-1/2 w-[2px] h-6"
                              style={{
                                background: 'linear-gradient(180deg, #D4AF37 0%, #C9A962 100%)',
                              }}
                            />
                          </div>
                        </div>

                        {/* Clothes Card - Smaller size with hover overlay */}
                        <div className={`w-28 h-36 bg-warm-white dark:bg-charcoal rounded-xl overflow-hidden border-2 transition-all duration-300 relative z-40 group/card ${idx === currentClothIndex
                          ? 'border-gold shadow-lifted ring-2 ring-gold/20'
                          : 'border-gold-light/30 dark:border-charcoal-light/30 shadow-soft'
                          }`}>
                          <img
                            alt={cloth.name}
                            className="w-full h-full object-cover"
                            src={cloth.image}
                          />
                          {/* Hover Overlay with Detail Icon Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedClothDetail(cloth);
                            }}
                            className="absolute bottom-1.5 right-1.5 w-7 h-7 bg-white/90 dark:bg-charcoal/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/card:opacity-100 transition-all duration-200 hover:scale-110 hover:bg-white dark:hover:bg-charcoal"
                          >
                            <span className="material-symbols-rounded text-gold text-base">info</span>
                          </button>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}

                <div className="flex-shrink-0" style={{ width: 'calc(50vw - 64px)' }}></div>

                {/* Empty State */}
                {allClothes.length === 0 && (
                  <div className="flex-shrink-0 w-full flex justify-center">
                    <div
                      onClick={() => navigate('/register')}
                      className="w-44 cursor-pointer group"
                    >
                      <div className="flex justify-center">
                        <div className="relative w-6 h-8">
                          <div
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
                            style={{
                              background: 'linear-gradient(135deg, #D4AF37 0%, #C9A962 100%)',
                            }}
                          />
                          <div
                            className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[2px] h-5"
                            style={{
                              background: 'linear-gradient(180deg, #D4AF37 0%, #C9A962 100%)',
                            }}
                          />
                        </div>
                      </div>
                      <div className="w-44 h-52 bg-gradient-to-br from-cream-dark to-cream dark:from-charcoal dark:to-charcoal-light/20 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gold-light/50 dark:border-charcoal-light/30 group-hover:border-gold group-hover:bg-gold/5 transition-all">
                        <span className="material-symbols-rounded text-5xl text-gold-light dark:text-charcoal-light group-hover:text-gold transition-colors">add_circle</span>
                        <p className="text-sm font-medium text-charcoal-light dark:text-cream-dark mt-2 group-hover:text-gold transition-colors">옷장이 비어있어요</p>
                        <p className="text-xs text-charcoal-light/60 dark:text-cream-dark/60 mt-1">탭하여 옷 등록하기</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ========== Selected Outfit Area ========== */}
            <div className="relative mt-4 mb-6 animate-reveal animate-reveal-3">
              <div
                className="rounded-2xl p-3 flex flex-col"
                style={{
                  background: 'linear-gradient(180deg, rgba(250, 248, 245, 0.8) 0%, rgba(255, 255, 255, 0.95) 100%)',
                  border: '1px solid rgba(212, 175, 55, 0.15)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                }}
              >
                {/* 선택된 옷이 하나라도 있으면 러프하게 던져진 의류, 아니면 캐릭터 */}
                {Object.values(selectedOutfit).some(item => item !== null) ? (
                  <>
                    {/* 가로로 펼쳐진 의류 - 카드처럼 */}
                    <div className="flex justify-center items-end flex-1 py-4 -space-x-4">
                      {/* 외투 */}
                      {selectedOutfit.outerwear && (
                        <div
                          className="w-20 cursor-pointer group z-10"
                          onClick={() => handleDeselectCloth('outerwear')}
                          style={{ transform: 'rotate(-6deg) translateY(-8px)' }}
                        >
                          <div className="relative bg-warm-white dark:bg-charcoal/50 rounded-xl shadow-lifted overflow-hidden border-2 border-gold/30 transition-all group-hover:scale-110 group-hover:shadow-xl group-hover:z-50">
                            <img
                              src={selectedOutfit.outerwear.image || selectedOutfit.outerwear.imageUrl}
                              alt=""
                              className="w-full aspect-square object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="material-symbols-rounded text-white text-lg">close</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 상의 */}
                      {selectedOutfit.tops && (
                        <div
                          className="w-20 cursor-pointer group z-20"
                          onClick={() => handleDeselectCloth('tops')}
                          style={{ transform: 'rotate(-2deg) translateY(-4px)' }}
                        >
                          <div className="relative bg-warm-white dark:bg-charcoal/50 rounded-xl shadow-lifted overflow-hidden border-2 border-gold/30 transition-all group-hover:scale-110 group-hover:shadow-xl group-hover:z-50">
                            <img
                              src={selectedOutfit.tops.image || selectedOutfit.tops.imageUrl}
                              alt=""
                              className="w-full aspect-square object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="material-symbols-rounded text-white text-lg">close</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 하의 */}
                      {selectedOutfit.bottoms && (
                        <div
                          className="w-20 cursor-pointer group z-30"
                          onClick={() => handleDeselectCloth('bottoms')}
                          style={{ transform: 'rotate(3deg) translateY(-6px)' }}
                        >
                          <div className="relative bg-warm-white dark:bg-charcoal/50 rounded-xl shadow-lifted overflow-hidden border-2 border-gold/30 transition-all group-hover:scale-110 group-hover:shadow-xl group-hover:z-50">
                            <img
                              src={selectedOutfit.bottoms.image || selectedOutfit.bottoms.imageUrl}
                              alt=""
                              className="w-full aspect-square object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="material-symbols-rounded text-white text-lg">close</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 신발 */}
                      {selectedOutfit.shoes && (
                        <div
                          className="w-20 cursor-pointer group z-40"
                          onClick={() => handleDeselectCloth('shoes')}
                          style={{ transform: 'rotate(7deg) translateY(-10px)' }}
                        >
                          <div className="relative bg-warm-white dark:bg-charcoal/50 rounded-xl shadow-lifted overflow-hidden border-2 border-gold/30 transition-all group-hover:scale-110 group-hover:shadow-xl group-hover:z-50">
                            <img
                              src={selectedOutfit.shoes.image || selectedOutfit.shoes.imageUrl}
                              alt=""
                              className="w-full aspect-square object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="material-symbols-rounded text-white text-lg">close</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 피팅하기 버튼 - 모두 선택했을 때만 표시 */}
                    {hasAnySelected && (
                      <button
                        onClick={(e) => {
                          if (!isPartialVtoLoading) {
                            handleDirectFitting(e);
                          }
                        }}
                        disabled={isPartialVtoLoading}
                        className={`mt-3 w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all animate-fadeIn ${isPartialVtoLoading
                          ? 'bg-gold-light/50 text-charcoal cursor-wait'
                          : 'btn-premium hover:shadow-xl'
                          }`}
                      >
                        {isPartialVtoLoading ? (
                          <>
                            <span className="material-symbols-rounded text-lg animate-spin">progress_activity</span>
                            생성 중...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-rounded text-lg">checkroom</span>
                            입어보기
                          </>
                        )}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {/* 캐릭터 이미지 - 아무것도 선택 안했을 때 */}
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <div
                        className="w-28 h-28 mb-3 flex items-center justify-center"
                        style={{
                          animation: 'float 3s ease-in-out infinite',
                          transformOrigin: 'center bottom',
                        }}
                      >
                        <img
                          src="/assets/stylist-character.png"
                          alt="AI Stylist Character"
                          className="w-full h-full object-contain drop-shadow-lg"
                          style={{
                            filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))',
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        {/* Fallback Character */}
                        <div
                          className="hidden w-24 h-24 rounded-full items-center justify-center"
                          style={{
                            background: 'linear-gradient(135deg, #FFE4B5 0%, #DEB887 100%)',
                            boxShadow: '0 4px 12px rgba(222, 184, 135, 0.3)',
                            animation: 'wobble 2s ease-in-out infinite',
                          }}
                        >
                          <span className="material-symbols-rounded text-4xl text-amber-700">face</span>
                        </div>
                      </div>
                      <p className="text-center text-charcoal dark:text-cream text-sm font-medium">
                        오늘 입고 싶은 옷을 골라보세요 ✨
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-16 glass-warm border-t border-gold-light/20 flex items-center justify-around px-4 z-50 safe-area-pb">

        <button className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] text-gold">
          <span className="material-symbols-rounded text-[22px]">checkroom</span>
          <span className="text-[10px] font-semibold">내 옷장</span>
        </button>

        <button
          onClick={() => navigate('/register')}
          className="flex items-center gap-2 px-5 py-2.5 btn-premium rounded-full"
        >
          <span className="material-symbols-rounded text-lg">add</span>
          <span className="text-sm font-semibold">의류 등록</span>
        </button>

        <button
          onClick={() => navigate('/feed')}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] text-charcoal-light dark:text-cream-dark hover:text-gold transition-colors"
        >
          <span className="material-symbols-rounded text-[22px]">grid_view</span>
          <span className="text-[10px] font-semibold">SNS</span>
        </button>

      </div>

      {/* ========== Cloth Detail Modal ========== */}
      {selectedClothDetail && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedClothDetail(null)}
        >
          <div
            className="bg-warm-white dark:bg-charcoal rounded-3xl shadow-2xl max-w-sm w-full max-h-[80vh] overflow-hidden animate-slideDown"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="relative">
              <img
                src={selectedClothDetail.image}
                alt={selectedClothDetail.name}
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button
                onClick={() => setSelectedClothDetail(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/40 transition-colors"
              >
                <span className="material-symbols-rounded text-white text-lg">close</span>
              </button>
              <div className="absolute bottom-3 left-4 right-4">
                <h3 className="text-white text-lg font-bold">{selectedClothDetail.name || '의류'}</h3>
              </div>
            </div>

            {/* Modal Content - Labeling Info */}
            <div className="p-5 space-y-4 max-h-[40vh] overflow-y-auto">
              <h4 className="text-sm font-bold text-charcoal dark:text-cream flex items-center gap-2">
                <span className="material-symbols-rounded text-gold text-lg">label</span>
                라벨링 정보
              </h4>

              <div className="grid grid-cols-2 gap-3">
                {/* Category */}
                <div className="bg-cream-dark dark:bg-charcoal-light/20 rounded-xl p-3">
                  <p className="text-[10px] text-charcoal-light dark:text-cream-dark uppercase font-semibold mb-1">카테고리</p>
                  <p className="text-sm font-medium text-charcoal dark:text-cream">
                    {selectedClothDetail.category === 'Outer' && '외투'}
                    {selectedClothDetail.category === 'Top' && '상의'}
                    {selectedClothDetail.category === 'Bottom' && '하의'}
                    {selectedClothDetail.category === 'Shoes' && '신발'}
                    {selectedClothDetail.subCategory && ` (${selectedClothDetail.subCategory})`}
                  </p>
                </div>

                {/* Colors */}
                <div className="bg-cream-dark dark:bg-charcoal-light/20 rounded-xl p-3">
                  <p className="text-[10px] text-charcoal-light dark:text-cream-dark uppercase font-semibold mb-1">색상</p>
                  <p className="text-sm font-medium text-charcoal dark:text-cream">
                    {selectedClothDetail.colors?.length > 0 ? selectedClothDetail.colors.join(', ') : '-'}
                  </p>
                </div>

                {/* Patterns */}
                <div className="bg-cream-dark dark:bg-charcoal-light/20 rounded-xl p-3">
                  <p className="text-[10px] text-charcoal-light dark:text-cream-dark uppercase font-semibold mb-1">패턴</p>
                  <p className="text-sm font-medium text-charcoal dark:text-cream">
                    {selectedClothDetail.patterns?.length > 0 ? selectedClothDetail.patterns.join(', ') : '-'}
                  </p>
                </div>

                {/* Details (Material) */}
                <div className="bg-cream-dark dark:bg-charcoal-light/20 rounded-xl p-3">
                  <p className="text-[10px] text-charcoal-light dark:text-cream-dark uppercase font-semibold mb-1">디테일</p>
                  <p className="text-sm font-medium text-charcoal dark:text-cream">
                    {selectedClothDetail.details?.length > 0 ? selectedClothDetail.details.join(', ') : '-'}
                  </p>
                </div>

                {/* Style Moods */}
                <div className="bg-cream-dark dark:bg-charcoal-light/20 rounded-xl p-3">
                  <p className="text-[10px] text-charcoal-light dark:text-cream-dark uppercase font-semibold mb-1">스타일</p>
                  <p className="text-sm font-medium text-charcoal dark:text-cream">
                    {selectedClothDetail.styleMoods?.length > 0 ? selectedClothDetail.styleMoods.join(', ') : '-'}
                  </p>
                </div>

                {/* Seasons */}
                <div className="bg-cream-dark dark:bg-charcoal-light/20 rounded-xl p-3">
                  <p className="text-[10px] text-charcoal-light dark:text-cream-dark uppercase font-semibold mb-1">시즌</p>
                  <p className="text-sm font-medium text-charcoal dark:text-cream">
                    {selectedClothDetail.seasons?.length > 0 ? selectedClothDetail.seasons.join(', ') : '-'}
                  </p>
                </div>
              </div>

              {/* TPO Tags */}
              {selectedClothDetail.tpos && selectedClothDetail.tpos.length > 0 && (
                <div>
                  <p className="text-[10px] text-charcoal-light dark:text-cream-dark uppercase font-semibold mb-2">TPO</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedClothDetail.tpos.map((t, i) => (
                      <span key={i} className="px-3 py-1 bg-gold/10 text-gold text-xs font-medium rounded-full border border-gold/20">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Note */}
              {selectedClothDetail.note && (
                <div className="bg-cream-dark dark:bg-charcoal-light/20 rounded-xl p-3">
                  <p className="text-[10px] text-charcoal-light dark:text-cream-dark uppercase font-semibold mb-1">메모</p>
                  <p className="text-sm font-medium text-charcoal dark:text-cream">{selectedClothDetail.note}</p>
                </div>
              )}

              {/* Wear Count */}
              {selectedClothDetail.wearCount > 0 && (
                <div className="bg-cream-dark dark:bg-charcoal-light/20 rounded-xl p-3">
                  <p className="text-[10px] text-charcoal-light dark:text-cream-dark uppercase font-semibold mb-1">착용 횟수</p>
                  <p className="text-sm font-medium text-charcoal dark:text-cream">{selectedClothDetail.wearCount}회</p>
                </div>
              )}
            </div>

            {/* Modal Footer - 하나만 입어보기 / 수정/삭제 버튼 */}
            <div className="p-4 border-t border-gold-light/20 space-y-2">
              {/* 하나만 입어보기 버튼 (IDM-VTON) */}
              <button
                onClick={async () => {
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
                    setSelectedClothDetail(null); // 모달 닫기

                    const token = localStorage.getItem('accessToken');
                    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

                    console.log(`[VTO] Starting try-on for clothing: ${selectedClothDetail.id}, category: ${selectedClothDetail.category}`);

                    // 로딩 표시
                    alert('단일 옷 가상 피팅을 생성 중입니다... (약 4-5초 소요)');

                    const response = await fetch(`${backendUrl}/api/fitting/single-item-tryon`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        clothingId: selectedClothDetail.id,
                        category: selectedClothDetail.category, // 옷 카테고리 전달 (tops, bottoms, outerwear, shoes)
                        denoiseSteps: 10,
                        seed: 42,
                      }),
                    });

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(errorData.message || '가상 피팅 실패');
                    }

                    const result = await response.json();

                    // 결과 이미지 표시 (모달로)
                    if (result.success && result.imageUrl) {
                      // 팝업 차단 문제 방지: 모달로 표시
                      setSelectedClothDetail(null); // 기존 모달 닫기
                      setVtoResultImage(result.imageUrl); // 결과 이미지 표시
                    } else {
                      throw new Error('결과 이미지를 받지 못했습니다.');
                    }
                  } catch (error) {
                    console.error('Single item try-on error:', error);
                    alert(`가상 피팅 실패: ${error.message}`);
                  }
                }}
                className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-bold hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <span className="material-symbols-rounded text-lg">auto_awesome</span>
                하나만 입어보기 (AI)
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // TODO: 수정 모달로 이동 (추후 구현)
                    alert('수정 기능은 추후 업데이트 예정입니다.');
                  }}
                  className="flex-1 py-3 bg-gold/20 text-gold rounded-xl font-semibold hover:bg-gold/30 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-rounded text-lg">edit</span>
                  수정
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('정말 이 옷을 삭제하시겠습니까?')) {
                      try {
                        const token = localStorage.getItem('accessToken');
                        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000'}/items/${selectedClothDetail.id}`, {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${token}`
                          }
                        });

                        if (response.ok) {
                          alert('옷이 삭제되었습니다.');
                          setSelectedClothDetail(null);
                          // 옷 목록 새로고침
                          window.location.reload();
                        } else {
                          throw new Error('삭제 실패');
                        }
                      } catch (error) {
                        alert('삭제 중 오류가 발생했습니다.');
                        console.error(error);
                      }
                    }
                  }}
                  className="flex-1 py-3 bg-red-500/20 text-red-500 rounded-xl font-semibold hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-rounded text-lg">delete</span>
                  삭제
                </button>
              </div>
              <button
                onClick={() => setSelectedClothDetail(null)}
                className="w-full py-3 bg-charcoal dark:bg-cream text-cream dark:text-charcoal rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}


      {/* VTO 결과 모달 */}
      {vtoResultImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={() => setVtoResultImage(null)}
        >
          <div
            className="bg-warm-white dark:bg-charcoal rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-charcoal dark:text-cream flex items-center gap-2">
                  <span className="material-symbols-rounded text-2xl text-gold">auto_awesome</span>
                  가상 피팅 결과
                </h2>
                <button
                  onClick={() => setVtoResultImage(null)}
                  className="p-2 hover:bg-charcoal/10 dark:hover:bg-cream/10 rounded-lg transition-colors"
                >
                  <span className="material-symbols-rounded text-charcoal dark:text-cream">close</span>
                </button>
              </div>

              <img
                src={vtoResultImage}
                alt="Virtual Try-On Result"
                className="w-full rounded-xl shadow-lg"
              />

              <div className="mt-4 flex gap-2">
                <a
                  href={vtoResultImage}
                  download="virtual-tryon-result.png"
                  className="flex-1 py-3 bg-gold text-charcoal rounded-xl font-semibold hover:bg-gold-dark transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-rounded text-lg">download</span>
                  다운로드
                </a>
                <button
                  onClick={() => setVtoResultImage(null)}
                  className="flex-1 py-3 bg-charcoal/10 dark:bg-cream/10 text-charcoal dark:text-cream rounded-xl font-semibold hover:bg-charcoal/20 dark:hover:bg-cream/20 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainPage;
