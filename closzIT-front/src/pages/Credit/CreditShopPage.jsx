import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const CreditShopPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const [activeTab, setActiveTab] = useState('purchase');
    const [userCredit, setUserCredit] = useState(0);
    const [pinCode, setPinCode] = useState('');
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPinLoading, setIsPinLoading] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [creditHistory, setCreditHistory] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [creditPackages, setCreditPackages] = useState([]);
    
    // 결제 방법 선택 모달
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [pendingPackage, setPendingPackage] = useState(null);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

    const tabs = [
        { id: 'purchase', label: '크레딧구매' },
        { id: 'history', label: '이용내역' },
        { id: 'free', label: '무료크레딧' },
    ];

    // 토스트 메시지 표시
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // 결제 결과 처리 (카카오페이에서 돌아왔을 때)
    useEffect(() => {
        const paymentResult = searchParams.get('payment');
        const credits = searchParams.get('credits');
        const reason = searchParams.get('reason');

        if (paymentResult === 'success' && credits) {
            showToast(`${credits} 크레딧이 충전되었습니다! 🎉`, 'success');
            // URL 파라미터 제거
            navigate('/credit-shop', { replace: true });
            // 크레딧 새로고침
            fetchCredit();
        } else if (paymentResult === 'fail') {
            showToast(reason || '결제에 실패했습니다.', 'error');
            navigate('/credit-shop', { replace: true });
        } else if (paymentResult === 'cancel') {
            showToast('결제가 취소되었습니다.', 'error');
            navigate('/credit-shop', { replace: true });
        }
    }, [searchParams, navigate]);

    // 크레딧 조회
    const fetchCredit = useCallback(async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const response = await fetch(`${backendUrl}/credit`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setUserCredit(data.credit || 0);
            }
        } catch (error) {
            console.error('Failed to fetch credit:', error);
        }
    }, [backendUrl]);

    // 크레딧 패키지 목록 조회
    const fetchPackages = useCallback(async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const response = await fetch(`${backendUrl}/payment/kakaopay/packages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setCreditPackages(data.packages || []);
            }
        } catch (error) {
            console.error('Failed to fetch packages:', error);
        }
    }, [backendUrl]);

    // 크레딧 이력 조회
    const fetchCreditHistory = useCallback(async () => {
        setIsHistoryLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const response = await fetch(`${backendUrl}/credit/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setCreditHistory(data.history || []);
            }
        } catch (error) {
            console.error('Failed to fetch credit history:', error);
        } finally {
            setIsHistoryLoading(false);
        }
    }, [backendUrl]);

    useEffect(() => {
        fetchCredit();
        fetchPackages();
    }, [fetchCredit, fetchPackages]);

    useEffect(() => {
        if (activeTab === 'history') {
            fetchCreditHistory();
        }
    }, [activeTab, fetchCreditHistory]);

    // 패키지 선택 시 결제 방법 모달 표시
    const handlePackageSelect = (pkg) => {
        setPendingPackage(pkg);
        setShowPaymentModal(true);
    };

    // 카카오페이 결제
    const handleKakaoPay = async () => {
        if (!pendingPackage) return;
        
        setShowPaymentModal(false);
        setSelectedPackage(pendingPackage);
        setIsLoading(true);

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                showToast('로그인이 필요합니다.', 'error');
                return;
            }

            const response = await fetch(`${backendUrl}/payment/kakaopay/ready`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ packageId: pendingPackage.id }),
            });

            const data = await response.json();

            if (data.success && data.redirectUrl) {
                // 카카오페이 결제 페이지로 이동
                // 모바일/PC 분기
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                const redirectUrl = isMobile ? data.mobileRedirectUrl : data.redirectUrl;
                
                // 현재 창에서 이동 (또는 팝업)
                window.location.href = redirectUrl;
            } else {
                showToast(data.message || '결제 준비에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('KakaoPay failed:', error);
            showToast('네트워크 오류가 발생했습니다.', 'error');
        } finally {
            setIsLoading(false);
            setSelectedPackage(null);
            setPendingPackage(null);
        }
    };

    // 데모 결제 (테스트용)
    const handleDemoPurchase = async () => {
        if (!pendingPackage) return;
        
        setShowPaymentModal(false);
        setSelectedPackage(pendingPackage);
        setIsLoading(true);

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                showToast('로그인이 필요합니다.', 'error');
                return;
            }

            const response = await fetch(`${backendUrl}/credit/purchase`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Idempotency-Key': `purchase-${Date.now()}-${pendingPackage.id}`,
                },
                body: JSON.stringify({ packageId: pendingPackage.id }),
            });

            const data = await response.json();

            if (data.success) {
                setUserCredit(data.newBalance);
                showToast(data.message || `${pendingPackage.credits} 크레딧이 충전되었습니다!`, 'success');
            } else {
                showToast(data.message || '구매에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('Purchase failed:', error);
            showToast('네트워크 오류가 발생했습니다.', 'error');
        } finally {
            setIsLoading(false);
            setSelectedPackage(null);
            setPendingPackage(null);
        }
    };

    // PIN 코드로 크레딧 받기
    const handlePinSubmit = async () => {
        if (!pinCode.trim()) {
            showToast('PIN 번호를 입력해주세요.', 'error');
            return;
        }

        setIsPinLoading(true);

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                showToast('로그인이 필요합니다.', 'error');
                return;
            }

            const response = await fetch(`${backendUrl}/credit/redeem`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ pinCode: pinCode.trim() }),
            });

            const data = await response.json();

            if (data.success) {
                setUserCredit(data.newBalance);
                setPinCode('');
                showToast(data.message || `${data.redeemedCredits} 크레딧이 충전되었습니다!`, 'success');
            } else {
                showToast(data.message || '유효하지 않은 PIN 코드입니다.', 'error');
            }
        } catch (error) {
            console.error('PIN redeem failed:', error);
            showToast('네트워크 오류가 발생했습니다.', 'error');
        } finally {
            setIsPinLoading(false);
        }
    };

    const formatPrice = (price) => {
        return price.toLocaleString() + '원';
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTransactionTypeLabel = (type) => {
        const labels = {
            SIGNUP: '회원가입 보너스',
            CLOTHING_ADDED: '의류 등록 보상',
            VTO_USED: 'VTO 사용',
            FLATTEN_USED: '옷 펴기 사용',
            PURCHASE: '크레딧 구매',
            PIN_REDEEM: 'PIN 코드 사용',
            ADMIN_GRANT: '관리자 지급',
            REFUND: '환불',
        };
        return labels[type] || type;
    };

    // Credit Icon Component
    const CreditIcon = ({ size = 'md', className = '' }) => {
        const sizes = {
            sm: 'w-5 h-5 text-[10px]',
            md: 'w-6 h-6 text-xs',
            lg: 'w-8 h-8 text-sm',
        };
        return (
            <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center shadow-md ${className}`}>
                <span className="font-bold text-white drop-shadow-sm">C</span>
            </div>
        );
    };

    // 결제 방법 선택 모달
    const PaymentMethodModal = () => {
        if (!showPaymentModal || !pendingPackage) return null;

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={() => {
                        setShowPaymentModal(false);
                        setPendingPackage(null);
                    }}
                />
                
                {/* Modal */}
                <div className="relative bg-warm-white dark:bg-charcoal-light rounded-2xl shadow-2xl w-[90%] max-w-sm p-6 animate-fadeIn">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-gold/20 to-gold-light/20 rounded-full flex items-center justify-center">
                            <CreditIcon size="lg" />
                        </div>
                        <h3 className="text-lg font-bold text-charcoal dark:text-cream">
                            {pendingPackage.credits} 크레딧 구매
                        </h3>
                        <p className="text-gold font-semibold text-xl mt-1">
                            {formatPrice(pendingPackage.price)}
                        </p>
                    </div>

                    {/* Payment Methods */}
                    <div className="space-y-3">
                        {/* 카카오페이 */}
                        <button
                            onClick={handleKakaoPay}
                            disabled={isLoading}
                            className="w-full flex items-center gap-4 p-4 bg-[#FEE500] hover:bg-[#FDD835] rounded-xl transition-all active:scale-[0.98] disabled:opacity-70"
                        >
                            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#FEE500">
                                    <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.82 5.32 4.56 6.73l-.93 3.42c-.08.29.22.53.48.39l4.03-2.37c.61.08 1.24.13 1.86.13 5.52 0 10-3.58 10-8S17.52 3 12 3z"/>
                                </svg>
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-bold text-black">카카오페이</p>
                                <p className="text-xs text-black/60">간편하게 결제하기</p>
                            </div>
                            <span className="material-symbols-rounded text-black/40">chevron_right</span>
                        </button>

                        {/* 데모 결제 (개발용) */}
                        <button
                            onClick={handleDemoPurchase}
                            disabled={isLoading}
                            className="w-full flex items-center gap-4 p-4 bg-gray-100 dark:bg-charcoal hover:bg-gray-200 dark:hover:bg-charcoal/80 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 border border-gray-200 dark:border-gray-700"
                        >
                            <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-rounded text-gray-600 dark:text-gray-300">science</span>
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-bold text-charcoal dark:text-cream">데모 결제</p>
                                <p className="text-xs text-charcoal/60 dark:text-cream/60">테스트용 (무료)</p>
                            </div>
                            <span className="material-symbols-rounded text-charcoal/40 dark:text-cream/40">chevron_right</span>
                        </button>
                    </div>

                    {/* Cancel Button */}
                    <button
                        onClick={() => {
                            setShowPaymentModal(false);
                            setPendingPackage(null);
                        }}
                        className="w-full mt-4 py-3 text-charcoal/60 dark:text-cream/60 font-medium hover:text-charcoal dark:hover:text-cream transition-colors"
                    >
                        취소
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-warm-white to-cream dark:from-charcoal dark:to-charcoal-light">
            {/* Toast Message */}
            {toast && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] animate-fadeIn">
                    <div
                        className={`px-4 py-2 rounded-lg shadow-lg ${
                            toast.type === 'success'
                                ? 'bg-green-500 text-white'
                                : 'bg-red-500 text-white'
                        }`}
                    >
                        {toast.message}
                    </div>
                </div>
            )}

            {/* Payment Method Modal */}
            <PaymentMethodModal />

            {/* Header */}
            <div className="sticky top-0 z-50 glass-warm border-b border-gold-light/20 px-4 py-3">
                <div className="max-w-lg mx-auto flex items-center gap-2">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 -ml-2 rounded-full hover:bg-gold-light/20 flex items-center justify-center transition-colors"
                    >
                        <span className="material-symbols-rounded text-2xl text-charcoal dark:text-cream">arrow_back</span>
                    </button>
                    <h1 className="text-xl font-bold text-charcoal dark:text-cream">크레딧샵</h1>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-warm-white/80 dark:bg-charcoal/80 backdrop-blur-md border-b border-gold-light/20">
                <div className="max-w-lg mx-auto flex">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-3.5 text-sm font-medium transition-all relative ${
                                activeTab === tab.id
                                    ? 'text-gold'
                                    : 'text-charcoal/60 dark:text-cream/60 hover:text-charcoal dark:hover:text-cream'
                            }`}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold to-gold-light" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-lg mx-auto">
                {activeTab === 'purchase' && (
                    <div className="pb-8">
                        {/* Current Credit Display */}
                        <div className="px-4 py-4 bg-gradient-to-r from-gold/10 to-gold-light/10 border-b border-gold/20">
                            <div className="flex items-center gap-2">
                                <CreditIcon size="md" />
                                <span className="text-charcoal dark:text-cream font-medium">현재 보유한 크레딧</span>
                                <span className="text-gold font-bold text-lg ml-1">{userCredit}개</span>
                            </div>
                        </div>

                        {/* Promotional Banner */}
                        <div className="px-4 py-3">
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gold/20 via-gold-light/20 to-gold/10 p-5 border border-gold/30">
                                <div className="relative z-10">
                                    <h3 className="text-gold-dark dark:text-gold font-bold text-lg mb-1">
                                        ✨ 크레딧으로 가상 피팅!
                                    </h3>
                                    <p className="text-charcoal/70 dark:text-cream/70 text-sm">
                                        크레딧으로 다양한 옷을 입어보세요.
                                    </p>
                                </div>
                                <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-gradient-to-br from-gold/30 to-gold-light/30 rounded-full blur-xl" />
                                <div className="absolute right-8 top-1/2 -translate-y-1/2">
                                    <div className="relative">
                                        <div className="w-16 h-16 bg-gradient-to-br from-gold to-gold-dark rounded-2xl rotate-12 shadow-lg flex items-center justify-center">
                                            <span className="text-3xl">👗</span>
                                        </div>
                                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-gold-light to-gold rounded-full flex items-center justify-center shadow-md">
                                            <CreditIcon size="sm" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Credit Packages */}
                        <div className="px-4 mt-2">
                            <div className="bg-warm-white dark:bg-charcoal-light rounded-2xl shadow-sm border border-gold/20 overflow-hidden">
                                {creditPackages.map((pkg, index) => (
                                    <div
                                        key={pkg.id}
                                        className={`flex items-center justify-between px-4 py-4 ${
                                            index !== creditPackages.length - 1 ? 'border-b border-gold/10' : ''
                                        } ${selectedPackage?.id === pkg.id ? 'bg-gold/10' : 'hover:bg-gold/5'} transition-colors`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <CreditIcon size="md" />
                                                {pkg.popular && (
                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-charcoal dark:text-cream font-medium">
                                                    크레딧 {pkg.credits}개
                                                </span>
                                                {pkg.popular && (
                                                    <span className="px-2 py-0.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] font-bold rounded-full">
                                                        인기
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handlePackageSelect(pkg)}
                                            disabled={isLoading}
                                            className="px-5 py-2 bg-gradient-to-r from-gold to-gold-dark hover:from-gold-dark hover:to-gold text-white font-semibold text-sm rounded-full shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-70"
                                        >
                                            {isLoading && selectedPackage?.id === pkg.id ? (
                                                <span className="flex items-center gap-2">
                                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                </span>
                                            ) : (
                                                formatPrice(pkg.price)
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* PIN Code Section */}
                        <div className="px-4 mt-6">
                            <div className="bg-warm-white dark:bg-charcoal-light rounded-2xl shadow-sm border border-gold/20 p-5">
                                <h3 className="text-charcoal dark:text-cream font-bold mb-3">보유 크레딧번호(PIN) 입력</h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={pinCode}
                                        onChange={(e) => setPinCode(e.target.value.toUpperCase())}
                                        placeholder="크레딧번호(PIN)을 입력하세요."
                                        className="flex-1 px-4 py-3 bg-cream/50 dark:bg-charcoal border border-gold/20 rounded-xl text-sm text-charcoal dark:text-cream placeholder-charcoal/40 dark:placeholder-cream/40 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                                        onKeyPress={(e) => e.key === 'Enter' && handlePinSubmit()}
                                    />
                                    <button
                                        onClick={handlePinSubmit}
                                        disabled={isPinLoading}
                                        className="px-5 py-3 bg-gradient-to-r from-gold to-gold-dark hover:from-gold-dark hover:to-gold text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-70"
                                    >
                                        {isPinLoading ? (
                                            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                        ) : (
                                            '크레딧받기'
                                        )}
                                    </button>
                                </div>
                                <div className="mt-4 space-y-1.5 text-xs text-charcoal/50 dark:text-cream/50">
                                    <p>· 기프트카드로 충전한 크레딧은 크레딧샵 {'>'} 이용내역 탭에서 확인하실 수 있습니다.</p>
                                    <p>· 무료 크레딧 쿠폰으로 충전한 크레딧은 크레딧샵 {'>'} 무료크레딧 탭에서 확인하실 수 있습니다.</p>
                                </div>
                            </div>
                        </div>

                        {/* Usage Guide Accordion */}
                        <div className="px-4 mt-4">
                            <div className="bg-warm-white dark:bg-charcoal-light rounded-2xl shadow-sm border border-gold/20 overflow-hidden">
                                <button
                                    onClick={() => setShowGuide(!showGuide)}
                                    className="w-full px-5 py-4 flex items-center justify-between text-charcoal dark:text-cream font-bold hover:bg-gold/5 transition-colors"
                                >
                                    <span>크레딧 이용안내</span>
                                    <span className={`material-symbols-rounded text-gold transition-transform ${showGuide ? 'rotate-180' : ''}`}>
                                        expand_more
                                    </span>
                                </button>
                                {showGuide && (
                                    <div className="px-5 pb-5 text-sm text-charcoal/70 dark:text-cream/70 space-y-3 border-t border-gold/10 pt-4">
                                        <div>
                                            <h4 className="font-semibold text-charcoal dark:text-cream mb-1">크레딧이란?</h4>
                                            <p>CloszIT에서 가상 피팅 서비스를 이용할 때 사용하는 포인트입니다.</p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-charcoal dark:text-cream mb-1">크레딧 사용처</h4>
                                            <p>· 가상 피팅(VTO) 1회 = 3 크레딧</p>
                                            <p>· 옷 펴기(Flatten) 1회 = 1 크레딧</p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-charcoal dark:text-cream mb-1">크레딧 획득 방법</h4>
                                            <p>· 회원가입 시 = 10 크레딧</p>
                                            <p>· 의류 등록 시 = 1 크레딧</p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-charcoal dark:text-cream mb-1">유효기간</h4>
                                            <p>구매한 크레딧은 구매일로부터 5년간 유효합니다.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="p-4">
                        {isHistoryLoading ? (
                            <div className="flex justify-center py-12">
                                <svg className="animate-spin w-8 h-8 text-gold" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            </div>
                        ) : creditHistory.length === 0 ? (
                            <div className="bg-warm-white dark:bg-charcoal-light rounded-2xl shadow-sm border border-gold/20 p-8 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-gold/20 rounded-full flex items-center justify-center">
                                    <span className="material-symbols-rounded text-3xl text-gold">receipt_long</span>
                                </div>
                                <p className="text-charcoal/50 dark:text-cream/50">이용 내역이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="bg-warm-white dark:bg-charcoal-light rounded-2xl shadow-sm border border-gold/20 overflow-hidden">
                                {creditHistory.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className={`px-4 py-4 ${
                                            index !== creditHistory.length - 1 ? 'border-b border-gold/10' : ''
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                    item.amount > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                                                }`}>
                                                    <span className={`material-symbols-rounded ${
                                                        item.amount > 0 ? 'text-green-600' : 'text-red-500'
                                                    }`}>
                                                        {item.amount > 0 ? 'add_circle' : 'remove_circle'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-charcoal dark:text-cream">
                                                        {getTransactionTypeLabel(item.type)}
                                                    </p>
                                                    <p className="text-xs text-charcoal/50 dark:text-cream/50">
                                                        {formatDate(item.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-bold ${
                                                    item.amount > 0 ? 'text-green-600' : 'text-red-500'
                                                }`}>
                                                    {item.amount > 0 ? '+' : ''}{item.amount}
                                                </p>
                                                <p className="text-xs text-charcoal/50 dark:text-cream/50">
                                                    잔액 {item.balanceAfter}
                                                </p>
                                            </div>
                                        </div>
                                        {item.description && (
                                            <p className="mt-2 text-xs text-charcoal/60 dark:text-cream/60 pl-13">
                                                {item.description}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'free' && (
                    <div className="p-4">
                        {/* Demo PIN Codes */}
                        <div className="bg-warm-white dark:bg-charcoal-light rounded-2xl shadow-sm border border-gold/20 p-5 mb-4">
                            <h3 className="text-charcoal dark:text-cream font-bold mb-3 flex items-center gap-2">
                                <span className="material-symbols-rounded text-gold">redeem</span>
                                데모 PIN 코드
                            </h3>
                            <div className="space-y-2">
                                {[
                                    { code: 'DEMO10', credits: 10 },
                                    { code: 'DEMO50', credits: 50 },
                                    { code: 'DEMO100', credits: 100 },
                                ].map((pin) => (
                                    <div
                                        key={pin.code}
                                        className="flex items-center justify-between p-3 bg-gold/5 rounded-xl"
                                    >
                                        <div className="flex items-center gap-2">
                                            <code className="px-2 py-1 bg-gold/20 text-gold font-mono text-sm rounded">
                                                {pin.code}
                                            </code>
                                        </div>
                                        <span className="text-sm text-charcoal dark:text-cream font-medium">
                                            +{pin.credits} 크레딧
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-3 text-xs text-charcoal/50 dark:text-cream/50">
                                * 각 PIN 코드는 계정당 1회만 사용 가능합니다.
                            </p>
                        </div>

                        {/* Event Banner */}
                        <div className="bg-warm-white dark:bg-charcoal-light rounded-2xl shadow-sm border border-gold/20 p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gold/20 rounded-full flex items-center justify-center">
                                <span className="material-symbols-rounded text-3xl text-gold">celebration</span>
                            </div>
                            <p className="text-charcoal dark:text-cream font-medium mb-2">더 많은 무료 크레딧을 원하시나요?</p>
                            <p className="text-charcoal/50 dark:text-cream/50 text-sm mb-4">이벤트에 참여하고 무료 크레딧을 받으세요!</p>
                            <button className="px-6 py-2.5 bg-gradient-to-r from-gold to-gold-dark text-white font-semibold text-sm rounded-full shadow-md hover:shadow-lg transition-all active:scale-95">
                                이벤트 보러가기
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreditShopPage;