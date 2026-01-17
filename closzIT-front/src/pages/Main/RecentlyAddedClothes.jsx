// src/pages/Main/RecentlyAddedClothes.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';

// 개별 옷 아이템 컴포넌트
const ClothItem = ({ cloth, onClick }) => (
  <div
    onClick={() => onClick && onClick(cloth)}
    className="flex-shrink-0 flex flex-col items-center cursor-pointer group w-20"
  >
    <div className="w-12 h-12 -mb-5 relative z-20 transition-transform duration-300 group-hover:-translate-y-1">
      <img src="/assets/hook.png" alt="hook" className="w-full h-full object-contain drop-shadow-sm" />
    </div>
    <div className="w-20 h-24 rounded-lg overflow-hidden border border-gold-light/20 shadow-md relative bg-white z-10 group-hover:shadow-lg transition-all duration-300">
      <img
        src={cloth.imageUrl || cloth.image}
        alt={cloth.name}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
    </div>
  </div>
);

const RecentlyAddedClothes = ({ userClothes, onClothClick }) => {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef(null);
  const scrollRef = useRef(null);

  // 아이템 크기 상수 (w-20 = 80px, gap-4 = 16px)
  const ITEM_WIDTH = 80;
  const GAP = 16;

  // props로 전달받은 userClothes에서 최근 등록 아이템 계산
  const recentClothes = useMemo(() => {
    if (!userClothes) return [];
    
    const allClothes = [
      ...(userClothes.outerwear || []),
      ...(userClothes.tops || []),
      ...(userClothes.bottoms || []),
      ...(userClothes.shoes || []),
    ];

    return allClothes
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  }, [userClothes]);

  // 컨테이너 크기 vs 아이템 총 너비 비교
  useEffect(() => {
    const checkOverflow = () => {
      if (!containerRef.current || recentClothes.length === 0) return;

      const containerWidth = containerRef.current.offsetWidth;
      const totalItemsWidth = recentClothes.length * ITEM_WIDTH + (recentClothes.length - 1) * GAP;

      setShouldAnimate(totalItemsWidth > containerWidth);
    };

    checkOverflow();

    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [recentClothes]);

  // 첫 번째 세트의 정확한 너비 (픽셀)
  const setWidth = useMemo(() => {
    const itemsWidth = recentClothes.length * ITEM_WIDTH;
    const gapsWidth = recentClothes.length * GAP; // 마지막 아이템 뒤 gap 포함
    return itemsWidth + gapsWidth;
  }, [recentClothes.length]);

  // 애니메이션 속도 동적 계산 (아이템 수에 비례)
  const animationDuration = useMemo(() => {
    const baseDuration = 5;
    return recentClothes.length * baseDuration;
  }, [recentClothes.length]);

  if (recentClothes.length === 0) return null;

  return (
    <div className="w-full h-full">
      <div
        className="rounded-[28px] p-3 shadow-soft border border-gold/30 relative overflow-hidden flex flex-col bg-white backdrop-blur-sm min-h-[160px] h-full"
      >
        <h3 className="text-base font-bold text-charcoal dark:text-cream flex items-center gap-1.5 mb-1 flex-shrink-0 pl-1 z-10 relative">
          <span className="material-symbols-rounded text-gold text-lg">new_releases</span>
          최근 등록
        </h3>

        {/* 옷봉 (Rail) */}
        <div
          className="absolute top-[3.5rem] left-0 right-0 h-1.5 z-0"
          style={{
            background: 'linear-gradient(180deg, #4A4A4A 0%, #2D2D2D 50%, #1A1A1A 100%)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}
        />

        {/* Scroll Container */}
        <div 
          ref={containerRef}
          className="flex-1 flex items-start overflow-hidden w-full relative -mx-1 px-1 z-10 pt-0"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {shouldAnimate && !isHovered ? (
            // 무한 스크롤 애니메이션 모드
            <div 
              className="flex items-start infinite-scroll-container"
              style={{ 
                '--set-width': `${setWidth}px`,
                '--duration': `${animationDuration}s`,
              }}
            >
              {/* 첫 번째 세트 */}
              <div className="flex items-start" style={{ gap: `${GAP}px`, paddingRight: `${GAP}px` }}>
                {recentClothes.map((cloth, index) => (
                  <ClothItem 
                    key={`set1-${cloth.id}-${index}`}
                    cloth={cloth}
                    onClick={onClothClick}
                  />
                ))}
              </div>
              {/* 두 번째 세트 (복제) */}
              <div className="flex items-start" style={{ gap: `${GAP}px` }}>
                {recentClothes.map((cloth, index) => (
                  <ClothItem 
                    key={`set2-${cloth.id}-${index}`}
                    cloth={cloth}
                    onClick={onClothClick}
                  />
                ))}
              </div>
            </div>
          ) : shouldAnimate && isHovered ? (
            // 호버 시 수동 스와이프 모드
            <div 
              ref={scrollRef}
              className="flex items-start overflow-x-auto hide-scrollbar scroll-smooth"
              style={{ gap: `${GAP}px` }}
            >
              {recentClothes.map((cloth, index) => (
                <ClothItem 
                  key={`swipe-${cloth.id}-${index}`}
                  cloth={cloth}
                  onClick={onClothClick}
                />
              ))}
            </div>
          ) : (
            // 아이템이 적어서 애니메이션 불필요할 때
            <div className="flex gap-4 items-start justify-center w-full">
              {recentClothes.map((cloth, index) => (
                <ClothItem 
                  key={`static-${cloth.id}-${index}`}
                  cloth={cloth}
                  onClick={onClothClick}
                />
              ))}
            </div>
          )}
        </div>

        <style>{`
          @keyframes infinite-scroll-exact {
            0% { 
              transform: translateX(0); 
            }
            100% { 
              transform: translateX(calc(var(--set-width) * -1)); 
            }
          }
          .infinite-scroll-container {
            animation: infinite-scroll-exact var(--duration) linear infinite;
            will-change: transform;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    </div>
  );
};

export default RecentlyAddedClothes;