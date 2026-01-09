import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SharedHeader from '../../components/SharedHeader';

// 요일 목록
const weekDays = ['월', '화', '수', '목', '금', '토', '일'];

// 카테고리 매핑
const categoryMap = {
  outerwear: { name: '외투', icon: 'checkroom', color: '#D4AF37', count: 5 },
  tops: { name: '상의', icon: 'person', color: '#B8860B', count: 12 },
  bottoms: { name: '하의', icon: 'straighten', color: '#CD853F', count: 8 },
  shoes: { name: '신발', icon: 'steps', color: '#DAA520', count: 4 },
};

// 더미 데이터 (날씨 제외)
const dummyData = {
  userName: '사용자',
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
  const today = new Date().getDay();
  const adjustedToday = today === 0 ? 6 : today - 1;

  // 날씨 API 상태
  const [weather, setWeather] = useState({ temperature: null, condition: '로딩중...' });
  const [userLocation, setUserLocation] = useState('로딩중...');

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

      <main className="px-4 py-5 space-y-4">
        
        {/* 1. Streak Card + 동글 캐릭터 (가로 배치) */}
        <div className="flex gap-3 items-stretch">
          {/* 연속 스타일링 카드 (왼쪽) - 빈 컨테이너 */}
          <div 
            className="flex-1 aspect-square rounded-3xl p-4 shadow-soft border border-gold-light/20"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(250,248,245,0.98) 100%)' }}
          >
            {/* 내용 추가 예정 */}
          </div>

          {/* 동글 캐릭터 (오른쪽) */}
          {/* ▶ aspect-square: 정사각형 비율 유지 */}
          <div className="w-1/2 aspect-square flex items-center justify-center rounded-3xl bg-warm-white/50 dark:bg-charcoal/30 border border-gold-light/20">
            <style>
              {`
                @keyframes dongleFloat {
                  0%, 100% { transform: rotate(-2deg); }
                  50% { transform: rotate(2deg); }
                }
              `}
            </style>
            {/* ▶ w-20: 캐릭터 크기 (w-16=작게, w-24=크게, w-full=컨테이너꽉참) */}
            <img 
              src="/dongle.png" 
              alt="동글쿤" 
              className="w-40 h-auto"
              style={{ 
                animation: 'dongleFloat 2s linear infinite', // 2s=속도 (1s=빠름, 3s=느림)
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
              {dummyData.upcomingEvents.slice(0, 2).map((event, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className="text-gold font-medium">{event.date}</span>
                  <span className="text-charcoal dark:text-cream truncate">{event.title}</span>
                </div>
              ))}
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
            <span className="text-xs text-charcoal-light dark:text-cream-dark">총 {dummyData.totalClothes}벌</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(categoryMap).map(([key, { name, icon, color, count }]) => (
              <button 
                key={key}
                onClick={() => navigate('/main')}
                className="flex flex-col items-center p-3 rounded-2xl bg-cream-dark/50 dark:bg-charcoal-light/10 hover:bg-gold/10 transition-colors border border-transparent hover:border-gold/20"
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <span className="material-symbols-rounded text-lg" style={{ color }}>{icon}</span>
                </div>
                <span className="text-lg font-bold text-charcoal dark:text-cream">{count}</span>
                <span className="text-[10px] text-charcoal-light dark:text-cream-dark">{name}</span>
              </button>
            ))}
          </div>
        </div>

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

export default MainPage2;
