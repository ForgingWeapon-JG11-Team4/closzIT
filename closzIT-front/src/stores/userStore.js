import { create } from 'zustand';

const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
const getToken = () => localStorage.getItem('accessToken');

// 캐시 유효 시간 (밀리초)
const USER_CACHE_DURATION = 5 * 60 * 1000; // 5분

export const useUserStore = create((set, get) => ({
    // ========== 사용자 정보 상태 ==========
    user: null,
    userId: null,
    userName: '',
    userEmail: '',
    userCredit: 0,
    userFullBodyImage: null,
    userProfileImage: null,
    isProfileComplete: false,
    
    // 추가 프로필 정보
    gender: '',
    birthday: null,
    province: '',
    city: '',
    hairColor: '',
    personalColor: '',
    height: null,
    weight: null,
    bodyType: '',
    preferredStyles: [],
    
    // 로딩 및 캐시 상태
    isUserLoading: false,
    userLastFetchedAt: null,
    userError: null,

    // ========== 사용자 정보 Actions ==========
    
    /**
     * 사용자 정보 가져오기 (캐시 지원)
     * @param {boolean} force - 강제 갱신 여부
     * @returns {Promise<Object|null>} 사용자 데이터 또는 null
     */
    fetchUser: async (force = false) => {
        const { userLastFetchedAt, isUserLoading, user } = get();
        const now = Date.now();

        // 이미 로딩 중이면 스킵
        if (isUserLoading) {
            // 기존 사용자 데이터가 있으면 반환
            return user;
        }

        // 강제 갱신이 아니고, 캐시가 유효하면 기존 데이터 반환
        if (!force && userLastFetchedAt && (now - userLastFetchedAt < USER_CACHE_DURATION) && user) {
            return user;
        }

        set({ isUserLoading: true, userError: null });

        try {
            const token = getToken();
            if (!token) {
                set({ 
                    isUserLoading: false,
                    user: null,
                    userId: null,
                    userName: '',
                    userEmail: '',
                    userCredit: 0,
                    userFullBodyImage: null,
                    userProfileImage: null,
                    isProfileComplete: false,
                });
                return null;
            }

            const response = await fetch(`${backendUrl}/user/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                set({
                    user: data,
                    userId: data.id,
                    userName: data.name || '',
                    userEmail: data.email || '',
                    userCredit: data.credit || 0,
                    userFullBodyImage: data.fullBodyImage || null,
                    userProfileImage: data.profileImage || null,
                    isProfileComplete: data.isProfileComplete || false,
                    gender: data.gender || '',
                    birthday: data.birthday || null,
                    province: data.province || '',
                    city: data.city || '',
                    hairColor: data.hairColor || '',
                    personalColor: data.personalColor || '',
                    height: data.height || null,
                    weight: data.weight || null,
                    bodyType: data.bodyType || '',
                    preferredStyles: data.preferredStyles || [],
                    userLastFetchedAt: Date.now(),
                    isUserLoading: false,
                });
                return data;
            } else if (response.status === 401) {
                // 토큰 무효 - 삭제
                localStorage.removeItem('accessToken');
                set({
                    isUserLoading: false,
                    user: null,
                    userId: null,
                    userName: '',
                    userEmail: '',
                    userCredit: 0,
                    userFullBodyImage: null,
                    userProfileImage: null,
                    isProfileComplete: false,
                    userError: 'Unauthorized',
                });
                return null;
            } else {
                throw new Error('Failed to fetch user');
            }
        } catch (error) {
            console.error('User fetch error:', error);
            set({ 
                isUserLoading: false,
                userError: error.message,
            });
            return null;
        }
    },

    /**
     * 크레딧만 갱신 (가볍게)
     */
    refreshCredit: async () => {
        try {
            const token = getToken();
            if (!token) return;

            const response = await fetch(`${backendUrl}/user/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                set({ userCredit: data.credit || 0 });
            }
        } catch (error) {
            console.error('Credit refresh error:', error);
        }
    },

    /**
     * 전신 사진 업데이트 (로컬)
     */
    setUserFullBodyImage: (imageUrl) => {
        set({ userFullBodyImage: imageUrl });
    },

    /**
     * 프로필 이미지 업데이트 (로컬)
     */
    setUserProfileImage: (imageUrl) => {
        set({ userProfileImage: imageUrl });
    },

    /**
     * 크레딧 차감 (로컬)
     */
    deductCredit: (amount = 1) => {
        set(state => ({ userCredit: Math.max(0, state.userCredit - amount) }));
    },

    /**
     * 사용자 정보 초기화 (로그아웃)
     */
    clearUser: () => {
        set({
            user: null,
            userId: null,
            userName: '',
            userEmail: '',
            userCredit: 0,
            userFullBodyImage: null,
            userProfileImage: null,
            isProfileComplete: false,
            gender: '',
            birthday: null,
            province: '',
            city: '',
            hairColor: '',
            personalColor: '',
            height: null,
            weight: null,
            bodyType: '',
            preferredStyles: [],
            userLastFetchedAt: null,
            userError: null,
        });
    },

    /**
     * 캐시 무효화
     */
    invalidateUser: () => {
        set({ userLastFetchedAt: null });
    },

    /**
     * 캐시 상태 확인
     */
    isUserStale: () => {
        const { userLastFetchedAt } = get();
        if (!userLastFetchedAt) return true;
        return Date.now() - userLastFetchedAt > USER_CACHE_DURATION;
    },

    /**
     * 토큰 유효성 확인 (로그인 페이지용)
     * @returns {Promise<{isValid: boolean, isProfileComplete: boolean}>}
     */
    checkTokenValidity: async () => {
        const token = getToken();
        if (!token) {
            return { isValid: false, isProfileComplete: false };
        }

        try {
            const user = await get().fetchUser(true);
            if (user) {
                return { isValid: true, isProfileComplete: user.isProfileComplete || false };
            }
            return { isValid: false, isProfileComplete: false };
        } catch (error) {
            return { isValid: false, isProfileComplete: false };
        }
    },
}));
