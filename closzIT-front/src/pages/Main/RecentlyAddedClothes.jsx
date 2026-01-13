// src/pages/Main/RecentlyAddedClothes.jsx
import React, { useState, useEffect } from 'react';

const RecentlyAddedClothes = ({ onClothClick }) => {
  const [recentClothes, setRecentClothes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentClothes = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
        // 전체 옷 목록을 가져와서 날짜순 정렬 (백엔드 API에 따라 최적화 가능)
        // 여기서는 items/by-category로 가져온 후 합쳐서 정렬한다고 가정하거나, 
        // 전체 아이템을 가져오는 API가 있다면 그것을 사용.
        // items/by-category는 이미 상위 컴포넌트에서 호출되므로, 
        // 최적화를 위해 props로 받을 수도 있지만, 
        // "최근 등록" 전용 API가 없다면 여기서 전체를 받아 정렬하는 로직을 구현합니다.

        const response = await fetch(`${backendUrl}/items/by-category`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          const allClothes = [
            ...(data.outerwear || []),
            ...(data.tops || []),
            ...(data.bottoms || []),
            ...(data.shoes || []),
          ];

          // createdAt 기준으로 내림차순 정렬 후 상위 5개
          const sorted = allClothes.sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
          }).slice(0, 5);

          setRecentClothes(sorted);
        }
      } catch (error) {
        console.error('Failed to fetch recent clothes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentClothes();
  }, []);

  if (isLoading || recentClothes.length === 0) return null;

  return (
    <div className="mt-4 px-1 w-1/2">
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

        {/* Infinite Scroll Container */}
        <div className="flex-1 flex items-start overflow-hidden w-full relative -mx-1 px-1 z-10 pt-0">
          <div className="flex gap-4 animate-infinite-scroll hover:[animation-play-state:paused] w-max items-start">
            {/* Loop mainly for visual effect - duplicate items */}
            {[...recentClothes, ...recentClothes].map((cloth, index) => (
              <div
                key={`${cloth.id}-${index}`}
                onClick={() => onClothClick && onClothClick(cloth)}
                className="flex-shrink-0 flex flex-col items-center cursor-pointer group w-20"
              >
                {/* 옷걸이 (신발 제외) */}
                {cloth.category !== 'shoes' ? (
                  <>
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
                  </>
                ) : (
                  /* 신발은 옷걸이 없이 아래쪽에 배치 (marginTop으로 높이 맞춤) */
                  <div className="mt-5 w-20 h-20 rounded-xl overflow-hidden border border-gold-light/20 shadow-sm relative bg-white group-hover:shadow-md transition-all duration-300">
                    <img
                      src={cloth.imageUrl || cloth.image}
                      alt={cloth.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 right-1 w-4 h-4 bg-gold/90 rounded-full flex items-center justify-center shadow-sm z-10">
                      <span className="material-symbols-rounded text-white text-[8px]">steps</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes infinite-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-infinite-scroll {
            animation: infinite-scroll 30s linear infinite;
          }
        `}</style>
      </div>
    </div>
  );
};

export default RecentlyAddedClothes;
