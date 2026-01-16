import React, { useEffect } from 'react';
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
        unseenFullCount,
        unseenSingleCount,
        toastMessage,
        isVtoModalOpen,
        flyAnimation,
        openVtoModal,
        closeVtoModal,
        vtoResults,
        fullVtoResults,
        singleVtoResults,
        activeVtoTab,
        setActiveVtoTab,
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

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const handleBack = () => {
        if (onBackClick) {
            onBackClick();
        } else {
            navigate(-1);
        }
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
                        {/* 입어보기 결과 버튼 */}
                        <div className="relative w-10 h-10 mr-1">
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
                fullResults={fullVtoResults}
                singleResults={singleVtoResults}
                activeTab={activeVtoTab}
                onTabChange={setActiveVtoTab}
                unseenFullCount={unseenFullCount}
                unseenSingleCount={unseenSingleCount}
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
        </>
    );
};

export default SharedHeader;
