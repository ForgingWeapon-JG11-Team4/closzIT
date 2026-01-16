// src/pages/payment/PaymentCancelPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentCancelPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-b from-warm-white to-cream dark:from-charcoal dark:to-charcoal-light flex items-center justify-center p-4">
            <div className="bg-warm-white dark:bg-charcoal-light rounded-2xl shadow-lg border border-gold/20 p-8 max-w-sm w-full text-center">
                {/* Cancel Icon */}
                <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <span className="material-symbols-rounded text-5xl text-gray-400">cancel</span>
                </div>

                <h1 className="text-2xl font-bold text-charcoal dark:text-cream mb-2">
                    결제 취소
                </h1>
                
                <p className="text-charcoal/70 dark:text-cream/70 mb-6">
                    결제가 취소되었습니다.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => navigate('/credit-shop', { replace: true })}
                        className="w-full py-3 bg-gradient-to-r from-gold to-gold-dark text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
                    >
                        크레딧샵으로 돌아가기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentCancelPage;