import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    getVtoResults,
    addVtoResult,
    getUnseenVtoCount,
    markAllVtoAsSeen,
    removeVtoResult,
    getPendingJobs,
    addPendingJob,
    removePendingJob,
    hasPendingJobs
} from '../utils/vtoStorage';
import CreditConfirmModal from '../components/CreditConfirmModal';

const VtoContext = createContext();

export const useVto = () => {
    const context = useContext(VtoContext);
    if (!context) {
        throw new Error('useVto must be used within a VtoProvider');
    }
    return context;
};

export const VtoProvider = ({ children }) => {
    const [vtoLoadingPosts, setVtoLoadingPosts] = useState(new Set());
    const [vtoCompletedPosts, setVtoCompletedPosts] = useState(new Set());
    const [vtoResults, setVtoResults] = useState([]);
    const [unseenCount, setUnseenCount] = useState(0);
    const [toastMessage, setToastMessage] = useState('');
    const [isVtoModalOpen, setIsVtoModalOpen] = useState(false);

    // 크레딧 모달 상태
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [pendingVtoRequest, setPendingVtoRequest] = useState(null);
    const [userCredit, setUserCredit] = useState(0);
    const [isCreditLoading, setIsCreditLoading] = useState(false);

    // 부분 VTO 로딩 상태 (메인/추천 페이지용) - 소스별로 분리
    const [partialVtoLoadingSources, setPartialVtoLoadingSources] = useState(new Set());

    // 플라이 애니메이션 상태
    const [flyAnimation, setFlyAnimation] = useState(null);

    // 초기 데이터 로드
    useEffect(() => {
        refreshVtoData();
        fetchUserCredit();
    }, []);

    const fetchUserCredit = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;
            const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
            const response = await fetch(`${backendUrl}/user/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUserCredit(data.credit || 0);
            }
        } catch (error) {
            console.error('Failed to fetch credit:', error);
        }
    };

    const refreshVtoData = () => {
        setVtoResults(getVtoResults());
        setUnseenCount(getUnseenVtoCount());
    };

    const openVtoModal = () => {
        markAllVtoAsSeen();
        setUnseenCount(0);
        setIsVtoModalOpen(true);
    };

    const closeVtoModal = () => {
        setIsVtoModalOpen(false);
        refreshVtoData();
    };

    // 크레딧 확인 후 VTO 요청 (모든 VTO 요청에서 사용) - 버튼 위치도 함께 저장
    const requestVtoWithCreditCheck = useCallback((requestType, requestData, buttonPosition = null) => {
        fetchUserCredit(); // 최신 크레딧 조회
        setPendingVtoRequest({ type: requestType, data: requestData, buttonPosition });
        setShowCreditModal(true);
    }, []);

    // 크레딧 모달에서 확인 클릭 시 - 모달 닫고 딜레이 후 플라이 애니메이션 + 백그라운드 실행
    const handleCreditConfirm = async () => {
        if (!pendingVtoRequest) return;

        // 모달 즉시 닫기
        setShowCreditModal(false);
        const request = pendingVtoRequest;
        setPendingVtoRequest(null);

        // 모달이 완전히 닫힌 후 애니메이션 시작 (300ms 딜레이)
        setTimeout(() => {
            // 플라이 애니메이션 트리거
            if (request.buttonPosition) {
                const headerButton = document.getElementById('vto-header-button');
                if (headerButton) {
                    const headerRect = headerButton.getBoundingClientRect();
                    setFlyAnimation({
                        startX: request.buttonPosition.x,
                        startY: request.buttonPosition.y,
                        endX: headerRect.left + headerRect.width / 2,
                        endY: headerRect.top + headerRect.height / 2,
                    });
                    setTimeout(() => setFlyAnimation(null), 600);
                }
            }

            // VTO 요청 실행
            if (request.type === 'sns') {
                executeVtoRequest(request.data.postId);
            } else if (request.type === 'partial') {
                executePartialVtoRequest(request.data.formData, request.source);
            } else if (request.type === 'partialByIds') {
                executePartialVtoByIds(request.data.clothingIds, request.source);
            }
        }, 300);
    };

    // 크레딧 모달 닫기
    const handleCreditCancel = () => {
        setShowCreditModal(false);
        setPendingVtoRequest(null);
    };

    // 실제 SNS VTO 요청 실행 (큐 기반 Polling 방식)
    const executeVtoRequest = async (postId) => {
        if (vtoLoadingPosts.has(postId) || vtoCompletedPosts.has(postId)) return;

        setVtoLoadingPosts(prev => new Set([...prev, postId]));

        try {
            const token = localStorage.getItem('accessToken');
            const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

            // Step 1: 큐에 작업 등록 → jobId 즉시 반환
            const response = await fetch(`${backendUrl}/api/fitting/sns-virtual-try-on`, {
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

            // 큐 방식인 경우 polling
            if (queueResult.jobId && queueResult.status === 'queued') {
                console.log('[VTO] Job queued, polling for result:', queueResult.jobId);

                // Step 2: Polling으로 결과 대기
                const pollInterval = 1000;
                const maxPolls = 300; // 5분
                let pollCount = 0;

                const pollForResult = async () => {
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
                                if (data.success) {
                                    addVtoResult({
                                        imageUrl: data.imageUrl,
                                        postId: postId,
                                        appliedClothing: data.appliedClothing,
                                    });
                                    setVtoCompletedPosts(prev => new Set([...prev, postId]));
                                    refreshVtoData();
                                    setToastMessage('착장 완료!');
                                    setTimeout(() => setToastMessage(''), 3000);
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
                };

                await pollForResult();
            } else if (queueResult.success && queueResult.imageUrl) {
                // 기존 동기 방식 응답 (fallback)
                addVtoResult({
                    imageUrl: queueResult.imageUrl,
                    postId: postId,
                    appliedClothing: queueResult.appliedClothing,
                });
                setVtoCompletedPosts(prev => new Set([...prev, postId]));
                refreshVtoData();
                setToastMessage('착장 완료!');
                setTimeout(() => setToastMessage(''), 3000);
            }
        } catch (error) {
            console.error('VTO Error:', error);
            setToastMessage(`오류: ${error.message}`);
            setTimeout(() => setToastMessage(''), 3000);
        } finally {
            setVtoLoadingPosts(prev => {
                const next = new Set(prev);
                next.delete(postId);
                return next;
            });
        }
    };

    // 기존 requestVto - 크레딧 확인 포함 버전으로 변경 (버튼 위치 포함)
    const requestVto = (postId, buttonPosition = null) => {
        requestVtoWithCreditCheck('sns', { postId }, buttonPosition);
    };

    // 실제 Partial VTO 요청 실행
    const executePartialVtoRequest = async (formData, source = 'default') => {
        const jobId = 'direct-fitting-' + Date.now();
        setVtoLoadingPosts(prev => new Set([...prev, jobId]));
        setPartialVtoLoadingSources(prev => new Set(prev).add(source));

        try {
            const token = localStorage.getItem('accessToken');
            const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

            const response = await fetch(`${backendUrl}/api/fitting/partial-try-on`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '가상 피팅에 실패했습니다.');
            }

            if (data.success) {
                addVtoResult({
                    imageUrl: data.imageUrl,
                    postId: 'direct-fitting',
                    appliedClothing: data.itemsProcessed,
                    isDirect: true
                });
                refreshVtoData();

                setToastMessage('가상 피팅 완료!');
                setTimeout(() => setToastMessage(''), 3000);
                return data;
            }
        } catch (error) {
            console.error('Partial VTO Error:', error);
            setToastMessage(`오류: ${error.message}`);
            setTimeout(() => setToastMessage(''), 3000);
            throw error;
        } finally {
            setVtoLoadingPosts(prev => {
                const next = new Set(prev);
                next.delete(jobId);
                return next;
            });
            setPartialVtoLoadingSources(prev => {
                const next = new Set(prev);
                next.delete(source);
                return next;
            });
        }
    };

    // 기존 requestPartialVto - 크레딧 확인 포함 버전으로 변경
    const requestPartialVto = (formData, buttonPosition = null, source = 'default') => {
        return new Promise((resolve, reject) => {
            fetchUserCredit();
            setPendingVtoRequest({
                type: 'partial',
                data: { formData },
                buttonPosition,
                source,
                resolve,
                reject
            });
            setShowCreditModal(true);
        });
    };

    // ID 기반 Partial VTO 요청 실행 (큐 기반 Polling 방식)
    const executePartialVtoByIds = async (clothingIds, source = 'default') => {
        const localJobId = 'direct-fitting-' + Date.now();
        setVtoLoadingPosts(prev => new Set([...prev, localJobId]));
        setPartialVtoLoadingSources(prev => new Set(prev).add(source));

        try {
            const token = localStorage.getItem('accessToken');
            const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

            // Step 1: 큐에 작업 등록 → jobId 즉시 반환
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

            // 큐 방식인 경우 polling
            if (queueResult.jobId && queueResult.status === 'queued') {
                console.log('[Partial VTO] Job queued, polling for result:', queueResult.jobId);

                // Step 2: Polling으로 결과 대기
                const pollInterval = 1000;
                const maxPolls = 300; // 5분
                let pollCount = 0;

                const pollForResult = async () => {
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
                                    addVtoResult({
                                        imageUrl: data.imageUrl,
                                        postId: 'direct-fitting',
                                        appliedClothing: data.itemsProcessed,
                                        isDirect: true
                                    });
                                    refreshVtoData();
                                    setToastMessage('가상 피팅 완료!');
                                    setTimeout(() => setToastMessage(''), 3000);
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
                };

                return await pollForResult();
            } else if (queueResult.success && queueResult.imageUrl) {
                // 기존 동기 방식 응답 (fallback)
                addVtoResult({
                    imageUrl: queueResult.imageUrl,
                    postId: 'direct-fitting',
                    appliedClothing: queueResult.itemsProcessed,
                    isDirect: true
                });
                refreshVtoData();
                setToastMessage('가상 피팅 완료!');
                setTimeout(() => setToastMessage(''), 3000);
                return queueResult;
            }
        } catch (error) {
            console.error('Partial VTO by IDs Error:', error);
            setToastMessage(`오류: ${error.message}`);
            setTimeout(() => setToastMessage(''), 3000);
            throw error;
        } finally {
            setVtoLoadingPosts(prev => {
                const next = new Set(prev);
                next.delete(localJobId);
                return next;
            });
            setPartialVtoLoadingSources(prev => {
                const next = new Set(prev);
                next.delete(source);
                return next;
            });
        }
    };

    // ID 기반 Partial VTO 요청 - 크레딧 확인 포함
    const requestPartialVtoByIds = (clothingIds, buttonPosition = null, source = 'default') => {
        return new Promise((resolve, reject) => {
            fetchUserCredit();
            setPendingVtoRequest({
                type: 'partialByIds',
                data: { clothingIds },
                buttonPosition,
                source,
                resolve,
                reject
            });
            setShowCreditModal(true);
        });
    };

    const deleteVtoResult = (id) => {
        // 삭제할 결과에서 postId 찾기
        const resultToDelete = vtoResults.find(r => r.id === id);
        const postIdToRemove = resultToDelete?.postId;

        // localStorage에서 삭제
        removeVtoResult(id);
        refreshVtoData();

        // completedPosts에서도 해당 postId 제거 (버튼 상태 초기화)
        if (postIdToRemove && postIdToRemove !== 'direct-fitting') {
            setVtoCompletedPosts(prev => {
                const next = new Set(prev);
                next.delete(postIdToRemove);
                return next;
            });
        }
    };

    const checkPartialVtoLoading = (source) => partialVtoLoadingSources.has(source);

    const value = {
        vtoLoadingPosts,
        vtoCompletedPosts,
        isAnyVtoLoading: vtoLoadingPosts.size > 0 || partialVtoLoadingSources.size > 0,
        checkPartialVtoLoading,
        vtoResults,
        unseenCount,
        toastMessage,
        isVtoModalOpen,
        userCredit,
        flyAnimation,
        openVtoModal,
        closeVtoModal,
        requestVto,
        requestPartialVto,
        requestPartialVtoByIds,
        deleteVtoResult,
        refreshVtoData,
        fetchUserCredit
    };

    return (
        <VtoContext.Provider value={value}>
            {children}

            {/* 크레딧 확인 모달 */}
            <CreditConfirmModal
                isOpen={showCreditModal}
                onClose={handleCreditCancel}
                onConfirm={handleCreditConfirm}
                currentCredit={userCredit}
                requiredCredit={3}
                isLoading={isCreditLoading}
            />
        </VtoContext.Provider>
    );
};
