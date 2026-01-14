import { create } from 'zustand';

// 탭 상수 정의
export const TAB_KEYS = {
    MAIN: 'main',
    FITTING_ROOM: 'fitting-room',
    FEED: 'feed',
};

// 탭 순서 (슬라이드 방향 결정용)
export const TAB_ORDER = [TAB_KEYS.MAIN, TAB_KEYS.FITTING_ROOM, TAB_KEYS.FEED];

export const useTabStore = create((set, get) => ({
    // 현재 활성 탭
    activeTab: TAB_KEYS.MAIN,
    
    // 이전 탭 (애니메이션 방향 결정용)
    previousTab: null,
    
    // 슬라이드 방향 ('left' | 'right' | null)
    slideDirection: null,
    
    // 각 탭의 초기화 상태 (lazy loading용)
    initializedTabs: new Set([TAB_KEYS.MAIN]),
    
    // 탭 간 데이터 전달용 (원클릭 착장 등)
    pendingTryOnCloth: null,
    
    // 원클릭 착장 데이터 설정
    setPendingTryOnCloth: (cloth) => set({ pendingTryOnCloth: cloth }),
    
    // 원클릭 착장 데이터 가져오고 초기화
    consumePendingTryOnCloth: () => {
        const cloth = get().pendingTryOnCloth;
        set({ pendingTryOnCloth: null });
        return cloth;
    },
    
    // 탭 변경
    setActiveTab: (tab) => {
        const { activeTab, initializedTabs } = get();
        
        // 같은 탭이면 무시
        if (activeTab === tab) return;
        
        // 슬라이드 방향 계산
        const currentIndex = TAB_ORDER.indexOf(activeTab);
        const newIndex = TAB_ORDER.indexOf(tab);
        const direction = newIndex > currentIndex ? 'left' : 'right';
        
        // 탭이 아직 초기화되지 않았다면 초기화 목록에 추가
        if (!initializedTabs.has(tab)) {
            set({ 
                previousTab: activeTab,
                activeTab: tab,
                slideDirection: direction,
                initializedTabs: new Set([...initializedTabs, tab])
            });
        } else {
            set({ 
                previousTab: activeTab,
                activeTab: tab,
                slideDirection: direction,
            });
        }
        
        // 애니메이션 완료 후 방향 초기화
        setTimeout(() => {
            set({ slideDirection: null, previousTab: null });
        }, 300);
    },
    
    // 탭이 초기화되었는지 확인
    isTabInitialized: (tab) => {
        return get().initializedTabs.has(tab);
    },
    
    // 특정 탭으로 이동 (외부에서 호출용)
    navigateToTab: (tab) => {
        get().setActiveTab(tab);
    },
}));
