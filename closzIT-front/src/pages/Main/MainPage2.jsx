// src/pages/main/MainPage2.jsx

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

// 키워드 필터 옵션
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

// 지역 데이터
const locationData = {
  '서울특별시': ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
  '부산광역시': ['강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구'],
  '대구광역시': ['남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구'],
  '인천광역시': ['강화군', '계양구', '남동구', '동구', '미추홀구', '부평구', '서구', '연수구', '옹진군', '중구'],
  '광주광역시': ['광산구', '남구', '동구', '북구', '서구'],
  '대전광역시': ['대덕구', '동구', '서구', '유성구', '중구'],
  '울산광역시': ['남구', '동구', '북구', '울주군', '중구'],
  '세종특별자치시': ['세종시'],
  '경기도': ['가평군', '고양시', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시', '남양주시', '동두천시', '부천시', '성남시', '수원시', '시흥시', '안산시', '안성시', '안양시', '양주시', '양평군', '여주시', '연천군', '오산시', '용인시', '의왕시', '의정부시', '이천시', '파주시', '평택시', '포천시', '하남시', '화성시'],
  '강원도': ['강릉시', '고성군', '동해시', '삼척시', '속초시', '양구군', '양양군', '영월군', '원주시', '인제군', '정선군', '철원군', '춘천시', '태백시', '평창군', '홍천군', '화천군', '횡성군'],
  '충청북도': ['괴산군', '단양군', '보은군', '영동군', '옥천군', '음성군', '제천시', '증평군', '진천군', '청주시', '충주시'],
  '충청남도': ['계룡시', '공주시', '금산군', '논산시', '당진시', '보령시', '부여군', '서산시', '서천군', '아산시', '예산군', '천안시', '청양군', '태안군', '홍성군'],
  '전라북도': ['고창군', '군산시', '김제시', '남원시', '무주군', '부안군', '순창군', '완주군', '익산시', '임실군', '장수군', '전주시', '정읍시', '진안군'],
  '전라남도': ['강진군', '고흥군', '곡성군', '광양시', '구례군', '나주시', '담양군', '목포시', '무안군', '보성군', '순천시', '신안군', '여수시', '영광군', '영암군', '완도군', '장성군', '장흥군', '진도군', '함평군', '해남군', '화순군'],
  '경상북도': ['경산시', '경주시', '고령군', '구미시', '군위군', '김천시', '문경시', '봉화군', '상주시', '성주군', '안동시', '영덕군', '영양군', '영주시', '영천시', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군', '포항시'],
  '경상남도': ['거제시', '거창군', '고성군', '김해시', '남해군', '밀양시', '사천시', '산청군', '양산시', '의령군', '진주시', '창녕군', '창원시', '통영시', '하동군', '함안군', '함양군', '합천군'],
  '제주특별자치도': ['서귀포시', '제주시'],
};

const provinces = Object.keys(locationData);

const MainPage2 = () => {
  const navigate = useNavigate();

  // 검색 및 추천기 상태
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [userName, setUserName] = useState('');
  const [showGreeting, setShowGreeting] = useState(true);
  const [selectedClothDetail, setSelectedClothDetail] = useState(null);
  const [isVtoLoading, setIsVtoLoading] = useState(false);
  const [userFullBodyImage, setUserFullBodyImage] = useState(null);
  const [beforeAfterImage, setBeforeAfterImage] = useState(null);

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

  // 사용자 위치 정보 상태 추가
  const [userProvince, setUserProvince] = useState('');
  const [userCity, setUserCity] = useState('');

  // 일정 추가 모달 상태
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    isAllDay: true,
    startTime: '',
    endTime: '',
    province: '',
    city: '',
    description: '',
  });

  const [isAddingEvent, setIsAddingEvent] = useState(false);

  // 일정 추가 함수
  const handleAddEvent = async () => {
    if (!newEvent.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    setIsAddingEvent(true);

    try {
      const token = localStorage.getItem('accessToken');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

      const response = await fetch(`${backendUrl}/calendar/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newEvent.title,
          date: newEvent.date,
          // 종일이면 시간 전송 안 함
          startTime: newEvent.isAllDay ? undefined : newEvent.startTime,
          endTime: newEvent.isAllDay ? undefined : newEvent.endTime,
          province: newEvent.province || undefined,
          city: newEvent.city || undefined,
          description: newEvent.description || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 일정 목록 새로고침
        const upcomingResponse = await fetch(`${backendUrl}/calendar/upcoming`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (upcomingResponse.ok) {
          const data = await upcomingResponse.json();
          const events = data.events || [];
          setUpcomingEvents(events.slice(0, 2));
        }

        // 모달 닫고 초기화
        setIsAddEventModalOpen(false);
        setNewEvent({
          title: '',
          date: new Date().toISOString().split('T')[0],
          isAllDay: true,
          startTime: '',
          endTime: '',
          province: '',
          city: '',
          description: '',
        });

        alert('일정이 추가되었습니다!');
      } else {
        alert(result.error || '일정 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('Add event error:', error);
      alert('일정 추가 중 오류가 발생했습니다.');
    } finally {
      setIsAddingEvent(false);
    }
  };

  useEffect(() => {
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
          setUserFullBodyImage(data.fullBodyImage || null);
          
          // 사용자 위치 정보 저장
          if (data.province) setUserProvince(data.province);
          if (data.city) setUserCity(data.city);
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
  
  // 모달 열 때 사용자 위치를 기본값으로 설정
  const openAddEventModal = () => {
    setNewEvent({
      title: '',
      date: new Date().toISOString().split('T')[0],
      isAllDay: true,
      startTime: '',
      endTime: '',
      province: userProvince,  // 사용자 시/도
      city: userCity,          // 사용자 시/군/구
      description: '',
    });
    setIsAddEventModalOpen(true);
  };

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
    const hasActiveFilters = Object.values(filterState).some(arr => arr.length > 0);
    if (!hasActiveFilters) return userClothes;

    const result = { ...userClothes };
    Object.keys(result).forEach(category => {
      if (!result[category]) return;
      result[category] = result[category].filter(item => {
        return Object.entries(filterState).every(([key, selectedValues]) => {
          if (selectedValues.length === 0) return true;
          const itemValue = item[key];
          if (!itemValue) return false;
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
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const lastScrollLeftRef = useRef(0);
  const scrollTimeoutRef = useRef(null);

  const handleClothesScroll = (e) => {
    if (!hasScrolled) setHasScrolled(true);
    const currentScrollLeft = e.target.scrollLeft;
    const deltaX = currentScrollLeft - lastScrollLeftRef.current;
    const rotation = Math.max(Math.min(deltaX * 0.8, 30), -30);
    setScrollRotation(rotation);
    setIsScrolling(true);
    lastScrollLeftRef.current = currentScrollLeft;

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

      {/* Search Block - Visible ONLY when expanded */}
      {isSearchExpanded && (
        <div className="px-4 py-3 bg-cream dark:bg-[#1A1918]">
          <button
            onClick={() => setIsSearchExpanded(false)}
            className="w-10 h-10 mb-2 -ml-2 rounded-full flex items-center justify-center hover:bg-gold-light/20 transition-colors"
          >
            <span className="material-symbols-rounded text-2xl text-charcoal dark:text-cream">arrow_back</span>
          </button>

          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gold/10 border-2 border-gold shadow-glow-gold min-h-[44px]">
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
                  <div className="flex items-center gap-1 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-white/60 backdrop-blur-md border border-gold-light/10 shadow-sm flex items-center justify-center">
                      <span className="material-symbols-rounded text-2xl text-gold">event</span>
                    </div>
                    <button
                      onClick={openAddEventModal}
                      className="w-8 h-8 rounded-xl bg-gold/20 hover:bg-gold/30 border border-gold/30 flex items-center justify-center transition-all hover:scale-105"
                    >
                      <span className="material-symbols-rounded text-gold text-lg">add</span>
                    </button>
                  </div>
                  <div className="text-right w-full">
                    <span className="block text-[10px] text-charcoal-light dark:text-cream-dark leading-none mb-0.5">다가오는 일정</span>
                    <span className="block text-xs font-bold text-charcoal dark:text-cream truncate w-full pl-4">
                      {upcomingEvents.length > 0 ? upcomingEvents[0].title : '없음'}
                    </span>
                  </div>
                  {upcomingEvents.length > 0 && (
                    <p className="text-[10px] text-gold dark:text-gold-light mt-1 text-right font-medium">
                      {upcomingEvents[0].date}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 카테고리별 현황 */}
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
                      <span className="material-symbols-rounded text-lg" style={{ color }}>{icon}</span>
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
                <div className="relative pt-2">
                  {expandedCategory && expandedCategory !== 'shoes' && (
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

                  {expandedCategory === 'shoes' && (
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
                          willChange: 'transform',
                          backfaceVisibility: 'hidden',
                          ...(expandedCategory === 'shoes' ? {
                            animation: shouldAnimate ? `slideInSimpleRight 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.55s backwards` : 'none',
                            transform: 'translate3d(0,0,0)',
                          } : {
                            transform: isScrolling
                              ? `rotate(${scrollRotation}deg) translate3d(0,0,0)`
                              : 'translate3d(0,0,0)',
                            transition: isScrolling ? 'transform 0.1s linear' : 'transform 0.2s cubic-bezier(0.25, 1.5, 0.5, 1)',
                            animation: isScrolling
                              ? 'none'
                              : (hasScrolled
                                ? 'none'
                                : (shouldAnimate
                                  ? `appearSwingFromRight 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.55s backwards`
                                  : 'none')),
                            transformOrigin: 'top center',
                          })
                        }}
                      >
                        {expandedCategory !== 'shoes' && (
                          <div className="flex justify-center">
                            <img
                              src="/assets/hook.png"
                              alt="hook"
                              className="w-16 h-16 object-contain"
                            />
                          </div>
                        )}
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

                    {expandedCategory && (!filteredClothes[expandedCategory] || filteredClothes[expandedCategory].length === 0) && (
                      <div className="flex-1 flex items-center justify-center py-6">
                        <p className="text-sm text-charcoal-light dark:text-cream-dark">이 카테고리에 옷이 없어요</p>
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

            <style>
              {`
                @keyframes appearSwingFromRight {
                  0% { opacity: 0; transform: translateX(100vw) rotate(5deg); }
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
                  0% { opacity: 0; transform: translateX(100vw); }
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

      {/* Floating Action Button */}
      <button
        onClick={() => navigate('/register')}
        className="fixed bottom-20 right-4 w-14 h-14 btn-premium rounded-full shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center"
      >
        <span className="material-symbols-rounded text-2xl">apparel</span>
      </button>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-16 glass-warm border-t border-gold-light/20 flex items-center justify-around px-4 z-50 safe-area-pb">
        <button className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] text-gold">
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

            <div className="p-5 space-y-4 max-h-[40vh] overflow-y-auto">
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

              {selectedClothDetail.wearCount !== undefined && (
                <div className="bg-cream-dark dark:bg-charcoal-light/20 rounded-xl p-3">
                  <p className="text-[10px] text-charcoal-light dark:text-cream-dark uppercase font-semibold mb-1">착용 횟수</p>
                  <p className="text-sm font-medium text-charcoal dark:text-cream">{selectedClothDetail.wearCount}회</p>
                </div>
              )}
            </div>

            <button
              onClick={async () => {
                try {
                  const token = localStorage.getItem('accessToken');
                  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
                  const clothingId = selectedClothDetail.id;
                  const category = selectedClothDetail.category;

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

                  if (result.success && result.imageUrl) {
                    setBeforeAfterImage(result.imageUrl);
                  } else {
                    throw new Error('결과 이미지를 받지 못했습니다.');
                  }
                } catch (error) {
                  console.error('Single item try-on error:', error);
                  alert(`가상 피팅 실패: ${error.message}`);
                } finally {
                  setIsVtoLoading(false);
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
                          setUserClothes((prev) => {
                            const newClothes = { ...prev };
                            const category = selectedClothDetail.category;
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

            <div className="p-4 border-t border-gold-light/20 bg-white/50 backdrop-blur-sm safe-area-pb">
              <button
                onClick={() => setIsKeywordModalOpen(false)}
                className="w-full py-3.5 bg-gradient-to-r from-gold to-gold-dark text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
              >
                {(() => {
                  const total = Object.values(filteredClothes).reduce((acc, list) => acc + list.length, 0);
                  return `${total}벌의 옷 결과 보기`;
                })()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== Add Event Modal ========== */}
      {isAddEventModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsAddEventModalOpen(false)}
        >
          <div
            className="bg-warm-white dark:bg-charcoal rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-slideDown"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gold-light/20 flex items-center justify-between">
              <h3 className="text-lg font-bold text-charcoal dark:text-cream">일정 추가</h3>
              <button
                onClick={() => setIsAddEventModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gold/10 transition-colors"
              >
                <span className="material-symbols-rounded text-charcoal-light dark:text-cream-dark">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* 제목 */}
              <div>
                <label className="block text-xs font-semibold text-charcoal-light dark:text-cream-dark mb-1.5">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="일정 제목"
                  className="w-full px-4 py-3 rounded-xl border border-gold-light/30 bg-white dark:bg-charcoal-light/20 text-charcoal dark:text-cream placeholder-charcoal-light/50 focus:border-gold focus:outline-none transition-colors"
                />
              </div>

              {/* 날짜 */}
              <div>
                <label className="block text-xs font-semibold text-charcoal-light dark:text-cream-dark mb-1.5">
                  날짜 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gold-light/30 bg-white dark:bg-charcoal-light/20 text-charcoal dark:text-cream focus:border-gold focus:outline-none transition-colors"
                />
              </div>

              {/* 종일 체크박스 + 시간 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-semibold text-charcoal-light dark:text-cream-dark">
                    시간
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newEvent.isAllDay}
                      onChange={(e) => setNewEvent({ 
                        ...newEvent, 
                        isAllDay: e.target.checked,
                        startTime: e.target.checked ? '' : newEvent.startTime,
                        endTime: e.target.checked ? '' : newEvent.endTime,
                      })}
                      className="w-4 h-4 rounded border-gold-light/30 text-gold focus:ring-gold"
                    />
                    <span className="text-xs text-charcoal dark:text-cream">종일</span>
                  </label>
                </div>
                
                {!newEvent.isAllDay && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-charcoal-light dark:text-cream-dark mb-1">
                        시작 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={newEvent.startTime}
                        onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gold-light/30 bg-white dark:bg-charcoal-light/20 text-charcoal dark:text-cream focus:border-gold focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-charcoal-light dark:text-cream-dark mb-1">
                        종료 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={newEvent.endTime}
                        onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gold-light/30 bg-white dark:bg-charcoal-light/20 text-charcoal dark:text-cream focus:border-gold focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 위치 */}
              <div>
                <label className="block text-xs font-semibold text-charcoal-light dark:text-cream-dark mb-1.5">
                  위치
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={newEvent.province}
                    onChange={(e) => setNewEvent({ ...newEvent, province: e.target.value, city: '' })}
                    className="w-full px-4 py-3 rounded-xl border border-gold-light/30 bg-white dark:bg-charcoal-light/20 text-charcoal dark:text-cream focus:border-gold focus:outline-none transition-colors"
                  >
                    <option value="">시/도 선택</option>
                    {provinces.map((province) => (
                      <option key={province} value={province}>{province}</option>
                    ))}
                  </select>
                  <select
                    value={newEvent.city}
                    onChange={(e) => setNewEvent({ ...newEvent, city: e.target.value })}
                    disabled={!newEvent.province}
                    className="w-full px-4 py-3 rounded-xl border border-gold-light/30 bg-white dark:bg-charcoal-light/20 text-charcoal dark:text-cream focus:border-gold focus:outline-none transition-colors disabled:opacity-50"
                  >
                    <option value="">시/군/구 선택</option>
                    {newEvent.province && locationData[newEvent.province]?.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 설명 */}
              <div>
                <label className="block text-xs font-semibold text-charcoal-light dark:text-cream-dark mb-1.5">
                  설명
                </label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="상세 정보"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-gold-light/30 bg-white dark:bg-charcoal-light/20 text-charcoal dark:text-cream placeholder-charcoal-light/50 focus:border-gold focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gold-light/20 flex gap-3">
              <button
                onClick={() => setIsAddEventModalOpen(false)}
                className="flex-1 py-3 rounded-xl border border-gold-light/30 text-charcoal-light dark:text-cream-dark font-semibold hover:bg-gold/10 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAddEvent}
                  disabled={
                    isAddingEvent || 
                    !newEvent.title.trim() ||
                    (!newEvent.isAllDay && (!newEvent.startTime || !newEvent.endTime))
                  }
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-white font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAddingEvent ? (
                    <>
                      <span className="material-symbols-rounded animate-spin text-lg">progress_activity</span>
                      추가 중...
                    </>
                  ) : (
                    '추가하기'
                  )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MainPage2;
