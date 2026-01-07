import React, { useState, useRef } from 'react';

const VtoResultModal = ({ isOpen, onClose, results, onRefresh, onDelete }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const touchStartX = useRef(0);

    const imageWidth = 280;
    const gap = 16;

    if (!isOpen) return null;

    // 최신순이 오른쪽에 오도록 역순 정렬
    const sortedResults = [...results].reverse();

    const handleRemove = (id) => {
        // VtoContext의 deleteVtoResult 호출 (버튼 상태 연동됨)
        onDelete?.(id);
        if (currentIndex >= sortedResults.length - 1 && currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const goToPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const goToNext = () => {
        if (currentIndex < sortedResults.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
        setIsDragging(true);
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const diff = e.touches[0].clientX - touchStartX.current;
        if ((currentIndex === 0 && diff > 0) ||
            (currentIndex === sortedResults.length - 1 && diff < 0)) {
            setDragOffset(diff * 0.3);
        } else {
            setDragOffset(diff);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (dragOffset > 80 && currentIndex > 0) {
            goToPrev();
        } else if (dragOffset < -80 && currentIndex < sortedResults.length - 1) {
            goToNext();
        }
        setDragOffset(0);
    };

    const handleMouseDown = (e) => {
        touchStartX.current = e.clientX;
        setIsDragging(true);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const diff = e.clientX - touchStartX.current;
        if ((currentIndex === 0 && diff > 0) ||
            (currentIndex === sortedResults.length - 1 && diff < 0)) {
            setDragOffset(diff * 0.3);
        } else {
            setDragOffset(diff);
        }
    };

    const handleMouseUp = () => {
        if (isDragging) handleTouchEnd();
    };

    const handleMouseLeave = () => {
        if (isDragging) handleTouchEnd();
    };

    // 중앙 정렬 로직:
    // 트랙 시작점을 화면 중앙(50vw)으로 설정하고
    // 현재 인덱스 * (너비 + 간격) + 반너비 만큼 왼쪽으로 이동
    const getTransformStyle = () => {
        const centerOffset = currentIndex * (imageWidth + gap) + (imageWidth / 2);
        return `translateX(calc(-${centerOffset}px + ${dragOffset}px))`;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 overflow-hidden">
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
                <span className="material-symbols-rounded text-white text-2xl">close</span>
            </button>

            {sortedResults.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                        <span className="material-symbols-rounded text-6xl text-gold-light">checkroom</span>
                        <p className="mt-4 text-white text-lg">
                            아직 생성된 착장 이미지가 없습니다
                        </p>
                    </div>
                </div>
            ) : (
                <div
                    className="w-full h-full flex flex-col items-center justify-center select-none"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Header */}
                    <div className="absolute top-4 left-4 z-10">
                        <p className="text-white font-semibold">
                            {currentIndex + 1} / {sortedResults.length}
                        </p>
                    </div>

                    {/* 캐러셀 */}
                    <div
                        className="flex items-center self-start"
                        style={{
                            marginLeft: '50vw',
                            gap: `${gap}px`,
                            transform: getTransformStyle(),
                            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                            cursor: isDragging ? 'grabbing' : 'grab',
                            width: 'max-content'
                        }}
                    >
                        {sortedResults.map((result, idx) => (
                            <div
                                key={result.id}
                                className="relative flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl bg-charcoal"
                                style={{ width: imageWidth, aspectRatio: '3/4' }}
                            >
                                <img
                                    src={result.imageUrl}
                                    alt="Virtual Try-On Result"
                                    className="w-full h-full object-cover pointer-events-none"
                                    draggable={false}
                                />

                                {idx === currentIndex && (
                                    <button
                                        onClick={() => handleRemove(result.id)}
                                        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 hover:bg-red-500 flex items-center justify-center transition-colors"
                                    >
                                        <span className="material-symbols-rounded text-white text-lg">delete</span>
                                    </button>
                                )}

                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                    <p className="text-white text-sm">
                                        {new Date(result.createdAt).toLocaleString('ko-KR')}
                                    </p>
                                    {result.appliedClothing && (
                                        <p className="text-white/70 text-xs mt-1">
                                            적용: {result.appliedClothing.join(', ')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 스와이프 힌트 */}
                    {sortedResults.length > 1 && (
                        <p className="text-white/50 text-sm mt-6">
                            ← 좌우로 스와이프하여 이동 →
                        </p>
                    )}

                    {/* Page Indicators */}
                    {sortedResults.length > 1 && (
                        <div className="flex gap-2 mt-3">
                            {sortedResults.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`h-2 rounded-full transition-all ${idx === currentIndex
                                        ? 'bg-gold w-6'
                                        : 'bg-white/40 w-2 hover:bg-white/60'
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VtoResultModal;
