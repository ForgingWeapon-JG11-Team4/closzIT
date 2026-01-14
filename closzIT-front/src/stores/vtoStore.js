import { create } from 'zustand';
import {
    getVtoResults,
    addVtoResult as addVtoResultToStorage,
    getUnseenVtoCount,
    markAllVtoAsSeen,
    removeVtoResult as removeVtoResultFromStorage,
} from '../utils/vtoStorage';
import { useUserStore } from './userStore';

const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

const getToken = () => localStorage.getItem('accessToken');

export const useVtoStore = create((set, get) => ({
    // ========== State ==========
    vtoLoadingPosts: new Set(),
    vtoCompletedPosts: new Set(),
    vtoResults: [],
    unseenCount: 0,
    toastMessage: '',
    isVtoModalOpen: false,
    showCreditModal: false,
    pendingVtoRequest: null,
    userCredit: 0,
    isCreditLoading: false,
    partialVtoLoadingSources: new Set(),
    flyAnimation: null,

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

    refreshVtoData: () => {
        set({
            vtoResults: getVtoResults(),
            unseenCount: getUnseenVtoCount(),
        });
    },

    openVtoModal: () => {
        markAllVtoAsSeen();
        set({ unseenCount: 0, isVtoModalOpen: true });
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
                    setTimeout(() => set({ flyAnimation: null }), 600);
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
                                addVtoResultToStorage({
                                    imageUrl: data.imageUrl,
                                    postId: postId,
                                    appliedClothing: data.appliedClothing,
                                });
                                set((state) => ({
                                    vtoCompletedPosts: new Set([...state.vtoCompletedPosts, postId])
                                }));
                                get().refreshVtoData();
                                get().setToastMessage('착장 완료!');
                            } else if (!data) {
                                console.warn('[VTO] Job completed but result is null, retrying...');
                                continue;
                            }
                            return;
                        } else if (statusResult.status === 'failed') {
                            throw new Error(statusResult.error || 'VTO 작업이 실패했습니다.');
                        }
                    } catch (pollError) {
                        console.error('[VTO] Poll error:', pollError);
                    }
                }
                throw new Error('VTO 작업 시간이 초과되었습니다.');
            } else if (queueResult.success && queueResult.imageUrl) {
                addVtoResultToStorage({
                    imageUrl: queueResult.imageUrl,
                    postId: postId,
                    appliedClothing: queueResult.appliedClothing,
                });
                set((state) => ({
                    vtoCompletedPosts: new Set([...state.vtoCompletedPosts, postId])
                }));
                get().refreshVtoData();
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

    // Partial VTO 실행
    executePartialVtoRequest: async (formData, source = 'default') => {
        const jobId = 'direct-fitting-' + Date.now();
        set((state) => ({
            vtoLoadingPosts: new Set([...state.vtoLoadingPosts, jobId]),
            partialVtoLoadingSources: new Set(state.partialVtoLoadingSources).add(source),
        }));

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
                });
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
                const nextLoading = new Set(state.vtoLoadingPosts);
                nextLoading.delete(jobId);
                const nextSources = new Set(state.partialVtoLoadingSources);
                nextSources.delete(source);
                return { vtoLoadingPosts: nextLoading, partialVtoLoadingSources: nextSources };
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

    // ID 기반 Partial VTO 실행
    executePartialVtoByIds: async (clothingIds, source = 'default') => {
        const localJobId = 'direct-fitting-' + Date.now();
        set((state) => ({
            vtoLoadingPosts: new Set([...state.vtoLoadingPosts, localJobId]),
            partialVtoLoadingSources: new Set(state.partialVtoLoadingSources).add(source),
        }));

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
                            if (data.success) {
                                addVtoResultToStorage({
                                    imageUrl: data.imageUrl,
                                    postId: 'direct-fitting',
                                    appliedClothing: data.itemsProcessed,
                                    isDirect: true
                                });
                                get().refreshVtoData();
                                get().setToastMessage('가상 피팅 완료!');
                                return data;
                            }
                            return;
                        } else if (statusResult.status === 'failed') {
                            throw new Error(statusResult.error || 'VTO 작업이 실패했습니다.');
                        }
                    } catch (pollError) {
                        console.error('[Partial VTO] Poll error:', pollError);
                    }
                }
                throw new Error('VTO 작업 시간이 초과되었습니다.');
            } else if (queueResult.success && queueResult.imageUrl) {
                addVtoResultToStorage({
                    imageUrl: queueResult.imageUrl,
                    postId: 'direct-fitting',
                    appliedClothing: queueResult.itemsProcessed,
                    isDirect: true
                });
                get().refreshVtoData();
                get().setToastMessage('가상 피팅 완료!');
                return queueResult;
            }
        } catch (error) {
            console.error('Partial VTO by IDs Error:', error);
            get().setToastMessage(`오류: ${error.message}`);
            throw error;
        } finally {
            set((state) => {
                const nextLoading = new Set(state.vtoLoadingPosts);
                nextLoading.delete(localJobId);
                const nextSources = new Set(state.partialVtoLoadingSources);
                nextSources.delete(source);
                return { vtoLoadingPosts: nextLoading, partialVtoLoadingSources: nextSources };
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

    deleteVtoResult: (id) => {
        const { vtoResults } = get();
        const resultToDelete = vtoResults.find(r => r.id === id);
        const postIdToRemove = resultToDelete?.postId;

        removeVtoResultFromStorage(id);
        get().refreshVtoData();

        if (postIdToRemove && postIdToRemove !== 'direct-fitting') {
            set((state) => {
                const next = new Set(state.vtoCompletedPosts);
                next.delete(postIdToRemove);
                return { vtoCompletedPosts: next };
            });
        }
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
