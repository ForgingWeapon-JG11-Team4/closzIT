import React, { useState, useEffect } from 'react';

const VtoResultModal = ({
    isOpen,
    onClose,
    fullResults = [],      // 전체 입어보기 결과
    singleResults = [],    // 원클릭 입어보기 결과
    activeTab = 'full',    // 현재 활성 탭
    onTabChange,           // 탭 변경 콜백
    unseenFullCount = 0,   // 전체 입어보기 unseen
    unseenSingleCount = 0, // 원클릭 입어보기 unseen
    onRefresh,
    onDelete,
    // 기존 호환성 유지
    results = [],
}) => {
    // 탭별 결과 선택 (기존 results prop 호환성 유지)
    const currentResults = activeTab === 'full'
        ? (fullResults.length > 0 ? fullResults : results.filter(r => r.type === 'full' || !r.type))
        : (singleResults.length > 0 ? singleResults : results.filter(r => r.type === 'single'));

    // 최신순 정렬
    const sortedResults = [...currentResults].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    // 확대된 이미지 상태
    const [enlargedImage, setEnlargedImage] = useState(null);

    // 모달 닫힐 때 확대 이미지도 닫기
    useEffect(() => {
        if (!isOpen) {
            setEnlargedImage(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleRemove = (e, id) => {
        e.stopPropagation();
        onDelete?.(id);
    };

    return (
        <>
            {/* 메인 모달 */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center animate-fadeIn"
                onClick={onClose}
            >
                <div
                    className="bg-warm-white dark:bg-[#1A1918] w-full max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-slideUp flex flex-col max-h-[80vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 헤더 */}
                    <div className="px-6 py-4 border-b border-gold-light/20 flex items-center justify-between bg-white/50 dark:bg-charcoal/50">
                        <h3 className="text-lg font-bold text-charcoal dark:text-cream flex items-center gap-2">
                            <span className="material-symbols-rounded text-gold">checkroom</span>
                            입어보기 결과
                        </h3>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-charcoal-light"
                        >
                            <span className="material-symbols-rounded text-charcoal-light">close</span>
                        </button>
                    </div>

                    {/* 탭 */}
                    <div className="px-4 pt-4 pb-2 flex gap-2">
                        <button
                            onClick={() => onTabChange?.('full')}
                            className={`relative flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                activeTab === 'full'
                                    ? 'bg-gold text-charcoal shadow-md'
                                    : 'bg-gray-100 dark:bg-charcoal-light/30 text-charcoal-light dark:text-cream-dark hover:bg-gray-200 dark:hover:bg-charcoal-light/50'
                            }`}
                        >
                            전체 입어보기
                            {unseenFullCount > 0 && activeTab !== 'full' && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                                    {unseenFullCount}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => onTabChange?.('single')}
                            className={`relative flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                activeTab === 'single'
                                    ? 'bg-gold text-charcoal shadow-md'
                                    : 'bg-gray-100 dark:bg-charcoal-light/30 text-charcoal-light dark:text-cream-dark hover:bg-gray-200 dark:hover:bg-charcoal-light/50'
                            }`}
                        >
                            하나만 입어보기
                            {unseenSingleCount > 0 && activeTab !== 'single' && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                                    {unseenSingleCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* 컨텐츠 */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {sortedResults.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4">
                                {sortedResults.map((item) => (
                                    <div key={item.id} className="group relative">
                                        <div
                                            className="aspect-[3/4] rounded-2xl overflow-hidden border border-gold-light/20 shadow-sm cursor-pointer hover:ring-2 ring-gold transition-all bg-white"
                                            onClick={() => setEnlargedImage(item.imageUrl)}
                                        >
                                            <img
                                                src={item.imageUrl}
                                                alt="VTO Result"
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                onClick={(e) => handleRemove(e, item.id)}
                                                className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                            >
                                                <span className="material-symbols-rounded text-sm">delete</span>
                                            </button>
                                        </div>
                                        <div className="mt-2 px-1">
                                            <p className="text-[10px] text-charcoal-light dark:text-cream-dark opacity-70">
                                                {new Date(item.createdAt).toLocaleString('ko-KR', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <span className="material-symbols-rounded text-5xl text-gold-light/30 mb-2">
                                    {activeTab === 'full' ? 'checkroom' : 'styler'}
                                </span>
                                <p className="text-charcoal-light dark:text-cream-dark mt-2">
                                    {activeTab === 'full'
                                        ? '아직 전체 입어보기 결과가 없습니다'
                                        : '아직 원클릭 입어보기 결과가 없습니다'}
                                </p>
                                <p className="text-xs text-charcoal-light/60 dark:text-cream-dark/60 mt-1">
                                    {activeTab === 'full'
                                        ? 'SNS 피드에서 "전부 입어보기"를 눌러보세요'
                                        : '옷 상세에서 "입어보기"를 눌러보세요'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* 푸터 - 전체 삭제 */}
                    {sortedResults.length > 0 && (
                        <div className="p-4 bg-gray-50 dark:bg-charcoal-light/10 text-center border-t border-gold-light/10">
                            <button
                                onClick={() => {
                                    if (window.confirm('현재 탭의 모든 결과를 삭제할까요?')) {
                                        sortedResults.forEach(item => onDelete?.(item.id));
                                    }
                                }}
                                className="text-xs text-red-500 font-medium hover:underline"
                            >
                                {activeTab === 'full' ? '전체 입어보기' : '원클릭 입어보기'} 결과 전체 삭제
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 이미지 확대 라이트박스 */}
            {enlargedImage && (
                <div
                    className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center animate-fadeIn"
                    onClick={() => setEnlargedImage(null)}
                >
                    <div
                        className="relative animate-scaleIn flex flex-col items-center p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 닫기 버튼 */}
                        <button
                            onClick={() => setEnlargedImage(null)}
                            className="absolute -top-2 -right-2 w-10 h-10 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center shadow-lg transition-colors z-20"
                        >
                            <span className="material-symbols-rounded text-gray-700 text-2xl">close</span>
                        </button>
                        {/* 이미지 */}
                        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden p-2">
                            <img
                                src={enlargedImage}
                                alt="Enlarged VTO Result"
                                className="max-w-[85vw] max-h-[75vh] object-contain"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 애니메이션 스타일 */}
            <style>{`
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-scaleIn {
                    animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
            `}</style>
        </>
    );
};

export default VtoResultModal;
