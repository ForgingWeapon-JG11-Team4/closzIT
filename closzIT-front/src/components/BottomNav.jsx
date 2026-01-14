import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTabStore, TAB_KEYS } from '../stores/tabStore';

/**
 * 공유 하단 네비게이션 컴포넌트
 * 멀티탭 방식 지원 - 메인 탭들은 탭 전환으로, 다른 페이지는 navigate로 이동
 * @param {Object} props
 * @param {Object} props.floatingAction - 플로팅 액션 버튼 설정 (선택적)
 * @param {string} props.floatingAction.icon - Material Symbols 아이콘 이름
 * @param {Function} props.floatingAction.onClick - 클릭 핸들러
 */
const BottomNav = ({ floatingAction }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTab, setActiveTab } = useTabStore();

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

  return (
    <>
      {/* Floating Action Button (선택적) */}
      {floatingAction && (
        <button
          onClick={floatingAction.onClick}
          className="fixed bottom-20 right-4 w-14 h-14 btn-premium rounded-full shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center"
        >
          <span className="material-symbols-rounded text-2xl">{floatingAction.icon}</span>
        </button>
      )}

      {/* Bottom Navigation - 3 buttons */}
      <div className="fixed bottom-0 left-0 right-0 h-16 glass-warm border-t border-gold-light/20 flex items-center justify-evenly gap-16 px-4 z-50 safe-area-pb">
        {/* 내 옷장 */}
        <button
          onClick={() => handleTabClick(TAB_KEYS.MAIN, '/main')}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[70px] transition-colors ${
            isClosetActive
              ? 'text-gold'
              : 'text-charcoal-light dark:text-cream-dark hover:text-gold'
          }`}
        >
          <span className="material-symbols-rounded text-[22px]">person</span>
          <span className="text-[10px] font-semibold">Me</span>
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
          <span className="material-symbols-rounded text-[22px]">styler</span>
          <span className="text-[10px] font-semibold">옷장&피팅룸</span>
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
          <span className="material-symbols-rounded text-[22px]">grid_view</span>
          <span className="text-[10px] font-semibold">SNS</span>
        </button>
      </div>
    </>
  );
};

export default BottomNav;