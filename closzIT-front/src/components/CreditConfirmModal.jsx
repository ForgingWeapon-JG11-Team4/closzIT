import React from 'react';

const CreditConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    currentCredit = 0,
    requiredCredit = 1,
    isLoading = false
}) => {
    if (!isOpen) return null;

    const hasEnoughCredit = currentCredit >= requiredCredit;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-warm-white dark:bg-charcoal rounded-2xl w-full max-w-sm shadow-2xl animate-slideDown overflow-hidden">
                {/* Header with coin icon */}
                <div className="bg-gradient-to-r from-gold/20 to-gold-light/20 px-6 py-5 border-b border-gold/20">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center shadow-lg">
                            <span className="material-symbols-rounded text-white text-2xl">monetization_on</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-charcoal dark:text-cream">
                                크레딧 사용
                            </h3>
                            <p className="text-sm text-charcoal-light dark:text-cream-dark">
                                가상 착장 서비스
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                    {hasEnoughCredit ? (
                        <>
                            <p className="text-center text-charcoal dark:text-cream mb-4">
                                <span className="text-gold font-bold text-xl">{requiredCredit}</span>
                                <span className="text-sm"> 크레딧을 사용하여</span>
                                <br />
                                <span className="text-sm">가상 착장을 진행할까요?</span>
                            </p>

                            {/* Current credit display */}
                            <div className="flex items-center justify-center gap-2 mb-6 py-2 px-4 bg-cream dark:bg-charcoal-light/30 rounded-xl">
                                <span className="text-sm text-charcoal-light dark:text-cream-dark">보유 크레딧:</span>
                                <span className="material-symbols-rounded text-gold text-base">monetization_on</span>
                                <span className="font-bold text-gold">{currentCredit}</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-center mb-4">
                                <span className="material-symbols-rounded text-red-500 text-4xl">warning</span>
                                <p className="mt-2 text-charcoal dark:text-cream font-semibold">
                                    크레딧이 부족합니다
                                </p>
                                <p className="text-sm text-charcoal-light dark:text-cream-dark mt-1">
                                    필요: {requiredCredit} / 보유: {currentCredit}
                                </p>
                            </div>
                        </>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 py-3 rounded-xl bg-cream-dark dark:bg-charcoal-light text-charcoal dark:text-cream font-semibold hover:bg-cream dark:hover:bg-charcoal transition-colors disabled:opacity-50"
                        >
                            취소
                        </button>
                        {hasEnoughCredit && (
                            <button
                                onClick={onConfirm}
                                disabled={isLoading}
                                className="flex-1 py-3 rounded-xl btn-premium font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        처리중...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-rounded text-lg">checkroom</span>
                                        입어보기
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreditConfirmModal;
