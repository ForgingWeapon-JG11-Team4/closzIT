import React from 'react';
import BottomNav from './BottomNav';

/**
 * 전역 앱 레이아웃 래퍼
 * 페이지 컨텐츠를 감싸고 하단 네비게이션을 자동으로 추가합니다.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - 페이지 컨텐츠
 * @param {boolean} props.showNav - 네비게이션 표시 여부 (기본: true)
 * @param {Object} props.floatingAction - 플로팅 액션 버튼 설정 (선택적)
 * @param {string} props.floatingAction.icon - Material Symbols 아이콘 이름
 * @param {Function} props.floatingAction.onClick - 클릭 핸들러
 * @param {string} props.className - 추가 CSS 클래스
 */
const AppLayout = ({ 
  children, 
  showNav = true, 
  floatingAction,
  className = ''
}) => {
  return (
    <div className={`min-h-screen bg-cream dark:bg-[#1A1918] ${showNav ? 'pb-20' : ''} ${className}`}>
      {children}
      
      {showNav && <BottomNav floatingAction={floatingAction} />}
    </div>
  );
};

export default AppLayout;
