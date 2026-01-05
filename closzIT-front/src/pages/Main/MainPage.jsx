import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import OutfitRecommender from './OutfitRecommender';

// 카테고리 데이터
const categories = [
  { id: 'outerwear', name: '외투' },
  { id: 'tops', name: '상의' },
  { id: 'bottoms', name: '하의' },
  { id: 'shoes', name: '신발' },
];

const MainPage = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('outerwear');
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
  const [showGreeting, setShowGreeting] = useState(true);

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

      {/* Header - Luxury glass effect */}
      <div className="px-4 py-3 flex items-center gap-3 glass-warm sticky top-0 z-40 border-b border-gold-light/20">
        {isSearchExpanded ? (
          <button
            onClick={() => setIsSearchExpanded(false)}
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gold-light/20 transition-colors flex-shrink-0"
          >
            <span className="material-symbols-rounded text-2xl text-charcoal dark:text-cream">arrow_back</span>
          </button>
        ) : null}

        <div 
          onClick={() => setIsSearchExpanded(true)}
          className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-300 ${
            isSearchExpanded 
              ? 'bg-gold/10 border-2 border-gold shadow-glow-gold' 
              : 'bg-cream-dark dark:bg-charcoal/50 hover:bg-gold-light/30 border border-gold-light/30'
          }`}
        >
          <span className="material-symbols-rounded text-xl text-gold">auto_awesome</span>
          <div className="relative flex-1 h-5 overflow-hidden">
            <span 
              className={`absolute inset-0 text-sm text-charcoal-light dark:text-cream-dark transition-all duration-500 ease-in-out ${
                showGreeting && userName 
                  ? 'translate-y-0 opacity-100' 
                  : '-translate-y-full opacity-0'
              }`}
            >
              반가워요, <span className="text-gold font-semibold">{userName}</span>님!
            </span>
            <span 
              className={`absolute inset-0 text-sm transition-all duration-500 ease-in-out ${
                showGreeting && userName
                  ? 'translate-y-full opacity-0' 
                  : 'translate-y-0 opacity-100'
              } ${isSearchExpanded ? 'text-gold font-semibold' : 'text-charcoal-light dark:text-cream-dark'}`}
            >
              {isSearchExpanded 
                ? 'AI 스타일리스트에게 물어보세요' 
                : <>오늘 뭐 입지? <span className="text-gold font-semibold">AI에게 추천받기</span></>
              }
            </span>
          </div>
        </div>

        {isSearchExpanded ? (
          <button
            onClick={() => setIsSearchExpanded(false)}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gold-light/20 transition-colors flex-shrink-0"
          >
            <span className="material-symbols-rounded text-2xl text-charcoal dark:text-cream">close</span>
          </button>
        ) : (
          <button
            onClick={() => navigate('/mypage')}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-gold to-gold-dark text-warm-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex-shrink-0"
          >
            <span className="material-symbols-rounded text-xl">person</span>
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24 px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

        {isSearchExpanded ? (
          <div className="animate-slideDown">
            <OutfitRecommender />
          </div>
        ) : (
          <div className="animate-fadeIn">

            {/* Category Pill Buttons - More spacing */}
            <div className="flex items-center gap-4 overflow-x-auto hide-scrollbar py-3 px-1 mt-2 mb-4">
              {categories.map((category, index) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 animate-reveal animate-reveal-${index + 1} ${
                    activeCategory === category.id
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

                {allClothes.map((cloth, idx) => (
                  <div
                    key={`${cloth.id}-${idx === currentClothIndex ? 'active' : 'inactive'}`}
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

                    {/* Clothes Card - Smaller size */}
                    <div className={`w-28 h-36 bg-warm-white dark:bg-charcoal rounded-xl overflow-hidden border-2 transition-all duration-300 relative z-40 ${idx === currentClothIndex
                        ? 'border-gold shadow-lifted ring-2 ring-gold/20'
                        : 'border-gold-light/30 dark:border-charcoal-light/30 shadow-soft'
                      }`}>
                      <img
                        alt={cloth.name}
                        className="w-full h-full object-cover"
                        src={cloth.image}
                      />
                    </div>
                  </div>
                ))}

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

            {/* ========== Character Styling Area with Animation ========== */}
            <div className="relative mt-4 mb-6 animate-reveal animate-reveal-3">
              <div 
                className="rounded-3xl p-6 min-h-[220px] flex flex-col items-center justify-center"
                style={{
                  background: 'linear-gradient(180deg, rgba(250, 248, 245, 0.8) 0%, rgba(255, 255, 255, 0.95) 100%)',
                  border: '1px solid rgba(212, 175, 55, 0.15)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                }}
              >
                {/* Character Image with Wobble Animation */}
                <div 
                  className="w-36 h-36 mb-4 flex items-center justify-center"
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
                    className="hidden w-28 h-28 rounded-full items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #FFE4B5 0%, #DEB887 100%)',
                      boxShadow: '0 4px 12px rgba(222, 184, 135, 0.3)',
                      animation: 'wobble 2s ease-in-out infinite',
                    }}
                  >
                    <span className="material-symbols-rounded text-5xl text-amber-700">face</span>
                  </div>
                </div>
                
                {/* Styling Message */}
                <p className="text-center text-charcoal dark:text-cream text-sm font-medium">
                  오늘의 코디를 추천해 드릴까요?
                </p>
                <p className="text-center text-charcoal-light/60 dark:text-cream-dark/60 text-xs mt-1.5">
                  위에서 옷을 선택하면 AI가 스타일링을 도와드려요
                </p>
                
                {/* Action Button */}
                <button 
                  onClick={() => setIsSearchExpanded(true)}
                  className="mt-5 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #D4AF37 0%, #C9A962 100%)',
                    color: '#FFFAF0',
                    boxShadow: '0 4px 12px rgba(201, 169, 98, 0.3)',
                  }}
                >
                  AI 스타일리스트에게 물어보기
                </button>
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
    </div>
  );
};

export default MainPage;
