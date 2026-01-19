import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTabStore, TAB_KEYS } from '../stores/tabStore';

/**
 * 공유 하단 네비게이션 컴포넌트
 * 멀티탭 방식 지원 - 메인 탭들은 탭 전환으로, 다른 페이지는 navigate로 이동
 * 통합 FAB 버튼: 옷 등록 / 피드 등록 선택 가능
 */
const BottomNav = ({ floatingAction }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTab, setActiveTab } = useTabStore();
  const [isFabOpen, setIsFabOpen] = useState(false);

  // 현재 멀티탭 컨테이너 안에 있는지 확인
  const isInMultiTab = location.pathname === '/main' || 
                       location.pathname === '/fitting-room' || 
                       location.pathname === '/feed';

  // 현재 경로에 따라 활성 탭 결정
  const isClosetActive = isInMultiTab 
    ? activeTab === TAB_KEYS.MAIN 
    : location.pathname.includes('/main');
  const isFittingRoomActive = isInMultiTab 
    ? activeTab === TAB_KEYS.FITTING_ROOM 
    : location.pathname.includes('/fitting-room');
  const isSnsActive = isInMultiTab 
    ? activeTab === TAB_KEYS.FEED 
    : (location.pathname.includes('/feed') || 
       location.pathname.includes('/post') || 
       location.pathname.includes('/profile') ||
       location.pathname.includes('/create-post'));

  // 탭 클릭 핸들러
  const handleTabClick = (tabKey, path) => {
    if (isInMultiTab) {
      // 멀티탭 컨테이너 안에서는 탭만 전환 (URL도 업데이트)
      setActiveTab(tabKey);
      window.history.replaceState(null, '', path);
    } else {
      // 멀티탭 컨테이너 밖에서는 navigate로 이동
      navigate(path);
    }
  };

  // 옷 등록 클릭
  const handleClothRegister = () => {
    setIsFabOpen(false);
    navigate('/register');
  };

  // 피드 등록 클릭
  const handleFeedRegister = () => {
    setIsFabOpen(false);
    // SNS 탭으로 이동 후 새로고침 (최근 등록 피드 표시)
    if (isInMultiTab) {
      setActiveTab(TAB_KEYS.FEED);
      window.history.replaceState(null, '', '/feed');
    }
    navigate('/create-post');
  };

  return (
    <>
      {/* 배경 오버레이 */}
      {isFabOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fadeIn"
          onClick={() => setIsFabOpen(false)}
        />
      )}

      {/* 통합 FAB 버튼 영역 */}
      {floatingAction && (
        <div className="fixed bottom-28 right-4 z-50">
          {/* 확장 메뉴 */}
          <div className={`absolute bottom-16 right-0 flex flex-col gap-3 transition-all duration-300 ${
            isFabOpen 
              ? 'opacity-100 translate-y-0 pointer-events-auto' 
              : 'opacity-0 translate-y-4 pointer-events-none'
          }`}>
            {/* 옷 등록 옵션 */}
            <button
              onClick={handleClothRegister}
              className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
            >
              <span className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
                <span className="material-symbols-rounded text-gold text-xl">checkroom</span>
              </span>
              <span className="text-charcoal font-semibold">옷 등록</span>
            </button>

            {/* 피드 등록 옵션 */}
            <button
              onClick={handleFeedRegister}
              className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
            >
              <span className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <span className="material-symbols-rounded text-orange-500 text-xl">post_add</span>
              </span>
              <span className="text-charcoal font-semibold">피드 작성</span>
            </button>
          </div>

          {/* 메인 FAB 버튼 */}
          <button
            onClick={() => setIsFabOpen(!isFabOpen)}
            className={`rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center ${
              isFabOpen 
                ? 'bg-white w-12 h-12' 
                : 'btn-premium w-14 h-14 hover:scale-110 active:scale-95'
            }`}
          >
            <span className={`material-symbols-rounded transition-all duration-300 ${
              isFabOpen ? 'text-charcoal text-xl rotate-90' : 'text-white text-2xl'
            }`}>
              {isFabOpen ? 'close' : 'add'}
            </span>
          </button>
        </div>
      )}

      {/* Bottom Navigation - 3 buttons */}
      <div className="fixed bottom-0 left-0 right-0 h-24 glass-warm border-t border-gold-light/20 flex items-center justify-evenly gap-16 px-4 z-50 safe-area-pb">
        {/* 내 옷장 */}
        <button
          onClick={() => handleTabClick(TAB_KEYS.MAIN, '/main')}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[70px] transition-colors ${
            isClosetActive
              ? 'text-gold'
              : 'text-charcoal-light dark:text-cream-dark hover:text-gold'
          }`}
        >
          <span className="material-symbols-rounded text-[42px]">person</span>
          <span className="text-[16px] font-semibold">Me</span>
        </button>

        {/* 피팅룸 */}
        <button
          onClick={() => handleTabClick(TAB_KEYS.FITTING_ROOM, '/fitting-room')}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[70px] transition-colors ${
            isFittingRoomActive
              ? 'text-gold'
              : 'text-charcoal-light dark:text-cream-dark hover:text-gold'
          }`}
        >
          <span className="material-symbols-rounded text-[42px]">styler</span>
          <span className="text-[16px] font-semibold">옷장&피팅룸</span>
        </button>

        {/* SNS */}
        <button
          onClick={() => handleTabClick(TAB_KEYS.FEED, '/feed')}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[70px] transition-colors ${
            isSnsActive
              ? 'text-gold'
              : 'text-charcoal-light dark:text-cream-dark hover:text-gold'
          }`}
        >
          <span className="material-symbols-rounded text-[42px]">grid_view</span>
          <span className="text-[16px] font-semibold">SNS</span>
        </button>
      </div>
    </>
  );
};

export default BottomNav;