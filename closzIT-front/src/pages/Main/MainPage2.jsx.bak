import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SharedHeader from '../../components/SharedHeader';
import OutfitRecommender from './OutfitRecommender';
import BottomNav from '../../components/BottomNav';
import { GiTrousers, GiTShirt, GiMonclerJacket } from 'react-icons/gi';


// 요일 목록
const weekDays = ['월', '화', '수', '목', '금', '토', '일'];

// 카테고리 매핑 (customIcon: true인 경우 React Icons 사용)
const categoryMap = {
  outerwear: { name: '외투', icon: 'jacket', color: '#D4AF37', customIcon: true, IconComponent: GiMonclerJacket },
  tops: { name: '상의', icon: 'tshirt', color: '#B8860B', customIcon: true, IconComponent: GiTShirt },
  bottoms: { name: '하의', icon: 'trousers', color: '#CD853F', customIcon: true, IconComponent: GiTrousers },
  shoes: { name: '신발', icon: 'steps', color: '#DAA520' },
};

// 키워드 필터 옵션 (백엔드 필드명과 일치: tpos, styleMoods, seasons, colors)
const keywordGroups = [
  {
    title: 'TPO',
    key: 'tpos',
    options: [
      { label: '데일리', value: 'Daily' }, { label: '출근', value: 'Commute' },
      { label: '데이트', value: 'Date' }, { label: '운동', value: 'Sports' },
      { label: '여행', value: 'Travel' }, { label: '파티', value: 'Party' },
      { label: '학교', value: 'School' }, { label: '집', value: 'Home' }
    ]
  },
  {
    title: '스타일',
    key: 'styleMoods',
    options: [
      { label: '캐주얼', value: 'Casual' }, { label: '스트릿', value: 'Street' },
      { label: '미니멀', value: 'Minimal' }, { label: '포멀', value: 'Formal' },
      { label: '스포티', value: 'Sporty' }, { label: '빈티지', value: 'Vintage' },
      { label: '고프코어', value: 'Gorpcore' }
    ]
  },
  {
    title: '계절',
    key: 'seasons',
    options: [
      { label: '봄', value: 'Spring' }, { label: '여름', value: 'Summer' },
      { label: '가을', value: 'Autumn' }, { label: '겨울', value: 'Winter' }
    ]
  },
  {
    title: '색상',
    key: 'colors',
    options: [
      { label: '블랙', value: 'Black' }, { label: '화이트', value: 'White' },
      { label: '그레이', value: 'Gray' }, { label: '베이지', value: 'Beige' },
      { label: '브라운', value: 'Brown' }, { label: '네이비', value: 'Navy' },
      { label: '블루', value: 'Blue' }, { label: '하늘색', value: 'Sky-blue' },
      { label: '레드', value: 'Red' }, { label: '핑크', value: 'Pink' },
      { label: '오렌지', value: 'Orange' }, { label: '옐로우', value: 'Yellow' },
      { label: '그린', value: 'Green' }, { label: '민트', value: 'Mint' },
      { label: '퍼플', value: 'Purple' }, { label: '카키', value: 'Khaki' }
    ]
  }
];

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
  const [showGreeting, setShowGreeting] = useState(true);
  const [selectedClothDetail, setSelectedClothDetail] = useState(null); // 의류 상세정보 모달 상태
  const [isVtoLoading, setIsVtoLoading] = useState(false); // VTO 로딩 상태
  const [userFullBodyImage, setUserFullBodyImage] = useState(null); // 사용자 전신 사진
  const [beforeAfterImage, setBeforeAfterImage] = useState(null); // Before & After 이미지 (After)

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
          setUserFullBodyImage(data.fullBodyImage || null); // 전신 사진 저장
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
  const [userClothes, setUserClothes] = useState({
    outerwear: [],
    tops: [],
    bottoms: [],
    shoes: [],
  });

  // 키워드 필터 상태 (백엔드 필드명과 일치)
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);
  const [filterState, setFilterState] = useState({
    tpos: [],
    styleMoods: [],
    seasons: [],
    colors: [],
  });

  // 필터링된 옷 목록 계산
  const filteredClothes = React.useMemo(() => {
    // 활성화된 필터가 없으면 전체 반환
    const hasActiveFilters = Object.values(filterState).some(arr => arr.length > 0);
    if (!hasActiveFilters) return userClothes;

    const result = { ...userClothes };
    Object.keys(result).forEach(category => {
      if (!result[category]) return;
      result[category] = result[category].filter(item => {
        // 각 활성 필터 그룹에 대해, 아이템이 해당 그룹의 선택된 값 중 하나라도 포함해야 함 (AND 조건)
        return Object.entries(filterState).every(([key, selectedValues]) => {
          if (selectedValues.length === 0) return true;

          // 백엔드에서 반환하는 필드명: tpos, styleMoods, seasons, colors
          // item 객체에서 직접 접근
          const itemValue = item[key];

          if (!itemValue) return false; // 해당 속성이 없으면 탈락

          const valuesArray = Array.isArray(itemValue) ? itemValue : [itemValue];
          return selectedValues.some(v => valuesArray.includes(v));
        });
      });
    });
    return result;
  }, [userClothes, filterState]);

  // 필터링된 통계 계산
  const filteredStats = React.useMemo(() => {
    return {
      outerwear: filteredClothes.outerwear?.length || 0,
      tops: filteredClothes.tops?.length || 0,
      bottoms: filteredClothes.bottoms?.length || 0,
      shoes: filteredClothes.shoes?.length || 0,
      total: (filteredClothes.outerwear?.length || 0) + (filteredClothes.tops?.length || 0) +
        (filteredClothes.bottoms?.length || 0) + (filteredClothes.shoes?.length || 0),
    };
  }, [filteredClothes]);

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
            outerwear: (data.outerwear || []).map(item => ({ ...item, category: 'outerwear' })),
            tops: (data.tops || []).map(item => ({ ...item, category: 'tops' })),
            bottoms: (data.bottoms || []).map(item => ({ ...item, category: 'bottoms' })),
            shoes: (data.shoes || []).map(item => ({ ...item, category: 'shoes' })),
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

            {/* Unified Dashboard Card */}
            <div
              className="rounded-[32px] p-5 relative overflow-hidden shadow-soft border border-gold-light/20"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(250,248,245,0.98) 100%)' }}
            >
              {/* Top: Search Trigger Button */}
              <div
                onClick={() => setIsSearchExpanded(true)}
                className="w-full h-12 rounded-2xl border border-gold/30 flex items-center px-4 cursor-pointer hover:border-gold/50 transition-all z-10 relative bg-white/40 backdrop-blur-sm mb-4"
                style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(255,250,240,0.8) 100%)' }}
              >
                <div className="relative flex-1 h-5 overflow-hidden flex items-center justify-center">
                  <span
                    className={`absolute inset-0 flex items-center justify-center text-sm text-charcoal-light dark:text-cream-dark transition-all duration-500 ease-in-out ${showGreeting && userName
                      ? 'translate-y-0 opacity-100'
                      : '-translate-y-full opacity-0'
                      }`}
                  >
                    반가워요, <span className="text-gold font-semibold ml-1">{userName}</span>님!
                  </span>
                  <span
                    className={`absolute inset-0 flex items-center justify-center text-sm transition-all duration-500 ease-in-out ${showGreeting && userName
                      ? 'translate-y-full opacity-0'
                      : 'translate-y-0 opacity-100'
                      } text-charcoal-light dark:text-cream-dark gap-1`}
                  >
                    오늘 뭐 입지? <span className="text-gold font-semibold">AI에게 추천받기</span>
                  </span>
                </div>
                <span className="material-symbols-rounded text-gold absolute right-4">search</span>
              </div>

              {/* Bottom Row: Weather - Character - Schedule */}
              <div className="flex items-end justify-between relative z-10 px-1">
                {/* Left: Weather */}
                <div className="flex-1 flex flex-col items-start min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-white/60 backdrop-blur-md border border-gold-light/10 shadow-sm flex items-center justify-center mb-2">
                    <span className="material-symbols-rounded text-2xl text-gold">{getWeatherIcon()}</span>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="block text-sm font-bold text-charcoal dark:text-cream">
                        {weather.temperature !== null ? `${weather.temperature}°C` : ''}
                      </span>
                      <span className="block text-[10px] text-charcoal-light dark:text-cream-dark leading-none mt-0.5">{weather.condition}</span>
                    </div>
                    <span className="block text-[10px] text-charcoal-light/70 dark:text-cream-dark/70 mt-0.5">{userLocation}</span>
                  </div>
                  <p className="text-[10px] text-gold dark:text-gold-light mt-1 text-left font-medium leading-tight break-keep w-full">
                    {getWeatherTip()}
                  </p>
                </div>

                {/* Center: Character */}
                <div className="relative flex justify-center -mb-2 shrink-0">
                  <style>
                    {`
                  @keyframes dongleFloat {
                    0%, 100% { transform: translateY(0px) rotate(-1deg); }
                    50% { transform: translateY(-5px) rotate(1deg); }
                  }
                `}
                  </style>
                  <img
                    src="/dongle.png"
                    alt="동글쿤"
                    className="w-32 h-auto object-contain drop-shadow-xl"
                    style={{
                      animation: 'dongleFloat 3s ease-in-out infinite',
                      transformOrigin: 'bottom center'
                    }}
                  />
                </div>

                {/* Right: Schedule */}
                <div className="flex-1 flex flex-col items-end">
                  <div className="w-12 h-12 rounded-2xl bg-white/60 backdrop-blur-md border border-gold-light/10 shadow-sm flex items-center justify-center mb-2">
                    <span className="material-symbols-rounded text-2xl text-gold">event</span>
                  </div>
                  <div className="text-right w-full">
                    <span className="block text-[10px] text-charcoal-light dark:text-cream-dark leading-none mb-0.5">다가오는 일정</span>
                    <span className="block text-xs font-bold text-charcoal dark:text-cream truncate w-full pl-4">
                      {upcomingEvents.length > 0 ? upcomingEvents[0].title : '없음'}
                    </span>
                  </div>
                  {upcomingEvents.length > 0 && (
                    <p className="text-[10px] text-gold dark:text-gold-light mt-1 text-right font-medium">
                      {upcomingEvents[0].date} {upcomingEvents[0].time}
                    </p>
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsKeywordModalOpen(true)}
                    className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all text-xs font-medium ${Object.values(filterState).some(a => a.length > 0)
                      ? 'bg-gold text-white shadow-md'
                      : 'bg-white text-charcoal-light border border-gold-light/20 hover:bg-gold/10'
                      }`}
                  >
                    <span className="material-symbols-rounded text-sm">search</span>
                    키워드 검색
                  </button>
                  {Object.values(filterState).some(a => a.length > 0) && (
                    <button
                      onClick={() => setFilterState({ tpos: [], styleMoods: [], seasons: [], colors: [] })}
                      className="text-xs text-gold underline font-medium hover:text-gold-dark transition-colors"
                    >
                      초기화
                    </button>
                  )}
                  <span className="text-xs text-charcoal-light dark:text-cream-dark">총 {filteredStats.total}벌</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(categoryMap).map(([key, { name, icon, color }]) => (
                  <button
                    key={key}
                    onClick={() => {
                      if (!expandedCategory) {
                        setShouldAnimate(true);
                      } else if (expandedCategory !== key) {
                        setShouldAnimate(false);
                      }
                      setExpandedCategory(expandedCategory === key ? null : key);
                    }}
                    className={`flex flex-col items-center p-3 rounded-2xl transition-all duration-300 border ${expandedCategory === key
                      ? 'bg-gold/10 border-gold/30 scale-105'
                      : 'bg-cream-dark/50 dark:bg-charcoal-light/10 hover:bg-gold/10 border-transparent hover:border-gold/20'
                      }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      {(() => {
                        const IconComp = categoryMap[key].IconComponent;
                        return categoryMap[key].customIcon && IconComp ? (
                          <IconComp className="text-xl" style={{ color }} />
                        ) : (
                          <span className="material-symbols-rounded text-lg" style={{ color }}>{icon}</span>
                        );
                      })()}
                    </div>
                    <span className="text-lg font-bold text-charcoal dark:text-cream">{filteredStats[key] || 0}</span>
                    <span className="text-[10px] text-charcoal-light dark:text-cream-dark">{name}</span>
                  </button>
                ))}
              </div>

              {/* 확장 옷봉 영역 */}
              <div
                className={`overflow-hidden transition-all duration-500 ease-out ${expandedCategory ? 'max-h-[300px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'
                  }`}
              >
                {/* 옷봉 레일 + 옷 카드들 */}
                <div className="relative pt-2">

                  {/* 옷봉 레일 (절대 위치) - 신발 카테고리는 제외, 닫혀있을 때도 제외, 옷이 없으면 제외 */}
                  {expandedCategory && expandedCategory !== 'shoes' && filteredClothes[expandedCategory]?.length > 0 && (
                    <div
                      className="absolute top-6 left-0 right-0 h-[14px] z-10 backdrop-blur-sm"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(245,236,215,0.7) 50%, rgba(212,175,55,0.2) 100%)',
                        borderTop: '2px solid #D4AF37',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,0.8), inset 0 -1px 2px rgba(212,175,55,0.3)',
                        animation: shouldAnimate ? 'slideInRail 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.4s backwards' : 'none',
                      }}
                    />
                  )}

                  {/* 신발장 선반 (신발 카테고리일 때만, 신발이 있을 때만) */}
                  {expandedCategory === 'shoes' && filteredClothes['shoes']?.length > 0 && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-[8px] z-10"
                      style={{
                        background: 'linear-gradient(to bottom, #8B5E3C, #5D3A1A)',
                        borderTop: '2px solid #D4AF37',
                        boxShadow: '0 -2px 4px rgba(0,0,0,0.15)',
                        animation: shouldAnimate ? 'slideInRail 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.4s backwards' : 'none',
                      }}
                    />
                  )}

                  {/* 옷 카드들 */}
                  <div
                    ref={clothesScrollRef}
                    onScroll={handleClothesScroll}
                    className="flex gap-3 overflow-x-auto pb-3 hide-scrollbar relative z-10"
                  >
                    {expandedCategory && filteredClothes[expandedCategory]?.map((cloth, idx) => (
                      <div
                        key={cloth.id}
                        className="flex-shrink-0 cursor-pointer group/card"
                        style={{
                          willChange: 'transform', // GPU 가속 힌트
                          backfaceVisibility: 'hidden', // 뒷면 렌더링 방지
                          // 신발 카테고리는 흔들림 효과 제외
                          ...(expandedCategory === 'shoes' ? {
                            animation: shouldAnimate ? `slideInSimpleRight 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.55s backwards` : 'none',
                            transform: 'translate3d(0,0,0)', // 하드웨어 가속 트리거
                          } : {
                            // 스크롤 중일 때는 계산된 rotation 적용, 아닐 때는 animation 적용
                            transform: isScrolling
                              ? `rotate(${scrollRotation}deg) translate3d(0,0,0)`
                              : 'translate3d(0,0,0)',
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
                        <div
                          className={`w-20 h-24 rounded-xl overflow-hidden relative backdrop-blur-sm ${expandedCategory !== 'shoes' ? '-mt-4' : 'mt-2'}`}
                          style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
                            border: '1.5px solid rgba(212,175,55,0.4)',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.5) inset, 0 2px 4px rgba(212,175,55,0.15)',
                          }}
                        >
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

                    {/* 빈 상태 - 귀여운 메시지 */}
                    {expandedCategory && (!filteredClothes[expandedCategory] || filteredClothes[expandedCategory].length === 0) && (
                      <div className="flex-1 flex flex-col items-center justify-center py-8 px-4">
                        <span className="material-symbols-rounded text-4xl text-gold-light mb-2">checkroom</span>
                        <p className="text-sm font-medium text-charcoal dark:text-cream mb-1">
                          {expandedCategory === 'shoes' ? '아직 신발이 없어요 👟' : '아직 옷이 없어요 ✨'}
                        </p>
                        <p className="text-xs text-charcoal-light dark:text-cream-dark">
                          새 {expandedCategory === 'shoes' ? '신발을' : '옷을'} 등록해보세요!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Before & After 섹션 */}
            <div
              className="bg-white/90 dark:bg-charcoal/80 backdrop-blur-md rounded-3xl p-5 shadow-soft border border-gold-light/20"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(250,248,245,0.98) 100%)' }}
            >
              <h3 className="text-base font-bold text-charcoal dark:text-cream flex items-center gap-2 mb-4">
                <span className="material-symbols-rounded text-gold text-lg">compare</span>
                Before & After
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Before */}
                <div className="relative">
                  <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-cream-dark/30 dark:bg-charcoal-light/20 border border-gold-light/20">
                    {userFullBodyImage ? (
                      <img
                        src={userFullBodyImage}
                        alt="Before"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-sm text-charcoal-light dark:text-cream-dark">사진 없음</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <span className="text-xs font-semibold text-charcoal-light dark:text-cream-dark uppercase">Before</span>
                  </div>
                </div>

                {/* After */}
                <div className="relative">
                  <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-cream-dark/30 dark:bg-charcoal-light/20 border border-gold-light/20">
                    {beforeAfterImage ? (
                      <img
                        src={beforeAfterImage}
                        alt="After"
                        className="w-full h-full object-contain"
                      />
                    ) : userFullBodyImage ? (
                      <img
                        src={userFullBodyImage}
                        alt="After"
                        className="w-full h-full object-contain opacity-50"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-sm text-charcoal-light dark:text-cream-dark">사진 없음</span>
                      </div>
                    )}
                    {isVtoLoading && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gold border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <span className="text-xs font-semibold text-gold uppercase">After</span>
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
            
          </main>
        )}
      </div>

      {/* Global Bottom Navigation */}
      <BottomNav 
        floatingAction={{
          icon: 'apparel',
          onClick: () => navigate('/register')
        }}
      />

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

            {/* Modal Footer - 수정/삭제 버튼 */}
            {/* 하나만 입어보기 버튼 (IDM-VTON) */}
            <button
              onClick={async () => {
                try {
                  const token = localStorage.getItem('accessToken');
                  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

                  // 필요한 정보 먼저 저장
                  const clothingId = selectedClothDetail.id;
                  const category = selectedClothDetail.category;

                  console.log(`[VTO] Starting try-on for clothing: ${clothingId}, category: ${category}`);

                  // 모달 닫고 로딩 시작
                  setSelectedClothDetail(null);
                  setIsVtoLoading(true);

                  const response = await fetch(`${backendUrl}/api/fitting/single-item-tryon`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      clothingId: clothingId,
                      category: category,
                      denoiseSteps: 10,
                      seed: 42,
                    }),
                  });

                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || '가상 피팅 실패');
                  }

                  const result = await response.json();

                  // 결과 이미지 표시 (Before & After만 업데이트)
                  if (result.success && result.imageUrl) {
                    setBeforeAfterImage(result.imageUrl); // Before & After의 After 업데이트
                  } else {
                    throw new Error('결과 이미지를 받지 못했습니다.');
                  }
                } catch (error) {
                  console.error('Single item try-on error:', error);
                  alert(`가상 피팅 실패: ${error.message}`);
                } finally {
                  setIsVtoLoading(false); // 로딩 종료
                }
              }}
              className="w-64 mx-auto py-3.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-bold hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <span className="material-symbols-rounded text-lg">auto_awesome</span>
              하나만 입어보기 (AI)
            </button>

            <div className="p-4 border-t border-gold-light/20 space-y-2">
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
                          // 성공 시 목록에서 제거
                          setUserClothes((prev) => {
                            const newClothes = { ...prev };
                            const category = selectedClothDetail.category; // category is required for this
                            if (newClothes[category]) {
                              newClothes[category] = newClothes[category].filter(item => item.id !== selectedClothDetail.id);
                            }
                            return newClothes;
                          });
                          setSelectedClothDetail(null);
                        }
                      } catch (e) {
                        console.error(e);
                        alert('삭제 실패');
                      }
                    }
                  }}
                  className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors"
                >
                  <span className="material-symbols-rounded">delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== Keyword Filter Modal ========== */}
      {isKeywordModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center animate-fadeIn"
          onClick={() => setIsKeywordModalOpen(false)}
        >
          <div
            className="bg-warm-white dark:bg-charcoal w-full max-w-sm sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-slideUp sm:animate-slideDown max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gold-light/20 flex items-center justify-between bg-white/50 backdrop-blur-sm relative z-10">
              <h3 className="text-lg font-bold text-charcoal dark:text-cream">키워드로 옷 찾기</h3>
              <button
                onClick={() => {
                  setFilterState({ tpos: [], styleMoods: [], seasons: [], colors: [] });
                }}
                className="text-xs text-gold underline font-medium"
              >
                초기화
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {keywordGroups.map((group) => (
                <div key={group.key}>
                  <h4 className="text-sm font-bold text-charcoal dark:text-cream mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-gold rounded-full"></span>
                    {group.title}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((option) => {
                      const isSelected = filterState[group.key].includes(option.value);
                      return (
                        <button
                          key={option.value}
                          onClick={() => {
                            setFilterState(prev => {
                              const current = prev[group.key];
                              const updated = current.includes(option.value)
                                ? current.filter(v => v !== option.value)
                                : [...current, option.value];
                              return { ...prev, [group.key]: updated };
                            });
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${isSelected
                            ? 'bg-gold text-white border-gold shadow-md transform scale-105'
                            : 'bg-white dark:bg-charcoal-light border-gold-light/20 text-charcoal-light dark:text-cream-dark hover:border-gold/50'
                            }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gold-light/20 bg-white/50 backdrop-blur-sm safe-area-pb">
              <button
                onClick={() => setIsKeywordModalOpen(false)}
                className="w-full py-3.5 bg-gradient-to-r from-gold to-gold-dark text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
              >
                {/* 필터 적용된 총 개수 계산 */}
                {(() => {
                  const total = Object.values(filteredClothes).reduce((acc, list) => acc + list.length, 0);
                  return `${total}벌의 옷 결과 보기`;
                })()}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default MainPage2;
