import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';

const RecentOutfits = ({ onClothClick }) => {
  const [recentLogs, setRecentLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // 착장 기록 새로고침 트리거 구독
  const outfitLogVersion = useAppStore(state => state.outfitLogVersion);

  const fetchRecentLogs = useCallback(async () => {
    try {
      
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/outfit-log?limit=4`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const logs = await response.json();
        if (logs && logs.length > 0) {
          const sortedLogs = logs.sort((a, b) => new Date(b.wornDate) - new Date(a.wornDate));
          setRecentLogs(sortedLogs.slice(0, 4));
        } else {
          setRecentLogs([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch recent outfit logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기 로드 및 outfitLogVersion 변경 시 새로고침
  useEffect(() => {
    fetchRecentLogs();
  }, [fetchRecentLogs, outfitLogVersion]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekDay = weekDays[date.getDay()];
    return `${month}/${day} (${weekDay})`;
  };

  const getOutfitItems = (log) => {
    return [
      { type: 'outer', item: log.outer },
      { type: 'top', item: log.top },
      { type: 'bottom', item: log.bottom },
      { type: 'shoes', item: log.shoes },
    ].filter(i => i.item);
  };

  if (recentLogs.length === 0 && !isLoading) return null;

  if (isLoading) {
    return (
      <div className="w-full h-32 rounded-[28px] p-4 shadow-soft border border-gold/30 bg-white/50 animate-pulse flex items-center justify-center">
        <span className="text-gray-400 text-sm">로딩 중...</span>
      </div>
    );
  }

  return (
    <>
      <div className="w-full mt-3">
        <div className="rounded-[28px] p-4 shadow-soft border border-gold/30 bg-white relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-base md:text-xl font-bold text-charcoal flex items-center gap-1.5">
              <span className="material-symbols-rounded text-gold text-lg md:text-2xl">history</span>
              최근 입은 코디
            </h3>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs md:text-sm font-medium text-gold hover:text-gold-dark transition-colors flex items-center gap-1"
            >
              전체 보기
              <span className="material-symbols-rounded text-sm md:text-base">arrow_forward</span>
            </button>
          </div>

          {/* 3개의 코디 카드를 가로로 나열 */}
          <div className="flex gap-4 overflow-x-auto pb-2 pt-3 hide-scrollbar justify-center">
            {recentLogs.map((log, index) => {
              const outfitItems = getOutfitItems(log);
              return (
                <div 
                  key={log.id || index}
                  className="flex-shrink-0 bg-gradient-to-br from-cream to-white rounded-2xl p-3 border-2 border-gold/30 shadow-md relative"
                >
                  {/* 날짜 라벨 */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gold text-white text-[10px] md:text-xs font-bold px-2 md:px-3 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                    {formatDate(log.wornDate)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1.5 md:gap-2 mt-2">
                    {outfitItems.map(({ type, item }) => (
                      <div 
                        key={`${type}-${item.id}`}
                        className="flex flex-col items-center group cursor-pointer"
                        onClick={() => onClothClick && onClothClick(item)}
                      >
                        <div className="w-12 h-16 md:w-16 md:h-20 rounded-lg overflow-hidden border border-gold-light/30 shadow-sm relative bg-white group-hover:shadow-md group-hover:scale-105 transition-all duration-200">
                          <img
                            src={item.imageUrl || item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-[8px] md:text-[9px] text-charcoal-light mt-1 font-medium">
                          {type === 'outer' && '외투'}
                          {type === 'top' && '상의'}
                          {type === 'bottom' && '하의'}
                          {type === 'shoes' && '신발'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 전체 보기 모달 */}
      {showModal && (
        <OutfitHistoryModal
          onClose={() => setShowModal(false)}
          onClothClick={onClothClick}
          formatDate={formatDate}
          getOutfitItems={getOutfitItems}
        />
      )}
    </>
  );
};

// 전체 보기 모달 컴포넌트
const OutfitHistoryModal = ({ onClose, onClothClick, formatDate, getOutfitItems }) => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const scrollRef = useRef(null);
  const LIMIT = 8;

  const fetchLogs = useCallback(async (currentOffset) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/outfit-log?limit=${LIMIT}&offset=${currentOffset}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const newLogs = await response.json();
        if (newLogs.length < LIMIT) {
          setHasMore(false);
        }
        setLogs(prev => currentOffset === 0 ? newLogs : [...prev, ...newLogs]);
        setOffset(currentOffset + newLogs.length);
      }
    } catch (error) {
      console.error('Failed to fetch outfit logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    fetchLogs(0);
  }, []);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !isLoading) {
      fetchLogs(offset);
    }
  };

  // 모달 외부 클릭 시 닫기
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-slideUp">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gold/20">
          <h2 className="text-lg font-bold text-charcoal flex items-center gap-2">
            <span className="material-symbols-rounded text-gold">history</span>
            착장 히스토리
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-rounded text-charcoal-light">close</span>
          </button>
        </div>

        {/* 스크롤 영역 */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {logs.map((log, index) => {
            const outfitItems = getOutfitItems(log);
            return (
              <div 
                key={log.id || index}
                className="bg-gradient-to-br from-cream to-white rounded-2xl p-4 border border-gold/20 shadow-sm"
              >
                {/* 날짜 헤더 */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-gold text-white text-xs font-bold px-3 py-1 rounded-full">
                    {formatDate(log.wornDate)}
                  </span>
                  {log.tpo && (
                    <span className="text-xs text-charcoal-light bg-gray-100 px-2 py-0.5 rounded-full">
                      {log.tpo}
                    </span>
                  )}
                </div>
                
                {/* 아이템 그리드 */}
                <div className="flex gap-3 overflow-x-auto hide-scrollbar">
                  {outfitItems.map(({ type, item }) => (
                    <div 
                      key={`${type}-${item.id}`}
                      className="flex-shrink-0 flex flex-col items-center group cursor-pointer"
                      onClick={() => onClothClick && onClothClick(item)}
                    >
                      <div className="w-16 h-20 rounded-lg overflow-hidden border border-gold-light/30 shadow-sm relative bg-white group-hover:shadow-md group-hover:scale-105 transition-all duration-200">
                        <img
                          src={item.imageUrl || item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-[9px] text-charcoal-light mt-1 font-medium">
                        {type === 'outer' && '외투'}
                        {type === 'top' && '상의'}
                        {type === 'bottom' && '하의'}
                        {type === 'shoes' && '신발'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* 로딩 인디케이터 */}
          {isLoading && (
            <div className="flex justify-center py-4">
              <span className="material-symbols-rounded animate-spin text-gold text-2xl">progress_activity</span>
            </div>
          )}

          {/* 더 이상 데이터 없음 */}
          {!hasMore && logs.length > 0 && (
            <p className="text-center text-sm text-charcoal-light py-2">
              모든 착장 기록을 불러왔습니다 ✨
            </p>
          )}

          {/* 빈 상태 */}
          {!isLoading && logs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="material-symbols-rounded text-4xl text-gold-light mb-2">checkroom</span>
              <p className="text-charcoal-light">아직 착장 기록이 없어요</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default RecentOutfits;
