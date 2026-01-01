import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const OutfitRecommender = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // 일정 클릭 시 5초 로딩 후 코디 페이지로 이동
  const handleScheduleClick = (scheduleName) => {
    setLoadingMessage(`${scheduleName} 코디 추천 중...`);
    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      navigate('/outfit-sets');
    }, 5000);
  };

  return (
    <div className="animate-slideDown">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-sm w-[90%] text-center shadow-2xl">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
              <span className="absolute inset-0 flex items-center justify-center material-symbols-rounded text-3xl text-primary">checkroom</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white mb-2">{loadingMessage}</p>
            <p className="text-sm text-gray-500">AI가 최적의 코디를 분석하고 있어요</p>
            <div className="mt-4 flex justify-center gap-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        </div>
      )}

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

      {/* 오늘의 일정 Section */}
      <div className="mb-10">
        <div className="flex items-end justify-between mb-5 px-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">오늘의 일정</h2>
          <button className="text-xs font-medium text-gray-400 hover:text-primary transition-colors">전체보기</button>
        </div>
        <div className="flex gap-3">
          {/* 점심식사 카드 */}
          <div 
            onClick={() => handleScheduleClick('부모님과 점심식사')}
            className="flex-1 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 text-white p-4 shadow-lg relative overflow-hidden cursor-pointer transition-transform hover:-translate-y-1 active:scale-95"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">12:00</span>
              <span className="material-symbols-rounded text-white/70 text-lg">restaurant</span>
            </div>
            <p className="text-sm font-bold leading-tight">부모님과 점심식사</p>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
          </div>
          
          {/* 데이트 카드 */}
          <div 
            onClick={() => handleScheduleClick('데이트')}
            className="flex-1 rounded-2xl bg-gradient-to-br from-primary to-purple-500 text-white p-4 shadow-lg relative overflow-hidden cursor-pointer transition-transform hover:-translate-y-1 active:scale-95"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">16:00</span>
              <span className="material-symbols-rounded text-white/70 text-lg">favorite</span>
            </div>
            <p className="text-sm font-bold leading-tight">데이트</p>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
          </div>
        </div>
      </div>

      {/* Style Section */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5 px-1 tracking-tight">스타일</h2>
        <div className="flex flex-wrap gap-2">
          {['캐주얼', '힙', '모던', '스트릿', '빈티지', '미니멀'].map((style) => (
            <div key={style} className="px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors group">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-primary">{style}</span>
            </div>
          ))}
          <div className="px-4 py-2 rounded-full bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:border-primary transition-colors group">
            <span className="material-symbols-rounded text-gray-400 group-hover:text-primary text-lg">add</span>
          </div>
        </div>
      </div>

      {/* TPO Section */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5 px-1 tracking-tight">TPO</h2>
        <div className="flex flex-wrap gap-2">
          {['외식', '데일리', '출근', '여행', '파티', '데이트'].map((tpo) => (
            <div key={tpo} className="px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors group">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-primary">{tpo}</span>
            </div>
          ))}
          <div className="px-4 py-2 rounded-full bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:border-primary transition-colors group">
            <span className="material-symbols-rounded text-gray-400 group-hover:text-primary text-lg">add</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutfitRecommender;
