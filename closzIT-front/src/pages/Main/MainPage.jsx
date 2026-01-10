import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SharedHeader from '../../components/SharedHeader';
import OutfitRecommender from './OutfitRecommender';

// 요일 목록
const weekDays = ['월', '화', '수', '목', '금', '토', '일'];

// 카테고리 매핑
const categoryMap = {
  outerwear: { name: '외투', icon: 'checkroom', color: '#D4AF37' },
  tops: { name: '상의', icon: 'person', color: '#B8860B' },
  bottoms: { name: '하의', icon: 'straighten', color: '#CD853F' },
  shoes: { name: '신발', icon: 'steps', color: '#DAA520' },
};

// 더미 데이터 (날씨 제외)
const dummyData = {
  // userName removed, will fetch
  userCredit: 100,
  userLocation: '서울',
  streakDays: 3,
  totalClothes: 29,
  upcomingEvents: [
    { date: '1/8', time: '14:00', title: '친구 약속', isToday: false },
    { date: '1/9', time: '10:00', title: '미팅', isToday: false },
  ],
  topWornItems: [
    { id: 1, color: '#D4AF37', wearCount: 15 },
    { id: 2, color: '#B8860B', wearCount: 12 },
    { id: 3, color: '#CD853F', wearCount: 10 },
  ],
  rarelyWornItems: [
    { id: 4, color: '#DAA520' },
    { id: 5, color: '#D4AF37' },
  ],
  recentItems: [
    { id: 6, color: '#B8860B' },
    { id: 7, color: '#CD853F' },
    { id: 8, color: '#DAA520' },
  ],
};

const MainPage2 = () => {
  const navigate = useNavigate();

  // 검색 및 추천기 상태
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [searchText, setSearchText] = useState(''); // 자연어 검색어 상태
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
  const [selectedClothDetail, setSelectedClothDetail] = useState(null); // 의류 상세정보 모달 상태

  // 날씨 API 상태
  const [weather, setWeather] = useState({ temperature: null, condition: '로딩중...' });
  const [userLocation, setUserLocation] = useState('로딩중...');

  // 다가오는 일정 상태
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  // 옷장 현황 상태
  const [wardrobeStats, setWardrobeStats] = useState({
    outerwear: 0,
    tops: 0,
    bottoms: 0,
    shoes: 0,
    total: 0,
  });

  useEffect(() => {
    // 사용자 정보 가져오기
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
        const response = await fetch(`${backendUrl}/user/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setUserName(data.name || '');
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (userName && showGreeting) {
      const timer = setTimeout(() => setShowGreeting(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [userName, showGreeting]);

  // 확장된 카테고리 상태
  const [expandedCategory, setExpandedCategory] = useState(null);
  
  // 스크롤 상태 감지
  const clothesScrollRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollRotation, setScrollRotation] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false); // 애니메이션 실행 여부 (처음 열릴 때만 true)
  const lastScrollLeftRef = useRef(0);
  const scrollTimeoutRef = useRef(null);

  const handleClothesScroll = (e) => {
    if (!hasScrolled) setHasScrolled(true);
    const currentScrollLeft = e.target.scrollLeft;

    const deltaX = currentScrollLeft - lastScrollLeftRef.current;
    
    // 물리적 관성 효과: 오른쪽 스크롤(delta > 0) -> 왼쪽으로 기울임(rotation > 0)
    // 옷걸이 기준이므로 오른쪽으로 가면 옷이 뒤처지면서 왼쪽(반대)으로 기울어지는게 맞음
    // deltaX * 0.5 정도로 각도 제한
    const rotation = Math.max(Math.min(deltaX * 0.8, 30), -30);
    
    setScrollRotation(rotation);
    setIsScrolling(true);
    
    lastScrollLeftRef.current = currentScrollLeft;
    
    // 스크롤 멈추면 흔들림 정지 및 복귀
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      setScrollRotation(0);
    }, 100);
  };

  // 카테고리 변경 시 상태 초기화
  useEffect(() => {
    setHasScrolled(false);
    setScrollRotation(0);
    if (clothesScrollRef.current) {
      clothesScrollRef.current.scrollLeft = 0;
      lastScrollLeftRef.current = 0;
    }
  }, [expandedCategory]);

  // 날씨 API 호출
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
        const response = await fetch(`${backendUrl}/weather/current`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setWeather({
            temperature: data.temperature,
            condition: data.condition || '맑음',
          });
          if (data.location) {
            setUserLocation(data.location);
          }
        }
      } catch (error) {
        console.error('Weather API error:', error);
        setWeather({ temperature: 8, condition: '맑음' });
      }
    };

    fetchWeather();
  }, []);

  // 다가오는 일정 API 호출
  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
        const response = await fetch(`${backendUrl}/calendar/upcoming`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          const events = data.events || [];
          
          // 백엔드에서 이미 { date, time, title, isToday } 형태로 반환
          const upcoming = events.slice(0, 2).map(event => ({
            date: event.date,
            title: event.title,
            isToday: event.isToday,
          }));

          setUpcomingEvents(upcoming);
        }
      } catch (error) {
        console.error('Calendar API error:', error);
      }
    };

    fetchUpcomingEvents();
  }, []);

  // 옷장 현황 API 호출
  useEffect(() => {
    const fetchWardrobeStats = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
        const response = await fetch(`${backendUrl}/items/by-category`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          
          // 카테고리별 카운트
          const stats = {
            outerwear: data.outerwear?.length || 0,
            tops: data.tops?.length || 0,
            bottoms: data.bottoms?.length || 0,
            shoes: data.shoes?.length || 0,
            total: (data.outerwear?.length || 0) + (data.tops?.length || 0) + 
                   (data.bottoms?.length || 0) + (data.shoes?.length || 0),
          };

          setWardrobeStats(stats);
          setUserClothes({
            outerwear: data.outerwear || [],
            tops: data.tops || [],
            bottoms: data.bottoms || [],
            shoes: data.shoes || [],
          });
        }
      } catch (error) {
        console.error('Wardrobe API error:', error);
      }
    };

    fetchWardrobeStats();
  }, []);

  const getWeatherIcon = () => {
    const condition = weather.condition || '';
    if (condition.includes('비') || condition.includes('rain')) return 'rainy';
    if (condition.includes('눈') || condition.includes('snow')) return 'ac_unit';
    if (condition.includes('구름') || condition.includes('cloud')) return 'cloud';
    return 'wb_sunny';
  };
  
  const getWeatherTip = () => {
    const temp = weather.temperature || 10;
    if (temp <= 5) return '두꺼운 패딩이나 코트를 추천드려요 🧥';
    if (temp <= 12) return '가벼운 아우터를 걸쳐보세요 🧤';
    if (temp <= 20) return '얇은 가디건이 딱이에요 👕';
    return '시원한 반팔이 좋겠어요 ☀️';
  };

  return (
    <div className="min-h-screen bg-cream dark:bg-[#1A1918] font-sans pb-24">
      <SharedHeader />

      {/* Search Block - Visible ONLY when expanded (Active State) */}
      {isSearchExpanded && (
        <div className="px-4 py-3 bg-cream dark:bg-[#1A1918]">
          <button
            onClick={() => setIsSearchExpanded(false)}
            className="w-10 h-10 mb-2 -ml-2 rounded-full flex items-center justify-center hover:bg-gold-light/20 transition-colors"
          >
            <span className="material-symbols-rounded text-2xl text-charcoal dark:text-cream">arrow_back</span>
          </button>

          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gold/10 border-2 border-gold shadow-glow-gold min-h-[44px]">
            {/* 선택된 키워드 칩 */}{/* Expanded State UI */}
            {selectedKeywords.length > 0 ? (
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
              <div className="relative flex-1 h-5 overflow-hidden flex items-center">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="오늘 어떤 스타일을 추천해드릴까요?"
                  className="w-full h-full bg-transparent border-none outline-none text-sm text-charcoal dark:text-cream placeholder-gold/70"
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {isSearchExpanded ? (
          <div className="animate-slideDown">
            <OutfitRecommender
              selectedKeywords={selectedKeywords}
              onKeywordsChange={setSelectedKeywords}
              searchText={searchText}
            />
          </div>
        ) : (
          <main className="py-5 space-y-4 animate-fadeIn">
        
        {/* 1. Streak Card + 동글 캐릭터 (가로 배치) */}
        <div className="flex gap-3 items-stretch">
          {/* 동글 캐릭터 (가운데) */}
          <div 
            className="w-full h-56 rounded-3xl relative flex items-center justify-center shadow-soft border border-gold-light/20 pt-10"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(250,248,245,0.98) 100%)' }}
          >
             {/* Floating Search Trigger (Merged into component) */}
            <div
              onClick={() => setIsSearchExpanded(true)}
              className="absolute top-4 left-4 right-4 h-12 bg-white/50 backdrop-blur-sm rounded-2xl border border-gold-light/20 flex items-center px-4 cursor-pointer hover:bg-white/80 transition-all z-10"
            >
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
                    } text-charcoal-light dark:text-cream-dark`}
                >
                  오늘 뭐 입지? <span className="text-gold font-semibold">AI에게 추천받기</span>
                </span>
              </div>
              <span className="material-symbols-rounded text-gold">search</span>
            </div>
            
            <style>
              {`
                @keyframes dongleFloat {
                  0%, 100% { transform: rotate(-2deg); }
                  50% { transform: rotate(2deg); }
                }
              `}
            </style>
            <img 
              src="/dongle.png" 
              alt="동글쿤" 
              className="w-36 h-auto mt-4"
              style={{ 
                animation: 'dongleFloat 2s linear infinite',
                transformOrigin: 'bottom center'
              }} 
            />
          </div>
        </div>

        {/* 2. 날씨 + 다가오는 일정 (가로 배치) */}
        <div className="grid grid-cols-2 gap-3">
          {/* 날씨 (API 연동) */}
          <div 
            className="rounded-2xl p-4 border border-gold-light/20"
            style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(250,248,245,0.9) 100%)' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <span className="material-symbols-rounded text-xl text-gold">{getWeatherIcon()}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-charcoal dark:text-cream">
                  {userLocation} {weather.temperature !== null ? `${weather.temperature}°C` : ''}
                </p>
                <p className="text-[10px] text-charcoal-light dark:text-cream-dark">{weather.condition}</p>
              </div>
            </div>
            <p className="text-xs text-charcoal-light dark:text-cream-dark">{getWeatherTip()}</p>
          </div>

          {/* 다가오는 일정 */}
          <div 
            className="rounded-2xl p-4 border border-gold-light/20"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(250,248,245,0.98) 100%)' }}
          >
            <h3 className="text-sm font-bold text-charcoal dark:text-cream mb-2 flex items-center gap-1">
              <span className="material-symbols-rounded text-gold text-base">event</span>
              다가오는 일정
            </h3>
            <div className="space-y-1">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className="text-gold font-medium">{event.date}</span>
                    <span className="text-charcoal dark:text-cream truncate">{event.title}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-charcoal-light dark:text-cream-dark">등록된 일정이 없어요</p>
              )}
            </div>
          </div>
        </div>

        {/* 3. 카테고리별 현황 */}
        <div 
          className="rounded-3xl p-4 shadow-soft border border-gold-light/20"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(250,248,245,0.98) 100%)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-charcoal dark:text-cream flex items-center gap-2">
              <span className="material-symbols-rounded text-gold text-lg">inventory_2</span>
              내 옷장 현황
            </h3>
            <span className="text-xs text-charcoal-light dark:text-cream-dark">총 {wardrobeStats.total}벌</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(categoryMap).map(([key, { name, icon, color }]) => (
              <button 
                key={key}
                onClick={() => {
                  // 현재 닫혀있는 상태에서 누르면 -> 열림 (애니메이션 O)
                  // 이미 열려있는 상태에서 다른거 누르면 -> 변경 (애니메이션 X)
                  // 같은거 누르면 -> 닫힘 (상관없음)
                  if (!expandedCategory) { 
                    setShouldAnimate(true); 
                  } else if (expandedCategory !== key) {
                    setShouldAnimate(false);
                  }
                  setExpandedCategory(expandedCategory === key ? null : key);
                }}
                className={`flex flex-col items-center p-3 rounded-2xl transition-all duration-300 border ${
                  expandedCategory === key 
                    ? 'bg-gold/10 border-gold/30 scale-105' 
                    : 'bg-cream-dark/50 dark:bg-charcoal-light/10 hover:bg-gold/10 border-transparent hover:border-gold/20'
                }`}
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <span className="material-symbols-rounded text-lg" style={{ color }}>{icon}</span>
                </div>
                <span className="text-lg font-bold text-charcoal dark:text-cream">{wardrobeStats[key] || 0}</span>
                <span className="text-[10px] text-charcoal-light dark:text-cream-dark">{name}</span>
              </button>
            ))}
          </div>

          {/* 확장 옷봉 영역 */}
          <div 
            className={`overflow-hidden transition-all duration-500 ease-out ${
              expandedCategory ? 'max-h-[300px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'
            }`}
          >
            {/* 옷봉 레일 + 옷 카드들 */}
            <div className="relative pt-2">

              {/* 옷봉 레일 (절대 위치) - 신발 카테고리는 제외, 닫혀있을 때도 제외 */}
              {expandedCategory && expandedCategory !== 'shoes' && (
                <div 
                  className="absolute top-8 left-0 right-0 h-[6px] rounded-full z-10"
                  style={{
                    background: 'linear-gradient(180deg, #997B4D 0%, #E6C88B 30%, #FBF4DF 50%, #C9A962 70%, #8A6E42 100%)', // 금속 원통 질감 (위->아래)
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.4)', // 입체감 그림자
                    animation: shouldAnimate ? 'slideInRail 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.4s backwards' : 'none', // 처음 열릴 때만 애니메이션
                  }}
                />
              )}
              
              {/* 옷 카드들 */}
              <div 
                ref={clothesScrollRef}
                onScroll={handleClothesScroll}
                className="flex gap-3 overflow-x-auto pb-3 hide-scrollbar relative z-10"
              >
                {expandedCategory && userClothes[expandedCategory]?.map((cloth, idx) => (
                  <div 
                    key={cloth.id}
                    className="flex-shrink-0 cursor-pointer transition-all duration-300 hover:scale-105 group/card"
                    style={{ 
                      // 신발 카테고리는 흔들림 효과 제외
                      ...(expandedCategory === 'shoes' ? {
                        animation: shouldAnimate ? `slideInSimpleRight 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.55s backwards` : 'none',
                        transform: undefined,
                      } : {
                        // 스크롤 중일 때는 계산된 rotation 적용, 아닐 때는 animation 적용
                        transform: isScrolling ? `rotate(${scrollRotation}deg)` : undefined,
                        // 중력 효과: 스크롤 멈추면 초고속 복귀 (0.2s)
                        transition: isScrolling ? 'transform 0.1s linear' : 'transform 0.2s cubic-bezier(0.25, 1.5, 0.5, 1)', 
                        animation: isScrolling 
                          ? 'none' 
                          : (hasScrolled 
                              ? 'none' 
                              : (shouldAnimate 
                                  ? `appearSwingFromRight 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.55s backwards` 
                                  : 'none')), // 처음 열릴 때만 애니메이션 적용
                        transformOrigin: 'top center',
                      })
                    }}
                  >
                    {/* 옷걸이 - 신발 카테고리는 제외 */}
                    {expandedCategory !== 'shoes' && (
                      <div className="flex justify-center">
                        <img 
                          src="/assets/hook.png" 
                          alt="hook" 
                          className="w-16 h-16 object-contain"
                        />
                      </div>
                    )}
                    {/* 옷 카드 - 신발일 경우 마진 제거 */}
                    <div className={`w-20 h-24 bg-warm-white dark:bg-charcoal rounded-xl overflow-hidden border-2 border-gold-light/30 shadow-soft relative ${expandedCategory !== 'shoes' ? '-mt-4' : 'mt-2'}`}>
                      <img
                        alt={cloth.name || '옷'}
                        className="w-full h-full object-cover"
                        src={cloth.image || cloth.imageUrl}
                      />
                      {/* Hover Overlay with Detail Icon Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClothDetail(cloth);
                        }}
                        className="absolute bottom-1 right-1 w-6 h-6 bg-white/90 dark:bg-charcoal/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/card:opacity-100 transition-all duration-200 hover:scale-110 hover:bg-white dark:hover:bg-charcoal"
                      >
                        <span className="material-symbols-rounded text-gold text-xs">info</span>
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* 빈 상태 */}
                {expandedCategory && (!userClothes[expandedCategory] || userClothes[expandedCategory].length === 0) && (
                  <div className="flex-1 flex items-center justify-center py-6">
                    <p className="text-sm text-charcoal-light dark:text-cream-dark">이 카테고리에 옷이 없어요</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 슬라이드 인 + 흔들흔들 애니메이션 */}
        <style>
          {`
            @keyframes appearSwingFromRight {
              0% { opacity: 0; transform: translateX(100vw) rotate(5deg); } /* 화면 너비만큼 이동 */
              50% { opacity: 1; transform: translateX(0) rotate(-3deg); }
              70% { transform: rotate(2deg); }
              85% { transform: rotate(-1deg); }
              100% { transform: rotate(0); }
            }
            
            @keyframes slideInRail {
              0% { opacity: 0; transform: translateX(100%); }
              100% { opacity: 1; transform: translateX(0); }
            }
            
            @keyframes slideInSimpleRight {
              0% { opacity: 0; transform: translateX(100vw); } /* 화면 너비만큼 이동 */
              100% { opacity: 1; transform: translateX(0); }
            }
            
            @keyframes idleSwing {
              0%, 100% { transform: rotate(0deg); }
              25% { transform: rotate(2.5deg); }
              75% { transform: rotate(-2.5deg); }
            }
          `}
        </style>

        {/* 4. 자주 입는 옷 TOP 3 */}
        <div 
          className="rounded-3xl p-4 shadow-soft border border-gold-light/20"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(250,248,245,0.98) 100%)' }}
        >
          <h3 className="text-base font-bold text-charcoal dark:text-cream mb-3 flex items-center gap-2">
            <span className="material-symbols-rounded text-gold text-lg">favorite</span>
            나의 최애템 TOP 3
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {dummyData.topWornItems.map((item, idx) => (
              <div key={item.id} className="flex-shrink-0 w-20">
                <div className="relative">
                  <div 
                    className="w-20 h-20 rounded-xl border border-gold-light/30 flex items-center justify-center"
                    style={{ backgroundColor: item.color }}
                  >
                    <span className="material-symbols-rounded text-white text-2xl">checkroom</span>
                  </div>
                  <span className="absolute -top-1 -left-1 w-5 h-5 bg-gold text-warm-white text-xs font-bold rounded-full flex items-center justify-center">
                    {idx + 1}
                  </span>
                </div>
                <p className="text-[10px] text-center text-charcoal-light dark:text-cream-dark mt-1">
                  {item.wearCount}회 착용
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 5. 오래 안 입은 옷 */}
        <div 
          className="rounded-3xl p-4 shadow-soft border border-gold-light/20"
          style={{ background: 'linear-gradient(135deg, rgba(255,200,100,0.08) 0%, rgba(250,248,245,0.98) 100%)' }}
        >
          <h3 className="text-base font-bold text-charcoal dark:text-cream mb-3 flex items-center gap-2">
            <span className="material-symbols-rounded text-amber-500 text-lg">schedule</span>
            오래 안 입은 옷
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {dummyData.rarelyWornItems.map((item) => (
              <div key={item.id} className="flex-shrink-0 w-20">
                <div 
                  className="w-20 h-20 rounded-xl border border-amber-200 flex items-center justify-center"
                  style={{ backgroundColor: item.color }}
                >
                  <span className="material-symbols-rounded text-white text-2xl">checkroom</span>
                </div>
                <p className="text-[10px] text-center text-charcoal-light dark:text-cream-dark mt-1 truncate">
                  오늘 입어볼까요?
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 6. 최근 등록한 옷 */}
        <div 
          className="rounded-3xl p-4 shadow-soft border border-gold-light/20"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(250,248,245,0.98) 100%)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-charcoal dark:text-cream flex items-center gap-2">
              <span className="material-symbols-rounded text-gold text-lg">new_releases</span>
              최근 등록
            </h3>
            <button 
              onClick={() => navigate('/main')}
              className="text-xs text-gold font-medium"
            >
              전체보기
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {dummyData.recentItems.map((item) => (
              <div key={item.id} className="flex-shrink-0">
                <div 
                  className="w-16 h-16 rounded-xl border border-gold-light/30 flex items-center justify-center"
                  style={{ backgroundColor: item.color }}
                >
                  <span className="material-symbols-rounded text-white text-xl">checkroom</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 7. CTA - 옷장 열기 */}
        <button 
          onClick={() => navigate('/main')}
          className="w-full py-4 rounded-2xl btn-premium text-warm-white font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-rounded text-xl">checkroom</span>
          옷장 열기
        </button>

       </main>
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
                src={selectedClothDetail.image || selectedClothDetail.imageUrl}
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
              {/* Category */}
              <div className="bg-cream-dark dark:bg-charcoal-light/20 rounded-xl p-3">
                <p className="text-[10px] text-charcoal-light dark:text-cream-dark uppercase font-semibold mb-1">카테고리</p>
                <p className="text-sm font-medium text-charcoal dark:text-cream">
                  {selectedClothDetail.category === 'outerwear' && '외투'}
                  {selectedClothDetail.category === 'tops' && '상의'}
                  {selectedClothDetail.category === 'bottoms' && '하의'}
                  {selectedClothDetail.category === 'shoes' && '신발'}
                  {selectedClothDetail.subCategory && ` (${selectedClothDetail.subCategory})`}
                </p>
              </div>

              {/* Seasons, Colors, etc can be added here if available in data */}
              
              {/* Wear Count */}
              {selectedClothDetail.wearCount !== undefined && (
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

                    // 로딩 표시
                    alert('단일 옷 가상 피팅을 생성 중입니다... (약 4-5초 소요)');

                    const response = await fetch(`${backendUrl}/api/fitting/single-item-tryon-v2`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        clothingId: selectedClothDetail.id,
                        denoiseSteps: 20,
                        seed: Math.floor(Math.random() * 1000000),
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
                  onClick={() => alert('수정 기능은 추후 업데이트 예정입니다.')}
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
                          headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (response.ok) {
                          alert('옷이 삭제되었습니다.');
                          setSelectedClothDetail(null);
                          // 간단히 새로고침 (실제로는 state update 권장)
                          window.location.reload();
                        } else {
                          alert('삭제 실패');
                        }
                      } catch (e) {
                        console.error(e);
                        alert('오류 발생');
                      }
                    }
                  }}
                  className="flex-1 py-3 bg-red-500/20 text-red-500 rounded-xl font-semibold hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-rounded text-lg">delete</span>
                  삭제
                </button>
              </div>
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

export default MainPage2;
