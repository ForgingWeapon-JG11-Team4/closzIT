import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVtoStore } from '../stores/vtoStore';
import { useUserStore } from '../stores/userStore';
import VtoResultModal from './VtoResultModal';
import CreditConfirmModal from './CreditConfirmModal';

const SharedHeader = ({
    title,
    showBackButton = false,
    rightContent = null,
    onBackClick = null
}) => {
    const navigate = useNavigate();
    const {
        vtoLoadingPosts,
        partialVtoLoadingSources,
        unseenCount,
        toastMessage,
        isVtoModalOpen,
        flyAnimation,
        openVtoModal,
        closeVtoModal,
        vtoResults,
        refreshVtoData,
        deleteVtoResult,
        showCreditModal,
        userCredit: storeCredit,
        handleCreditConfirm,
        handleCreditCancel,
        isCreditLoading
    } = useVtoStore();

    const isAnyVtoLoading = vtoLoadingPosts.size > 0 || partialVtoLoadingSources.size > 0;
    const { userCredit, fetchUser } = useUserStore();

    // 히스토리 관련 상태
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [history, setHistory] = useState([]);

    // SharedHeader.jsx 내부의 useEffect 수정
    useEffect(() => {
        fetchUser();

        // 데이터를 불러오는 함수
        const loadHistory = () => {
            const saved = JSON.parse(localStorage.getItem('vto_history') || '[]');
            setHistory(saved);
        };

        // 처음 로드할 때 실행
        loadHistory();

        // ⭐ 'historyUpdate' 신호가 오면 loadHistory를 실행하도록 등록
        window.addEventListener('historyUpdate', loadHistory);

        // 컴포넌트가 사라질 때 이벤트 제거 (메모리 관리)
        return () => window.removeEventListener('historyUpdate', loadHistory);
    }, [fetchUser]);

    const handleBack = () => {
        if (onBackClick) {
            onBackClick();
        } else {
            navigate(-1);
        }
    };

    // 개별 삭제 함수
    const deleteHistoryItem = (id) => {
        const updated = history.filter(item => item.id !== id);
        localStorage.setItem('vto_history', JSON.stringify(updated));
        setHistory(updated);
    };

    return (
        <>
            {/* VTO Completion Toast */}
            {toastMessage && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] pointer-events-none animate-fadeIn">
                    <div className="px-4 py-2 rounded-lg shadow-lg bg-[#22C55E] text-white border-2 border-white text-sm font-semibold">
                        {toastMessage}
                    </div>
                </div>
            )}

            {/* Fly Animation */}
            {flyAnimation && (
                <div
                    className="fixed z-[200] pointer-events-none"
                    style={{
                        left: flyAnimation.startX - 16,
                        top: flyAnimation.startY - 16,
                        '--fly-end-x': `${flyAnimation.endX - flyAnimation.startX}px`,
                        '--fly-end-y': `${flyAnimation.endY - flyAnimation.startY}px`,
                        animation: 'flyToHeader 0.6s ease-in-out forwards',
                    }}
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold to-gold-dark shadow-lg flex items-center justify-center">
                        <span className="material-symbols-rounded text-white text-sm">checkroom</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="sticky top-0 z-50 glass-warm border-b border-gold-light/20 px-4 py-3">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {showBackButton && (
                            <button onClick={handleBack} className="w-10 h-10 -ml-2 rounded-full hover:bg-gold-light/20 flex items-center justify-center transition-colors">
                                <span className="material-symbols-rounded text-2xl text-charcoal dark:text-cream">arrow_back</span>
                            </button>
                        )}
                        <h1 onClick={() => navigate('/main')} className="cursor-pointer text-2xl font-bold bg-gradient-to-r from-gold to-gold-dark bg-clip-text text-transparent">
                            {title || 'CloszIT'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* 피팅 & 히스토리 버튼 그룹 */}
                        <div className="flex items-center gap-2 mr-1">
                            {/* 메인 피팅 모달 버튼 */}
                            <div className="relative w-10 h-10">
                                {isAnyVtoLoading && (
                                    <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 0deg, #00D9FF, #0099FF, #00D9FF, #0099FF)', animation: 'spin 1s linear infinite' }} />
                                )}
                                <button onClick={openVtoModal} className={`absolute rounded-full btn-premium flex items-center justify-center ${isAnyVtoLoading ? 'inset-[3px]' : 'inset-0'}`}>
                                    <span className="material-symbols-rounded text-xl">checkroom</span>
                                </button>
                                {unseenCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 z-10">
                                        {unseenCount}
                                    </span>
                                )}
                            </div>

                            {/* 히스토리 모달 버튼 */}
                            <button
                                onClick={() => setIsHistoryModalOpen(true)}
                                className="w-10 h-10 rounded-full bg-white/80 dark:bg-charcoal/80 border border-gold-light/30 shadow-sm flex items-center justify-center hover:bg-gold/10 transition-all relative"
                            >
                                <span className="material-symbols-rounded text-gold text-xl">history</span>
                                {history.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                        {history.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* 프로필 & 크레딧 */}
                        <button onClick={() => navigate('/mypage')} className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-dark text-warm-white shadow-lg flex items-center justify-center">
                            <span className="material-symbols-rounded text-xl">person</span>
                        </button>

                        <button onClick={() => navigate('/credit-shop')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-gold/20 to-gold-light/20 border border-gold/30">
                            <span className="material-symbols-rounded text-base text-gold">monetization_on</span>
                            <span className="text-sm font-semibold text-gold">{userCredit}</span>
                        </button>

                        {rightContent}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <VtoResultModal
                isOpen={isVtoModalOpen}
                onClose={closeVtoModal}
                results={vtoResults}
                onRefresh={refreshVtoData}
                onDelete={deleteVtoResult}
            />

            <CreditConfirmModal
                isOpen={showCreditModal}
                onClose={handleCreditCancel}
                onConfirm={handleCreditConfirm}
                currentCredit={storeCredit}
                requiredCredit={3}
                isLoading={isCreditLoading}
            />

            {/* 히스토리 모달 UI */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center animate-fadeIn" onClick={() => setIsHistoryModalOpen(false)}>
                    <div className="bg-warm-white dark:bg-[#1A1918] w-full max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-slideUp flex flex-col max-h-[70vh]" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gold-light/20 flex items-center justify-between bg-white/50 dark:bg-charcoal/50">
                            <h3 className="text-lg font-bold text-charcoal dark:text-cream flex items-center gap-2">
                                <span className="material-symbols-rounded text-gold">history</span>최근 피팅 기록
                            </h3>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-charcoal-light">
                                <span className="material-symbols-rounded text-charcoal-light">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {history.length > 0 ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {history.map((item) => (
                                        <div key={item.id} className="group relative">
                                            <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-gold-light/20 shadow-sm cursor-pointer hover:ring-2 ring-gold transition-all bg-white"
                                                onClick={() => { navigate('/fitting-room', { state: { historyImage: item.imageUrl } }); setIsHistoryModalOpen(false); }}>
                                                <img src={item.imageUrl} alt="History" className="w-full h-full object-cover" />
                                                <button onClick={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }} className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="material-symbols-rounded text-sm">delete</span>
                                                </button>
                                            </div>
                                            <div className="mt-2 px-1">
                                                <p className="text-xs font-bold text-charcoal dark:text-cream truncate">{item.clothName}</p>
                                                <p className="text-[10px] text-charcoal-light dark:text-cream-dark opacity-70">{item.timestamp}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 text-center">
                                    <span className="material-symbols-rounded text-5xl text-gold-light/30 mb-2">history_toggle_off</span>
                                    <p className="text-charcoal-light dark:text-cream-dark">최근 피팅한 기록이 없습니다.</p>
                                </div>
                            )}
                        </div>

                        {history.length > 0 && (
                            <div className="p-4 bg-gray-50 dark:bg-charcoal-light/10 text-center">
                                <button onClick={() => { if (window.confirm('모든 기록을 삭제할까요?')) { localStorage.removeItem('vto_history'); setHistory([]); } }} className="text-xs text-red-500 font-medium hover:underline">
                                    기록 전체 삭제
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default SharedHeader;