/**
 * VTO 결과를 sessionStorage에서 관리하는 유틸리티
 *
 * sessionStorage 사용 이유:
 * 1. 탭별로 독립적인 VTO 결과 관리 (탭 간 충돌 방지)
 * 2. localStorage 5MB 용량 제한 문제 해결
 * 3. 탭 닫으면 자동으로 정리됨 (메모리 누수 방지)
 *
 * 결과 타입:
 * - full: 전체 입어보기 (SNS VTO Queue)
 * - single: 원클릭 입어보기 (Single Item Tryon)
 */

const VTO_STORAGE_KEY = 'vto_results';
const VTO_TYPE_FULL = 'full';
const VTO_TYPE_SINGLE = 'single';

// 단순 저장 헬퍼 (에러만 처리)
const trySetItem = (key, value) => {
    try {
        sessionStorage.setItem(key, value);
        return { success: true };
    } catch (e) {
        const isQuotaError = e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014;
        return { success: false, isQuotaError };
    }
};

// VTO 결과 저장 (용량 초과 시 가장 오래된 항목 삭제)
const saveVtoResults = (results) => {
    const MAX_RETRIES = 10;
    let dataToSave = [...results]; // 복사본 사용

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const { success, isQuotaError } = trySetItem(VTO_STORAGE_KEY, JSON.stringify(dataToSave));

        if (success) {
            return true;
        }

        if (isQuotaError && dataToSave.length > 1) {
            // 가장 오래된 항목(마지막) 제거 - 새로 추가된 첫 번째는 유지
            const removed = dataToSave.pop();
            console.warn(`[VTO Storage] Quota exceeded, removed oldest (attempt ${attempt + 1}):`, removed?.id);
            continue;
        }

        // 용량 에러가 아니거나 삭제할 항목이 없으면 실패
        console.error('[VTO Storage] Failed to save');
        return false;
    }

    console.error('[VTO Storage] Failed after max retries');
    return false;
};

// 일반 키용 safeSetItem (PENDING_JOBS 등)
const safeSetItem = (key, value) => {
    try {
        sessionStorage.setItem(key, value);
        return true;
    } catch (e) {
        console.error('[VTO Storage] Failed to save:', key, e);
        return false;
    }
};

export const getVtoResults = () => {
    try {
        const stored = sessionStorage.getItem(VTO_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

export const addVtoResult = (result, type = VTO_TYPE_FULL) => {
    const results = getVtoResults();
    const newResult = {
        id: Date.now().toString(),
        ...result,
        type, // 'full' 또는 'single'
        createdAt: new Date().toISOString(),
        seen: false, // 새로 추가: 확인 여부
    };
    results.unshift(newResult);
    // 최대 10개 저장
    const trimmed = results.slice(0, 10);
    // 용량 초과 시 가장 오래된 항목부터 삭제하며 저장 시도
    saveVtoResults(trimmed);
    return newResult;
};

// 타입별 결과 조회
export const getVtoResultsByType = (type) => {
    const results = getVtoResults();
    return results.filter(r => r.type === type);
};

// 전체 입어보기 결과만 조회
export const getFullVtoResults = () => getVtoResultsByType(VTO_TYPE_FULL);

// 원클릭 입어보기 결과만 조회
export const getSingleVtoResults = () => getVtoResultsByType(VTO_TYPE_SINGLE);

export const removeVtoResult = (id) => {
    const results = getVtoResults();
    const filtered = results.filter(r => r.id !== id);
    safeSetItem(VTO_STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
};

export const clearVtoResults = () => {
    sessionStorage.removeItem(VTO_STORAGE_KEY);
};

export const getVtoResultCount = () => {
    return getVtoResults().length;
};

// 확인하지 않은 결과 수 (전체)
export const getUnseenVtoCount = () => {
    const results = getVtoResults();
    return results.filter(r => !r.seen).length;
};

// 타입별 확인하지 않은 결과 수
export const getUnseenVtoCountByType = (type) => {
    const results = getVtoResults();
    return results.filter(r => r.type === type && !r.seen).length;
};

// 전체 입어보기 unseen 수
export const getUnseenFullVtoCount = () => getUnseenVtoCountByType(VTO_TYPE_FULL);

// 원클릭 입어보기 unseen 수
export const getUnseenSingleVtoCount = () => getUnseenVtoCountByType(VTO_TYPE_SINGLE);

// 모든 결과를 확인됨으로 표시
export const markAllVtoAsSeen = () => {
    const results = getVtoResults();
    const updated = results.map(r => ({ ...r, seen: true }));
    safeSetItem(VTO_STORAGE_KEY, JSON.stringify(updated));
    return updated;
};

// 타입별 결과를 확인됨으로 표시
export const markVtoAsSeenByType = (type) => {
    const results = getVtoResults();
    const updated = results.map(r => r.type === type ? { ...r, seen: true } : r);
    safeSetItem(VTO_STORAGE_KEY, JSON.stringify(updated));
    return updated;
};

// VTO 타입 상수 export
export { VTO_TYPE_FULL, VTO_TYPE_SINGLE };

// ========== Pending Jobs 관리 ==========
const PENDING_JOBS_KEY = 'vto_pending_jobs';

export const getPendingJobs = () => {
    try {
        const stored = sessionStorage.getItem(PENDING_JOBS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

export const addPendingJob = (jobId, source = 'unknown') => {
    const jobs = getPendingJobs();
    const newJob = {
        jobId,
        source,
        requestedAt: Date.now(),
    };
    jobs.push(newJob);
    safeSetItem(PENDING_JOBS_KEY, JSON.stringify(jobs));
    return newJob;
};

export const removePendingJob = (jobId) => {
    const jobs = getPendingJobs();
    const filtered = jobs.filter(j => j.jobId !== jobId);
    safeSetItem(PENDING_JOBS_KEY, JSON.stringify(filtered));
    return filtered;
};

export const hasPendingJobs = () => {
    return getPendingJobs().length > 0;
};

export const clearPendingJobs = () => {
    sessionStorage.removeItem(PENDING_JOBS_KEY);
};

