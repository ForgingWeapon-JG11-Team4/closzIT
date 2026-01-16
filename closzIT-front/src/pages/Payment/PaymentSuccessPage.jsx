// src/pages/payment/PaymentSuccessPage.jsx
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PaymentSuccessPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const orderId = searchParams.get('orderId');
    const credits = searchParams.get('credits');

    useEffect(() => {
        // 3초 후 크레딧샵으로 이동
        const timer = setTimeout(() => {
            navigate('/credit-shop?payment=success&credits=' + credits, { replace: true });
        }, 3000);

        return () => clearTimeout(timer);
    }, [navigate, credits]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-warm-white to-cream dark:from-charcoal dark:to-charcoal-light flex items-center justify-center p-4">
            <div className="bg-warm-white dark:bg-charcoal-light rounded-2xl shadow-lg border border-gold/20 p-8 max-w-sm w-full text-center">
                {/* Success Icon */}
                <div className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <span className="material-symbols-rounded text-5xl text-green-500">check_circle</span>
                </div>

                <h1 className="text-2xl font-bold text-charcoal dark:text-cream mb-2">
                    결제 완료!
                </h1>
                
                <p className="text-charcoal/70 dark:text-cream/70 mb-6">
                    <span className="text-gold font-bold text-xl">{credits}</span> 크레딧이 충전되었습니다.
                </p>

                {orderId && (
                    <p className="text-xs text-charcoal/50 dark:text-cream/50 mb-6">
                        주문번호: {orderId}
                    </p>
                )}

                <button
                    onClick={() => navigate('/credit-shop?payment=success&credits=' + credits, { replace: true })}
                    className="w-full py-3 bg-gradient-to-r from-gold to-gold-dark text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                    확인
                </button>

                <p className="mt-4 text-xs text-charcoal/40 dark:text-cream/40">
                    잠시 후 자동으로 이동합니다...
                </p>
            </div>
        </div>
    );
};

export default PaymentSuccessPage;