import { create } from 'zustand';

const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
const getToken = () => localStorage.getItem('accessToken');

// 캐시 유효 시간 (밀리초)
const WEATHER_CACHE_DURATION = 60 * 60 * 1000; // 1시간
const EVENTS_CACHE_DURATION = 5 * 60 * 1000;   // 5분 (SWR 백그라운드 갱신용)

export const useAppStore = create((set, get) => ({
    // ========== 날씨 상태 ==========
    weather: { temperature: null, condition: '로딩중...' },
    userLocation: '로딩중...',
    weatherLastFetchedAt: null,
    isWeatherLoading: false,

    // ========== 일정 상태 ==========
    upcomingEvents: [],
    eventsLastFetchedAt: null,
    isEventsLoading: false,

    // ========== 사용자 정보 ==========
    userName: '',
    userFullBodyImage: null,

    // ========== 날씨 Actions ==========
    fetchWeather: async (force = false) => {
        const { weatherLastFetchedAt, isWeatherLoading } = get();
        const now = Date.now();

        // 이미 로딩 중이면 스킵
        if (isWeatherLoading) return;

        // 강제 갱신이 아니고, 캐시가 유효하면 스킵
        if (!force && weatherLastFetchedAt && (now - weatherLastFetchedAt < WEATHER_CACHE_DURATION)) {
            return;
        }

        set({ isWeatherLoading: true });

        try {
            const token = getToken();
            if (!token) {
                set({ isWeatherLoading: false });
                return;
            }

            const response = await fetch(`${backendUrl}/weather/current`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                set({
                    weather: {
                        temperature: data.temperature,
                        condition: data.condition || '맑음',
                    },
                    userLocation: data.location || get().userLocation,
                    weatherLastFetchedAt: Date.now(),
                });
            }
        } catch (error) {
            console.error('Weather API error:', error);
            set({
                weather: { temperature: 8, condition: '맑음' },
            });
        } finally {
            set({ isWeatherLoading: false });
        }
    },

    // ========== 일정 Actions (Stale-While-Revalidate) ==========
    fetchUpcomingEvents: async (force = false) => {
        const { eventsLastFetchedAt, isEventsLoading, upcomingEvents } = get();
        const now = Date.now();

        // 이미 로딩 중이면 스킵
        if (isEventsLoading) return;

        const cacheValid = eventsLastFetchedAt && (now - eventsLastFetchedAt < EVENTS_CACHE_DURATION);

        // 캐시된 데이터가 있으면 먼저 반환 (SWR: Stale)
        // 캐시가 유효하고 강제 갱신이 아니면 스킵
        if (!force && cacheValid) {
            return;
        }

        // 캐시된 데이터가 있지만 stale한 경우: 백그라운드에서 갱신 (SWR: Revalidate)
        // 캐시된 데이터가 없는 경우: 로딩 표시
        if (upcomingEvents.length === 0) {
            set({ isEventsLoading: true });
        }

        try {
            const token = getToken();
            if (!token) {
                set({ isEventsLoading: false });
                return;
            }

            const response = await fetch(`${backendUrl}/calendar/upcoming`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                const events = data.events || [];

                const upcoming = events.slice(0, 2).map(event => ({
                    date: event.date,
                    time: event.time,
                    title: event.title,
                    isToday: event.isToday,
                }));

                set({
                    upcomingEvents: upcoming,
                    eventsLastFetchedAt: Date.now(),
                });
            }
        } catch (error) {
            console.error('Calendar API error:', error);
        } finally {
            set({ isEventsLoading: false });
        }
    },

    // ========== 사용자 정보 Actions ==========
    fetchUserInfo: async () => {
        try {
            const token = getToken();
            if (!token) return;

            const response = await fetch(`${backendUrl}/user/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                set({
                    userName: data.name || '',
                    userFullBodyImage: data.fullBodyImage || null,
                });
            }
        } catch (error) {
            console.error('User info error:', error);
        }
    },

    // ========== 초기화 ==========
    initialize: () => {
        get().fetchWeather();
        get().fetchUpcomingEvents();
        get().fetchUserInfo();
    },

    // ========== 캐시 무효화 ==========
    invalidateWeather: () => {
        set({ weatherLastFetchedAt: null });
    },

    invalidateEvents: () => {
        set({ eventsLastFetchedAt: null });
    },

    // ========== Getter: 캐시 상태 확인 ==========
    isWeatherStale: () => {
        const { weatherLastFetchedAt } = get();
        if (!weatherLastFetchedAt) return true;
        return Date.now() - weatherLastFetchedAt > WEATHER_CACHE_DURATION;
    },

    isEventsStale: () => {
        const { eventsLastFetchedAt } = get();
        if (!eventsLastFetchedAt) return true;
        return Date.now() - eventsLastFetchedAt > EVENTS_CACHE_DURATION;
    },
}));

// 앱 시작 시 초기화
if (typeof window !== 'undefined') {
    // 페이지 로드 시 초기화
    useAppStore.getState().initialize();

    // 탭 포커스 복귀 시 일정 백그라운드 갱신 (SWR)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            const { isEventsStale, fetchUpcomingEvents } = useAppStore.getState();
            if (isEventsStale()) {
                fetchUpcomingEvents();
            }
        }
    });
}
