// src/pages/payment/PaymentFailPage.jsx
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PaymentFailPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const reason = searchParams.get('reason');

    const getErrorMessage = (reason) => {
        const messages = {
            'invalid_order': '유효하지 않은 주문입니다.',
            'already_processed': '이미 처리된 주문입니다.',
            'approve_error': '결제 승인에 실패했습니다.',
        };
        return messages[reason] || reason || '결제 처리 중 오류가 발생했습니다.';
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-warm-white to-cream dark:from-charcoal dark:to-charcoal-light flex items-center justify-center p-4">
            <div className="bg-warm-white dark:bg-charcoal-light rounded-2xl shadow-lg border border-gold/20 p-8 max-w-sm w-full text-center">
                {/* Error Icon */}
                <div className="w-20 h-20 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <span className="material-symbols-rounded text-5xl text-red-500">error</span>
                </div>

                <h1 className="text-2xl font-bold text-charcoal dark:text-cream mb-2">
                    결제 실패
                </h1>
                
                <p className="text-charcoal/70 dark:text-cream/70 mb-6">
                    {getErrorMessage(reason)}
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => navigate('/credit-shop', { replace: true })}
                        className="w-full py-3 bg-gradient-to-r from-gold to-gold-dark text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
                    >
                        다시 시도하기
                    </button>
                    
                    <button
                        onClick={() => navigate('/', { replace: true })}
                        className="w-full py-3 text-charcoal/60 dark:text-cream/60 font-medium hover:text-charcoal dark:hover:text-cream transition-colors"
                    >
                        홈으로 이동
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentFailPage;