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

// 안전하게 storage에 접근하는 헬퍼 함수
const safeSetItem = (key, value) => {
    try {
        sessionStorage.setItem(key, value);
        return true;
    } catch (e) {
        console.warn('[VTO Storage] Storage quota exceeded, clearing old results');
        // 용량 초과 시 기존 결과 정리 후 재시도
        sessionStorage.removeItem(key);
        try {
            sessionStorage.setItem(key, value);
            return true;
        } catch (e2) {
            console.error('[VTO Storage] Failed to save even after clearing:', e2);
            return false;
        }
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
    // 최대 10개 저장 (타입별 5개씩)
    const trimmed = results.slice(0, 10);
    safeSetItem(VTO_STORAGE_KEY, JSON.stringify(trimmed));
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

