import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTabStore, TAB_KEYS } from '../stores/tabStore';
import MainPage2 from '../pages/Main/MainPage2';
import FittingRoomPage from '../pages/FittingRoomPage';
import FeedPage from '../pages/FeedPage';
import BottomNav from './BottomNav';
import SharedHeader from './SharedHeader';

// 슬라이드 애니메이션 CSS
const slideStyles = `
@keyframes slideInFromRight {
    from {
        transform: translateX(100%);
        opacity: 0.8;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideInFromLeft {
    from {
        transform: translateX(-100%);
        opacity: 0.8;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOutToLeft {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(-100%);
        opacity: 0.8;
    }
}

@keyframes slideOutToRight {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0.8;
    }
}

.tab-slide-in-left {
    animation: slideInFromLeft 0.3s ease-out forwards;
}

.tab-slide-in-right {
    animation: slideInFromRight 0.3s ease-out forwards;
}

.tab-slide-out-left {
    animation: slideOutToLeft 0.3s ease-out forwards;
}

.tab-slide-out-right {
    animation: slideOutToRight 0.3s ease-out forwards;
}
`;

/**
 * 멀티탭 컨테이너
 * 모든 메인 탭을 한번에 렌더링하고 display로 보이기/숨기기 제어
 * 스크롤 위치, 입력값, 상태 등이 완벽하게 유지됨
 * 
 * 각 탭 페이지 내부에서 BottomNav를 렌더링 (floatingAction 등 개별 설정 가능)
 */
const MultiTabContainer = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { activeTab, previousTab, slideDirection, setActiveTab, isTabInitialized } = useTabStore();

    // 각 탭별 floatingAction 설정
    const getFloatingAction = () => {
        switch (activeTab) {
            case TAB_KEYS.MAIN:
            case TAB_KEYS.FITTING_ROOM:
                return {
                    icon: 'apparel',
                    onClick: () => navigate('/register')
                };
            case TAB_KEYS.FEED:
                return {
                    icon: 'post_add',
                    onClick: () => navigate('/create-post')
                };
            default:
                return null;
        }
    };

    // URL 경로에 따라 탭 초기화 (최초 진입 시)
    useEffect(() => {
        const path = location.pathname;
        
        if (path === '/main' || path === '/main/') {
            setActiveTab(TAB_KEYS.MAIN);
        } else if (path === '/fitting-room' || path === '/fitting-room/') {
            setActiveTab(TAB_KEYS.FITTING_ROOM);
        } else if (path === '/feed' || path === '/feed/') {
            setActiveTab(TAB_KEYS.FEED);
        }
    }, [location.pathname, setActiveTab]);

    // 탭 스타일 및 애니메이션 클래스 생성
    const getTabStyle = (tabKey) => {
        const isActive = activeTab === tabKey;
        const isPrevious = previousTab === tabKey;
        
        // 기본 스타일
        const baseStyle = {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            height: '100%',
            width: '100%',
            overflow: 'auto',
        };
        
        if (isActive) {
            return {
                ...baseStyle,
                zIndex: 2,
                display: 'block',
            };
        } else if (isPrevious && slideDirection) {
            return {
                ...baseStyle,
                zIndex: 1,
                display: 'block',
            };
        } else {
            return {
                ...baseStyle,
                zIndex: 0,
                display: 'none',
            };
        }
    };
    
    // 애니메이션 클래스 결정
    const getAnimationClass = (tabKey) => {
        const isActive = activeTab === tabKey;
        const isPrevious = previousTab === tabKey;
        
        if (!slideDirection) return '';
        
        if (isActive) {
            // 새 탭이 들어오는 방향
            return slideDirection === 'left' ? 'tab-slide-in-right' : 'tab-slide-in-left';
        } else if (isPrevious) {
            // 이전 탭이 나가는 방향
            return slideDirection === 'left' ? 'tab-slide-out-left' : 'tab-slide-out-right';
        }
        
        return '';
    };

    return (
        <>
            <style>{slideStyles}</style>
            
            {/* 공통 상단 헤더 - 탭 컨테이너 외부에 고정 */}
            <SharedHeader />
            
            <div className="min-h-screen bg-cream dark:bg-[#1A1918] relative overflow-hidden pt-[60px] pb-16">
                {/* Main 탭 - 항상 렌더링 */}
                <div 
                    style={getTabStyle(TAB_KEYS.MAIN)}
                    className={getAnimationClass(TAB_KEYS.MAIN)}
                >
                    <MainPage2 hideHeader />
                </div>

                {/* Fitting Room 탭 - 한번 방문하면 계속 유지 */}
                {isTabInitialized(TAB_KEYS.FITTING_ROOM) && (
                    <div 
                        style={getTabStyle(TAB_KEYS.FITTING_ROOM)}
                        className={getAnimationClass(TAB_KEYS.FITTING_ROOM)}
                    >
                        <FittingRoomPage hideHeader />
                    </div>
                )}

                {/* Feed 탭 - 한번 방문하면 계속 유지 */}
                {isTabInitialized(TAB_KEYS.FEED) && (
                    <div 
                        style={getTabStyle(TAB_KEYS.FEED)}
                        className={getAnimationClass(TAB_KEYS.FEED)}
                    >
                        <FeedPage hideHeader />
                    </div>
                )}
            </div>

            {/* Bottom Navigation - 탭 컨테이너 외부에 고정 */}
            <BottomNav floatingAction={getFloatingAction()} />
        </>
    );
};

export default MultiTabContainer;
