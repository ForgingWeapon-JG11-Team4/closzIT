import React, { useMemo } from 'react';
import { GiTShirt } from 'react-icons/gi';

const WardrobeStatus = ({ userClothes }) => {
  const chartSize = 120;
  const strokeWidth = 40; // 더 두꺼운 도넛
  const radius = (chartSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const data = useMemo(() => {
    if (!userClothes) return [];
    
    const counts = {
      outerwear: userClothes.outerwear?.length || 0,
      tops: userClothes.tops?.length || 0,
      bottoms: userClothes.bottoms?.length || 0,
      shoes: userClothes.shoes?.length || 0,
    };
    
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    
    // 골드 톤온톤 컬러 팔레트 (요청: 색을 비슷하게)
    const categories = [
      { id: 'outerwear', label: '아우터', color: '#8C7A5E', count: counts.outerwear },
      { id: 'tops', label: '상의', color: '#B09B7A', count: counts.tops },
      { id: 'bottoms', label: '하의', color: '#D4B886', count: counts.bottoms },
      { id: 'shoes', label: '신발', color: '#E5D3B3', count: counts.shoes },
    ];

    let currentAngle = 0;
    return categories.map(cat => {
      const percentage = total === 0 ? 0 : (cat.count / total) * 100;
      const angle = total === 0 ? 0 : (cat.count / total) * 360;
      // stroke-dasharray 계산을 위한 길이
      const strokeLength = (circumference * percentage) / 100;
      
      const item = {
        ...cat,
        percentage,
        angle,
        offset: currentAngle, // 시작 각도 (Rotation 용)
        strokeLength,
        // 라벨 위치 계산용 중간 각도
        midAngle: currentAngle + (angle / 2)
      };
      currentAngle += angle;
      return item;
    });
  }, [userClothes, circumference]);

  const totalItems = Object.values(userClothes || {}).flat().length;

  // 라벨 위치 계산
  const getLabelPos = (angle, dist = 0.7) => {
    const rad = ((angle - 90) * Math.PI) / 180; 
    const r = (chartSize / 2) * dist;
    const x = (chartSize / 2) + r * Math.cos(rad);
    const y = (chartSize / 2) + r * Math.sin(rad);
    return { x, y };
  };

  return (
    <div className="mt-4 px-1 w-1/2">
      <div 
        className="rounded-[28px] p-3 shadow-soft border border-gold/30 relative overflow-hidden flex flex-col bg-white backdrop-blur-sm min-h-[160px] h-full"
      >
        <h3 className="text-sm font-bold text-charcoal dark:text-cream flex items-center justify-between gap-1.5 mb-2 flex-shrink-0 z-10 relative">
          <div className="flex items-center gap-1.5">
            <GiTShirt className="text-gold text-lg" />
            마이 옷장
          </div>
          <span className="text-xs font-medium text-gold bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">
            Total {totalItems}
          </span>
        </h3>

        <div className="flex-1 flex flex-row items-center justify-between px-1 relative -mt-1">
           {/* Chart */}
           <div className="relative flex-shrink-0" style={{ width: chartSize, height: chartSize }}>
             <svg width={chartSize} height={chartSize} viewBox={`0 0 ${chartSize} ${chartSize}`} className="transform">
               {data.map((item, index) => {
                 return (
                   <React.Fragment key={item.id}>
                     <circle
                       cx={chartSize / 2}
                       cy={chartSize / 2}
                       r={radius}
                       fill="transparent"
                       stroke={item.color}
                       strokeWidth={strokeWidth}
                       strokeDasharray={`${item.strokeLength} ${circumference}`}
                       strokeDashoffset={0}
                       transform={`rotate(${item.offset - 90} ${chartSize / 2} ${chartSize / 2})`}
                       className="chart-segment"
                       style={{
                         '--target-dasharray': `${item.strokeLength} ${circumference}`,
                         animation: 'grow-chart 1.5s ease-out forwards'
                       }}
                     />
                     
                     {/* Only Count on Chart */}
                     {item.percentage > 8 && (() => {
                        const pos = getLabelPos(item.midAngle, 0.7);
                        return (
                          <text
                            x={pos.x}
                            y={pos.y}
                            fill="#FFFFFF"
                            fontSize="11"
                            fontWeight="800"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.3)', pointerEvents: 'none' }}
                            className="animate-fadeIn"
                          >
                            {item.count}
                          </text>
                        );
                     })()}
                   </React.Fragment>
                 );
               })}
             </svg>
           </div>

           {/* Side Legend */}
           <div className="flex flex-col gap-1.5 z-10 min-w-[60px]">
             {data.map(item => (
               <div key={item.id} className="flex items-center gap-1.5 animate-fadeIn" style={{ animationDelay: '0.5s' }}>
                 <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                 <span className="text-[11px] text-charcoal/80 font-medium">{item.label}</span>
               </div>
             ))}
           </div>
           
           {/* Animation Keyframes */}
           <style>{`
             @keyframes grow-chart {
               from { stroke-dasharray: 0 ${circumference}; }
               to { stroke-dasharray: var(--target-dasharray); }
             }
             .animate-fadeIn {
               animation: fadeIn 1s ease-out 0.5s forwards;
               opacity: 0;
             }
             @keyframes fadeIn {
               to { opacity: 1; }
             }
           `}</style>
        </div>
      </div>
    </div>
  );
};

export default WardrobeStatus;
