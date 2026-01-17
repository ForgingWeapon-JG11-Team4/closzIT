import { create } from 'zustand';
import {
    addVtoResult as addVtoResultToStorage,
    markAllVtoAsSeen,
    removeVtoResult as removeVtoResultFromStorage,
    getSingleVtoResults,
    getUnseenSingleVtoCount,
    VTO_TYPE_FULL,
    VTO_TYPE_SINGLE,
} from '../utils/vtoStorage';
import { useUserStore } from './userStore';

const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

const getToken = () => localStorage.getItem('accessToken');

export const useVtoStore = create((set, get) => ({
    // ========== State ==========
    vtoLoadingPosts: new Set(),
    vtoCompletedPosts: new Set(),
    vtoResults: [],
    fullVtoResults: [],      // 전체 입어보기 결과
    singleVtoResults: [],    // 원클릭 입어보기 결과
    unseenCount: 0,
    unseenFullCount: 0,      // 전체 입어보기 unseen
    unseenSingleCount: 0,    // 원클릭 입어보기 unseen
    activeVtoTab: 'full',    // 현재 활성 탭: 'full' | 'single'
    toastMessage: '',
    isVtoModalOpen: false,
    showCreditModal: false,
    pendingVtoRequest: null,
    userCredit: 0,
    isCreditLoading: false,
    partialVtoLoadingSources: new Set(),
    partialVtoLoadingCount: 0,  // Set 변경 감지를 위한 카운터
    singleItemLoadingCount: 0,  // "하나만 입어보기" 전용 카운터 (헤더 로딩용)
    flyAnimation: null,
    showCompletionGlow: false,  // 플라이 애니메이션 완료 후 파란색 테두리 펄스 표시

    // ========== Actions ==========

    // 초기 데이터 로드
    initialize: () => {
        get().refreshVtoData();
        get().fetchUserCredit();
    },

    fetchUserCredit: async () => {
        // userStore에서 크레딧 가져오기
        const { fetchUser, userCredit } = useUserStore.getState();
        await fetchUser();
        const { userCredit: updatedCredit } = useUserStore.getState();
        set({ userCredit: updatedCredit });
    },

    refreshVtoData: async () => {
        // 원클릭 입어보기는 기존 sessionStorage에서 가져옴
        const singleResults = getSingleVtoResults();
        const unseenSingleCount = getUnseenSingleVtoCount();

        // 전체 입어보기는 DB API에서 가져옴
        let fullResults = [];
        try {
            const token = getToken();
            if (token) {
                const response = await fetch(`${backendUrl}/api/fitting/vto-history`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.results) {
                        fullResults = data.results.map(r => ({
                            id: r.id,
                            postId: r.postId,
                            imageUrl: r.imageUrl,
                            createdAt: r.createdAt,
                            type: 'full',
                            seen: true,
                        }));
                    }
                }
            }
        } catch (error) {
            console.error('[VTO] Failed to fetch VTO history:', error);
            // 실패 시 빈 배열 유지
        }

        set({
            vtoResults: [...fullResults, ...singleResults],
            fullVtoResults: fullResults,
            singleVtoResults: singleResults,
            unseenCount: unseenSingleCount,
            unseenFullCount: 0,
            unseenSingleCount: unseenSingleCount,
        });
    },

    setActiveVtoTab: (tab) => {
        set({ activeVtoTab: tab });
    },

    openVtoModal: () => {
        markAllVtoAsSeen();
        set({ unseenCount: 0, unseenFullCount: 0, unseenSingleCount: 0, isVtoModalOpen: true });
    },

    closeVtoModal: () => {
        set({ isVtoModalOpen: false });
        get().refreshVtoData();
    },

    setToastMessage: (message) => {
        set({ toastMessage: message });
        if (message) {
            setTimeout(() => set({ toastMessage: '' }), 3000);
        }
    },

    // 크레딧 확인 후 VTO 요청
    requestVtoWithCreditCheck: (requestType, requestData, buttonPosition = null) => {
        get().fetchUserCredit();
        set({
            pendingVtoRequest: { type: requestType, data: requestData, buttonPosition },
            showCreditModal: true,
        });
    },

    // 크레딧 모달 확인
    handleCreditConfirm: async () => {
        const { pendingVtoRequest } = get();
        if (!pendingVtoRequest) return;

        set({ showCreditModal: false });
        const request = pendingVtoRequest;
        set({ pendingVtoRequest: null });

        setTimeout(() => {
            // 플라이 애니메이션 트리거
            if (request.buttonPosition) {
                const headerButton = document.getElementById('vto-header-button');
                if (headerButton) {
                    const headerRect = headerButton.getBoundingClientRect();
                    set({
                        flyAnimation: {
                            startX: request.buttonPosition.x,
                            startY: request.buttonPosition.y,
                            endX: headerRect.left + headerRect.width / 2,
                            endY: headerRect.top + headerRect.height / 2,
                        }
                    });
                    // 플라이 애니메이션 완료 후 completion glow 활성화
                    setTimeout(() => {
                        set({ flyAnimation: null, showCompletionGlow: true });
                        // 1.5초 후 glow 비활성화 (3회 펄스 애니메이션)
                        setTimeout(() => set({ showCompletionGlow: false }), 1500);
                    }, 600);
                }
            }

            // VTO 요청 실행
            if (request.type === 'sns') {
                get().executeVtoRequest(request.data.postId);
            } else if (request.type === 'partial') {
                get().executePartialVtoRequest(request.data.formData, request.source);
            } else if (request.type === 'partialByIds') {
                get().executePartialVtoByIds(request.data.clothingIds, request.source);
            }
        }, 300);
    },

    handleCreditCancel: () => {
        set({ showCreditModal: false, pendingVtoRequest: null });
    },

    // SNS VTO 요청 실행
    executeVtoRequest: async (postId) => {
        const { vtoLoadingPosts, vtoCompletedPosts } = get();
        if (vtoLoadingPosts.has(postId) || vtoCompletedPosts.has(postId)) return;

        set({ vtoLoadingPosts: new Set([...vtoLoadingPosts, postId]) });

        try {
            const token = getToken();

            const response = await fetch(`${backendUrl}/api/fitting/sns-full-try-on`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ postId }),
            });

            const queueResult = await response.json();

            if (!response.ok) {
                if (queueResult.code === 'NO_FULL_BODY_IMAGE') {
                    const confirm = window.confirm(
                        '피팅 모델 이미지가 없어서 착장서비스 이용이 불가합니다. 등록하시겠습니까?'
                    );
                    if (confirm) {
                        alert('피팅 모델 이미지 등록 기능은 준비 중입니다.');
                    }
                    return;
                }
                throw new Error(queueResult.message || '가상 착장에 실패했습니다.');
            }

            if (queueResult.jobId && queueResult.status === 'queued') {
                console.log('[VTO] Job queued, polling for result:', queueResult.jobId);

                const pollInterval = 1000;
                const maxPolls = 300;
                let pollCount = 0;

                while (pollCount < maxPolls) {
                    pollCount++;
                    await new Promise(resolve => setTimeout(resolve, pollInterval));

                    try {
                        const statusResponse = await fetch(`${backendUrl}/queue/job/vto/${queueResult.jobId}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });

                        if (!statusResponse.ok) continue;

                        const statusResult = await statusResponse.json();
                        console.log('[VTO] Poll result:', statusResult.status);

                        if (statusResult.status === 'completed') {
                            const data = statusResult.result;
                            if (data && data.success) {
                                // DB에 저장되었으므로 refreshVtoData로 가져옴
                                set((state) => ({
                                    vtoCompletedPosts: new Set([...state.vtoCompletedPosts, postId])
                                }));
                                await get().refreshVtoData();
                                get().setToastMessage('착장 완료!');
                            } else if (!data) {
                                console.warn('[VTO] Job completed but result is null, retrying...');
                                continue;
                            }
                            return;
                        } else if (statusResult.status === 'failed') {
                            // 에러를 throw하지 않고 직접 처리하여 루프 탈출
                            const errorMsg = statusResult.error || 'VTO 작업이 실패했습니다.';
                            console.error('[VTO] Job failed:', errorMsg);
                            throw new Error(errorMsg);
                        }
                    } catch (pollError) {
                        // 네트워크 에러 등 예외 상황만 여기서 처리
                        // 'failed' 상태에서 throw된 에러도 여기서 잡히므로 바로 상위로 전파
                        console.error('[VTO] Error:', pollError.message);
                        throw pollError;
                    }
                }
                throw new Error('VTO 작업 시간이 초과되었습니다.');
            } else if (queueResult.success && queueResult.imageUrl) {
                // 캐시 히트된 경우 - DB에서 refreshVtoData로 가져옴
                set((state) => ({
                    vtoCompletedPosts: new Set([...state.vtoCompletedPosts, postId])
                }));
                await get().refreshVtoData();
                get().setToastMessage('착장 완료!');
            }
        } catch (error) {
            console.error('VTO Error:', error);
            get().setToastMessage(`오류: ${error.message}`);
        } finally {
            set((state) => {
                const next = new Set(state.vtoLoadingPosts);
                next.delete(postId);
                return { vtoLoadingPosts: next };
            });
        }
    },

    // SNS VTO 요청 (크레딧 확인 포함)
    requestVto: (postId, buttonPosition = null) => {
        get().requestVtoWithCreditCheck('sns', { postId }, buttonPosition);
    },

    // Single Item Tryon 로딩 시작 (외부에서 호출) - 헤더에 로딩 표시
    startSingleItemLoading: (source = 'fitting-room') => {
        set((state) => {
            const nextSources = new Set(state.partialVtoLoadingSources).add(source);
            const newCount = state.singleItemLoadingCount + 1;
            console.log('[VTO Store] startSingleItemLoading:', { source, newCount });
            return {
                partialVtoLoadingSources: nextSources,
                partialVtoLoadingCount: nextSources.size,
                singleItemLoadingCount: newCount,
            };
        });
    },

    // Single Item Tryon 로딩 종료 (외부에서 호출)
    stopSingleItemLoading: (source = 'fitting-room') => {
        set((state) => {
            const nextSources = new Set(state.partialVtoLoadingSources);
            nextSources.delete(source);
            return {
                partialVtoLoadingSources: nextSources,
                partialVtoLoadingCount: nextSources.size,
                singleItemLoadingCount: Math.max(0, state.singleItemLoadingCount - 1),
            };
        });
    },

    // Partial VTO 실행 (원클릭 입어보기) - partialVtoLoadingSources만 사용
    executePartialVtoRequest: async (formData, source = 'default') => {
        set((state) => {
            const nextSources = new Set(state.partialVtoLoadingSources).add(source);
            return {
                partialVtoLoadingSources: nextSources,
                partialVtoLoadingCount: nextSources.size,
            };
        });

        try {
            const token = getToken();

            const response = await fetch(`${backendUrl}/api/fitting/partial-try-on`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '가상 피팅에 실패했습니다.');
            }

            if (data.success) {
                addVtoResultToStorage({
                    imageUrl: data.imageUrl,
                    postId: 'direct-fitting',
                    appliedClothing: data.itemsProcessed,
                    isDirect: true
                }, VTO_TYPE_SINGLE); // 원클릭 입어보기
                get().refreshVtoData();
                get().setToastMessage('가상 피팅 완료!');
                return data;
            }
        } catch (error) {
            console.error('Partial VTO Error:', error);
            get().setToastMessage(`오류: ${error.message}`);
            throw error;
        } finally {
            set((state) => {
                const nextSources = new Set(state.partialVtoLoadingSources);
                nextSources.delete(source);
                return {
                    partialVtoLoadingSources: nextSources,
                    partialVtoLoadingCount: nextSources.size,
                };
            });
        }
    },

    // Partial VTO 요청 (크레딧 확인 포함)
    requestPartialVto: (formData, buttonPosition = null, source = 'default') => {
        return new Promise((resolve, reject) => {
            get().fetchUserCredit();
            set({
                pendingVtoRequest: {
                    type: 'partial',
                    data: { formData },
                    buttonPosition,
                    source,
                    resolve,
                    reject
                },
                showCreditModal: true,
            });
        });
    },

    // ID 기반 Partial VTO 실행 - partialVtoLoadingSources만 사용 (singleItemLoadingCount는 건드리지 않음)
    executePartialVtoByIds: async (clothingIds, source = 'default') => {
        console.log('[VTO Store] executePartialVtoByIds start:', { source, clothingIds });
        set((state) => {
            const nextSources = new Set(state.partialVtoLoadingSources).add(source);
            console.log('[VTO Store] executePartialVtoByIds - singleItemLoadingCount unchanged:', state.singleItemLoadingCount);
            return {
                partialVtoLoadingSources: nextSources,
                partialVtoLoadingCount: nextSources.size,
            };
        });

        // 선택된 옷 개수에 따라 타입 결정 (2개 이상이면 전체 입어보기)
        const selectedCount = Object.values(clothingIds).filter(id => id).length;
        const resultType = selectedCount >= 2 ? VTO_TYPE_FULL : VTO_TYPE_SINGLE;

        try {
            const token = getToken();

            const response = await fetch(`${backendUrl}/api/fitting/partial-try-on-by-ids`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(clothingIds),
            });

            const queueResult = await response.json();

            if (!response.ok) {
                if (queueResult.code === 'NO_FULL_BODY_IMAGE') {
                    const confirm = window.confirm(
                        '피팅 모델 이미지가 없어서 착장서비스 이용이 불가합니다. 등록하시겠습니까?'
                    );
                    if (confirm) {
                        window.location.href = '/setup3?edit=true';
                    }
                    return;
                }
                throw new Error(queueResult.message || '가상 피팅에 실패했습니다.');
            }

            if (queueResult.jobId && queueResult.status === 'queued') {
                console.log('[Partial VTO] Job queued, polling for result:', queueResult.jobId);

                const pollInterval = 1000;
                const maxPolls = 300;
                let pollCount = 0;

                while (pollCount < maxPolls) {
                    pollCount++;
                    await new Promise(resolve => setTimeout(resolve, pollInterval));

                    try {
                        const statusResponse = await fetch(`${backendUrl}/queue/job/vto/${queueResult.jobId}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });

                        if (!statusResponse.ok) continue;

                        const statusResult = await statusResponse.json();
                        console.log('[Partial VTO] Poll result:', statusResult.status);

                        if (statusResult.status === 'completed') {
                            const data = statusResult.result;
                            if (data && data.success) {
                                // DB에 저장되었으므로 refreshVtoData로 가져옴 (2개 이상 선택 시)
                                if (selectedCount >= 2) {
                                    await get().refreshVtoData();
                                } else {
                                    // 1개만 선택 - sessionStorage에 저장 (기존 동작)
                                    addVtoResultToStorage({
                                        imageUrl: data.imageUrl,
                                        postId: 'direct-fitting',
                                        appliedClothing: data.itemsProcessed,
                                        isDirect: true
                                    }, resultType);
                                }
                                get().refreshVtoData();
                                get().setToastMessage('착장 완료!');
                                return data;
                            } else if (!data) {
                                // result가 아직 Redis에서 로드되지 않은 경우 → 다음 poll 대기
                                console.log('[Partial VTO] Job completed but result not yet available, continuing poll...');
                                continue;
                            }
                            return;
                        } else if (statusResult.status === 'failed') {
                            // 에러를 throw하지 않고 직접 처리하여 루프 탈출
                            const errorMsg = statusResult.error || 'VTO 작업이 실패했습니다.';
                            console.error('[Partial VTO] Job failed:', errorMsg);
                            throw new Error(errorMsg);
                        }
                    } catch (pollError) {
                        // 네트워크 에러 등 예외 상황만 여기서 처리
                        // 'failed' 상태에서 throw된 에러도 여기서 잡히므로 바로 상위로 전파
                        console.error('[Partial VTO] Error:', pollError.message);
                        throw pollError;
                    }
                }
                throw new Error('VTO 작업 시간이 초과되었습니다.');
            } else if (queueResult.success && queueResult.imageUrl) {
                // 캐시 히트 - DB에서 가져옴 (2개 이상 선택 시)
                if (selectedCount >= 2) {
                    await get().refreshVtoData();
                } else {
                    // 1개만 선택 - sessionStorage에 저장
                    addVtoResultToStorage({
                        imageUrl: queueResult.imageUrl,
                        postId: 'direct-fitting',
                        appliedClothing: queueResult.itemsProcessed,
                        isDirect: true
                    }, resultType);
                }
                get().refreshVtoData();
                get().setToastMessage('착장 완료!');
                return queueResult;
            }
        } catch (error) {
            console.error('Partial VTO by IDs Error:', error);
            get().setToastMessage(`오류: ${error.message}`);
            throw error;
        } finally {
            set((state) => {
                const nextSources = new Set(state.partialVtoLoadingSources);
                nextSources.delete(source);
                return {
                    partialVtoLoadingSources: nextSources,
                    partialVtoLoadingCount: nextSources.size,
                };
            });
        }
    },

    // ID 기반 Partial VTO 요청 (크레딧 확인 포함)
    requestPartialVtoByIds: (clothingIds, buttonPosition = null, source = 'default') => {
        return new Promise((resolve, reject) => {
            get().fetchUserCredit();
            set({
                pendingVtoRequest: {
                    type: 'partialByIds',
                    data: { clothingIds },
                    buttonPosition,
                    source,
                    resolve,
                    reject
                },
                showCreditModal: true,
            });
        });
    },

    deleteVtoResult: async (id) => {
        const { fullVtoResults, singleVtoResults } = get();

        // 전체 입어보기 결과인지 확인
        const isFullResult = fullVtoResults.some(r => r.id === id);

        if (isFullResult) {
            // DB API로 숨기기
            try {
                const token = getToken();
                await fetch(`${backendUrl}/api/fitting/vto/${id}/hide`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${token}` },
                });
            } catch (error) {
                console.error('[VTO] Failed to hide VTO result:', error);
            }
        } else {
            // 원클릭 입어보기는 sessionStorage에서 삭제
            removeVtoResultFromStorage(id);
        }

        // 상태 새로고침
        await get().refreshVtoData();
    },

    checkPartialVtoLoading: (source) => get().partialVtoLoadingSources.has(source),

    // computed
    get isAnyVtoLoading() {
        const { vtoLoadingPosts, partialVtoLoadingSources } = get();
        return vtoLoadingPosts.size > 0 || partialVtoLoadingSources.size > 0;
    },
}));

// 앱 시작 시 초기화 (한 번만 실행)
if (typeof window !== 'undefined') {
    useVtoStore.getState().initialize();
}
