/**
 * VTO 결과를 localStorage에서 관리하는 유틸리티
 */

const VTO_STORAGE_KEY = 'vto_results';

export const getVtoResults = () => {
    try {
        const stored = localStorage.getItem(VTO_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

export const addVtoResult = (result) => {
    const results = getVtoResults();
    const newResult = {
        id: Date.now().toString(),
        ...result,
        createdAt: new Date().toISOString(),
        seen: false, // 새로 추가: 확인 여부
    };
    results.unshift(newResult);
    // 최대 10개만 저장
    const trimmed = results.slice(0, 10);
    localStorage.setItem(VTO_STORAGE_KEY, JSON.stringify(trimmed));
    return newResult;
};

export const removeVtoResult = (id) => {
    const results = getVtoResults();
    const filtered = results.filter(r => r.id !== id);
    localStorage.setItem(VTO_STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
};

export const clearVtoResults = () => {
    localStorage.removeItem(VTO_STORAGE_KEY);
};

export const getVtoResultCount = () => {
    return getVtoResults().length;
};

// 새로 추가: 확인하지 않은 결과 수
export const getUnseenVtoCount = () => {
    const results = getVtoResults();
    return results.filter(r => !r.seen).length;
};

// 새로 추가: 모든 결과를 확인됨으로 표시
export const markAllVtoAsSeen = () => {
    const results = getVtoResults();
    const updated = results.map(r => ({ ...r, seen: true }));
    localStorage.setItem(VTO_STORAGE_KEY, JSON.stringify(updated));
    return updated;
};

// ========== Pending Jobs 관리 ==========
const PENDING_JOBS_KEY = 'vto_pending_jobs';

export const getPendingJobs = () => {
    try {
        const stored = localStorage.getItem(PENDING_JOBS_KEY);
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
    localStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(jobs));
    return newJob;
};

export const removePendingJob = (jobId) => {
    const jobs = getPendingJobs();
    const filtered = jobs.filter(j => j.jobId !== jobId);
    localStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(filtered));
    return filtered;
};

export const hasPendingJobs = () => {
    return getPendingJobs().length > 0;
};

export const clearPendingJobs = () => {
    localStorage.removeItem(PENDING_JOBS_KEY);
};
