import React from 'react';
import { useNavigate } from 'react-router-dom';

const OutfitRecommender = () => {
  const navigate = useNavigate();

  return (
    <div className="animate-slideDown">
      {/* AI Stylist Greeting Card */}
      <div className="mt-2 mb-10 flex items-stretch gap-3 h-[8.5rem]">
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-[2rem] rounded-bl-lg p-5 shadow-soft relative flex flex-col justify-between border border-gray-100 dark:border-gray-700 group transition-all hover:border-primary/20">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-rounded text-primary text-[14px]">smart_toy</span>
              </div>
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">AI Stylist</span>
            </div>
            <p className="text-gray-800 dark:text-gray-100 text-[13px] font-medium leading-relaxed">
              안녕하세요! <br/>오늘 어떤 스타일을 추천해 드릴까요?
            </p>
          </div>
        </div>
        
        {/* Recommendation Button - Navigates to FittingPage */}
        <button 
          onClick={() => navigate('/fitting')}
          className="w-[5.5rem] rounded-[2rem] bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xl shadow-gray-200 dark:shadow-none flex flex-col items-center justify-center gap-2 active:scale-95 transition-all hover:scale-[1.02] shrink-0 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black dark:from-white dark:to-gray-200 opacity-100"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="material-symbols-rounded text-3xl relative z-10">auto_awesome</span>
          <span className="text-[10px] font-bold relative z-10 tracking-tight">추천받기</span>
        </button>
      </div>

      {/* Calendar Section */}
      <div className="mb-10">
        <div className="flex items-end justify-between mb-5 px-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">캘린더</h2>
          <button className="text-xs font-medium text-gray-400 hover:text-primary transition-colors">전체보기</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {/* Today Card */}
          <div className="aspect-[0.95] rounded-3xl bg-primary text-white p-4 shadow-glow shadow-primary/30 relative flex flex-col justify-between overflow-hidden group cursor-pointer transition-transform hover:-translate-y-1">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold opacity-90">Today</span>
              <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
            </div>
            <div className="relative z-10">
              <p className="text-[10px] opacity-80 mb-1 font-medium tracking-wide">16:00</p>
              <p className="text-sm font-bold leading-tight">데이트</p>
            </div>
            <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors"></div>
          </div>
          
          {/* Other Days */}
          {['Fri', 'Sat', 'Sun', 'Mon'].map((day, idx) => (
            <div key={day} className="aspect-[0.95] rounded-3xl bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700 flex flex-col justify-between hover:border-primary/30 transition-colors cursor-pointer group">
              <span className={`text-xs font-semibold ${day === 'Sun' ? 'text-red-400' : 'text-gray-400 group-hover:text-primary'} transition-colors`}>{day}</span>
            </div>
          ))}
          
          {/* Add Button */}
          <div className="aspect-[0.95] rounded-3xl bg-gray-50 dark:bg-gray-800/50 p-4 border border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center cursor-pointer hover:bg-white dark:hover:bg-gray-800 transition-all group">
            <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <span className="material-symbols-rounded text-gray-400 group-hover:text-primary text-xl">add</span>
            </div>
          </div>
        </div>
      </div>

      {/* Style Section */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5 px-1 tracking-tight">스타일</h2>
        <div className="grid grid-cols-3 gap-3">
          {/* Casual */}
          <div className="aspect-square rounded-3xl bg-gray-100 dark:bg-gray-800 overflow-hidden relative group cursor-pointer shadow-sm">
            <img alt="Casual" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400" />
            <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors"></div>
            <div className="absolute bottom-2 inset-x-2">
              <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-xl py-2 text-center shadow-sm">
                <span className="text-[11px] font-bold text-gray-900 dark:text-white">캐주얼</span>
              </div>
            </div>
          </div>
          
          {/* Hip */}
          <div className="aspect-square rounded-3xl bg-gray-100 dark:bg-gray-800 overflow-hidden relative group cursor-pointer shadow-sm">
            <img alt="Hip" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://images.unsplash.com/photo-1529139574466-a302d2d3f524?w=400" />
            <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors"></div>
            <div className="absolute bottom-2 inset-x-2">
              <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-xl py-2 text-center shadow-sm">
                <span className="text-[11px] font-bold text-gray-900 dark:text-white">힙</span>
              </div>
            </div>
          </div>

          {['모던', '스트릿', '빈티지'].map((style) => (
            <div key={style} className="aspect-square rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center relative cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
              <span className="text-xs font-semibold text-gray-400 group-hover:text-primary">{style}</span>
            </div>
          ))}

          <div className="aspect-square rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center relative cursor-pointer hover:bg-white dark:hover:bg-gray-800 transition-colors group">
            <span className="material-symbols-rounded text-gray-300 group-hover:text-primary">add</span>
          </div>
        </div>
      </div>

      {/* TPO Section */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5 px-1 tracking-tight">TPO</h2>
        <div className="grid grid-cols-3 gap-3">
          {/* Dining Out */}
          <div className="aspect-square rounded-3xl bg-gray-100 dark:bg-gray-800 overflow-hidden relative group cursor-pointer shadow-sm">
            <img alt="Dining Out" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400" />
            <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors"></div>
            <div className="absolute bottom-2 inset-x-2">
              <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-xl py-2 text-center shadow-sm">
                <span className="text-[11px] font-bold text-gray-900 dark:text-white">외식</span>
              </div>
            </div>
          </div>
          
          {/* Daily */}
          <div className="aspect-square rounded-3xl bg-gray-100 dark:bg-gray-800 overflow-hidden relative group cursor-pointer shadow-sm">
            <img alt="Daily" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://images.unsplash.com/photo-1515347619252-60a6bf4fffce?w=400" />
            <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors"></div>
            <div className="absolute bottom-2 inset-x-2">
              <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-xl py-2 text-center shadow-sm">
                <span className="text-[11px] font-bold text-gray-900 dark:text-white">데일리</span>
              </div>
            </div>
          </div>

          {['출근', '여행', '파티'].map((tpo) => (
            <div key={tpo} className="aspect-square rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center relative cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
              <span className="text-xs font-semibold text-gray-400 group-hover:text-primary">{tpo}</span>
            </div>
          ))}

          <div className="aspect-square rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center relative cursor-pointer hover:bg-white dark:hover:bg-gray-800 transition-colors group">
            <span className="material-symbols-rounded text-gray-300 group-hover:text-primary">add</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutfitRecommender;
