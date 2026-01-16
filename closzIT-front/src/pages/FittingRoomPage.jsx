// src/pages/FittingRoomPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SharedHeader from '../components/SharedHeader';
import ClothDetailModal from '../components/ClothDetailModal';
import { useVtoStore } from '../stores/vtoStore';
import { addVtoResult, VTO_TYPE_SINGLE } from '../utils/vtoStorage';
import { useUserStore } from '../stores/userStore';
import { useTabStore, TAB_KEYS } from '../stores/tabStore';
import { GiTrousers, GiTShirt, GiMonclerJacket } from 'react-icons/gi';

// 카테고리 매핑 (customIcon: true인 경우 React Icons 사용)
const categoryMap = {
  outerwear: { name: '외투', icon: 'jacket', color: '#D4AF37', customIcon: true, IconComponent: GiMonclerJacket },
  tops: { name: '상의', icon: 'tshirt', color: '#B8860B', customIcon: true, IconComponent: GiTShirt },
  bottoms: { name: '하의', icon: 'trousers', color: '#CD853F', customIcon: true, IconComponent: GiTrousers },
  shoes: { name: '신발', icon: 'steps', color: '#DAA520' },
};

const saveToHistory = (imageUrl, clothDetail) => {
  const newHistoryItem = {
    id: Date.now(),
    imageUrl: imageUrl, // resultUrl 대신 전달받은 imageUrl 사용
    clothName: clothDetail?.name || 'Unknown Item',
    timestamp: new Date().toLocaleString(),
  };

  const saved = JSON.parse(localStorage.getItem('vto_history') || '[]');
  const updated = [newHistoryItem, ...saved].slice(0, 5); // 최신 20개만 유지

  localStorage.setItem('vto_history', JSON.stringify(updated));

  // ⭐ 저장 직후 바로 신호를 보냅니다.
  window.dispatchEvent(new Event('historyUpdate'));
};

// 키워드 필터 옵션 (백엔드 필드명과 일치: tpos, styleMoods, seasons, colors)
const keywordGroups = [
  {
    title: 'TPO',
    key: 'tpos',
    options: [
      { label: '데일리', value: 'Daily' }, { label: '출근', value: 'Commute' },
      { label: '데이트', value: 'Date' }, { label: '운동', value: 'Sports' },
      { label: '여행', value: 'Travel' }, { label: '결혼식', value: 'Wedding' },
      { label: '파티', value: 'Party' }, { label: '학교', value: 'School' },
      { label: '집', value: 'Home' }
    ]
  },
  {
    title: '스타일',
    key: 'styleMoods',
    options: [
      { label: '캐주얼', value: 'Casual' }, { label: '스트릿', value: 'Street' },
      { label: '미니멀', value: 'Minimal' }, { label: '포멀', value: 'Formal' },
      { label: '스포티', value: 'Sporty' }, { label: '빈티지', value: 'Vintage' },
      { label: '고프코어', value: 'Gorpcore' }
    ]
  },
  {
    title: '계절',
    key: 'seasons',
    options: [
      { label: '봄', value: 'Spring' }, { label: '여름', value: 'Summer' },
      { label: '가을', value: 'Autumn' }, { label: '겨울', value: 'Winter' }
    ]
  },
  {
    title: '색상',
    key: 'colors',
    options: [
      { label: '블랙', value: 'Black' }, { label: '화이트', value: 'White' },
      { label: '그레이', value: 'Gray' }, { label: '베이지', value: 'Beige' },
      { label: '브라운', value: 'Brown' }, { label: '네이비', value: 'Navy' },
      { label: '블루', value: 'Blue' }, { label: '하늘색', value: 'Sky-blue' },
      { label: '레드', value: 'Red' }, { label: '핑크', value: 'Pink' },
      { label: '오렌지', value: 'Orange' }, { label: '옐로우', value: 'Yellow' },
      { label: '그린', value: 'Green' }, { label: '민트', value: 'Mint' },
      { label: '퍼플', value: 'Purple' }, { label: '카키', value: 'Khaki' }
    ]
  }
];

const FittingRoomPage = ({ hideHeader = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTab, consumePendingTryOnCloth } = useTabStore();
  const { requestPartialVtoByIds, checkPartialVtoLoading } = useVtoStore();
  const isFullOutfitLoading = checkPartialVtoLoading('fitting-room');

  // vtoStore에서 로딩 상태 관리 함수 가져오기
  const { startSingleItemLoading, stopSingleItemLoading, refreshVtoData } = useVtoStore();

  // vtoStore에서 로딩 상태 관리 함수 가져오기
  const { startSingleItemLoading, stopSingleItemLoading, refreshVtoData } = useVtoStore();

  // VTO 상태
  const [isVtoLoading, setIsVtoLoading] = useState(false);
  const [userFullBodyImage, setUserFullBodyImage] = useState(null);
  const [beforeAfterImage, setBeforeAfterImage] = useState(null);
  const [selectedClothDetail, setSelectedClothDetail] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const loadHistory = () => {
      const saved = JSON.parse(localStorage.getItem('vto_history') || '[]');
      setHistory(saved);
    };
    loadHistory();
  }, [beforeAfterImage]);

  const deleteHistoryItem = (id) => {
    const updated = history.filter(item => item.id !== id);
    localStorage.setItem('vto_history', JSON.stringify(updated));
    setHistory(updated);
  };

  useEffect(() => {
    // FittingRoom 탭이 활성화될 때만 실행
    if (activeTab !== TAB_KEYS.FITTING_ROOM) return;

    const runAutoTryOn = async () => {
      // tabStore에서 pending 데이터 가져오기 (한 번만 소비)
      const tryOnCloth = consumePendingTryOnCloth();
      if (!tryOnCloth) return;

      try {
        const token = localStorage.getItem('accessToken');
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
        const clothingId = tryOnCloth.id;
        const category = tryOnCloth.category;

        console.log(`[VTO] Auto try-on for clothing: ${clothingId}, category: ${category}`);

        setIsVtoLoading(true);
        startSingleItemLoading('fitting-room'); // 헤더 로딩 애니메이션 시작

        const response = await fetch(`${backendUrl}/api/fitting/single-item-tryon`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clothingId: clothingId,
            clothingOwnerId: tryOnCloth.userId, // 다른 사람 옷 입어보기 지원
            category: category,
            denoiseSteps: 10,
            seed: 42,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '가상 피팅 요청 실패');
        }

        const result = await response.json();

        if (result.success && result.imageUrl) {
          setBeforeAfterImage(result.imageUrl);
          saveToHistory(result.imageUrl, tryOnCloth || selectedClothDetail);

          // 새 VTO 결과 모달에도 저장
          addVtoResult({
            imageUrl: result.imageUrl,
            postId: 'direct-fitting',
            appliedClothing: [tryOnCloth?.name || '옷'],
            isDirect: true
          }, VTO_TYPE_SINGLE);
          refreshVtoData(); // 스토어 새로고침
        } else {
          throw new Error('결과 이미지를 받지 못했습니다.');
        }
      } catch (error) {
        console.error('Auto try-on error:', error);
        alert(`가상 피팅 실패: ${error.message}`);
      } finally {
        setIsVtoLoading(false);
        stopSingleItemLoading('fitting-room'); // 헤더 로딩 애니메이션 종료
      }
    };

    runAutoTryOn();
  }, [activeTab, consumePendingTryOnCloth, startSingleItemLoading, stopSingleItemLoading, refreshVtoData]);

  // 옷장 현황 상태
  const [wardrobeStats, setWardrobeStats] = useState({
    outerwear: 0,
    tops: 0,
    bottoms: 0,
    shoes: 0,
    total: 0,
  });

  // 확장된 카테고리 상태
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [userClothes, setUserClothes] = useState({
    outerwear: [],
    tops: [],
    bottoms: [],
    shoes: [],
  });

  // 키워드 필터 상태
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);
  const [filterState, setFilterState] = useState({
    tpos: [],
    styleMoods: [],
    seasons: [],
    colors: [],
  });

  // 선택된 옷 상태 (카테고리별 1개씩)
  const [selectedOutfit, setSelectedOutfit] = useState({
    outerwear: null,
    tops: null,
    bottoms: null,
    shoes: null,
  });

  // 선택된 옷이 있는지 확인
  const hasSelectedItems = Object.values(selectedOutfit).some(item => item !== null);

  // 옷 선택/해제 토글
  const toggleClothSelection = (cloth, category) => {
    setSelectedOutfit(prev => {
      // 이미 선택된 옷이면 해제
      if (prev[category]?.id === cloth.id) {
        return { ...prev, [category]: null };
      }
      // 새로운 옷 선택
      return { ...prev, [category]: cloth };
    });
  };

  // 선택 해제 (X 버튼)
  const removeSelection = (category) => {
    setSelectedOutfit(prev => ({ ...prev, [category]: null }));
  };

  // 전체 착장 입어보기 요청
  const handleFullOutfitTryOn = (e) => {
    if (!hasSelectedItems || isFullOutfitLoading) return;

    // 버튼 위치 계산 (애니메이션 시작점)
    let buttonPosition = null;
    if (e?.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect();
      buttonPosition = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }

    const clothingIds = {
      outerId: selectedOutfit.outerwear?.id,
      topId: selectedOutfit.tops?.id,
      bottomId: selectedOutfit.bottoms?.id,
      shoesId: selectedOutfit.shoes?.id,
    };

    requestPartialVtoByIds(clothingIds, buttonPosition, 'fitting-room');
  };

  // 필터링된 옷 목록 계산
  const filteredClothes = React.useMemo(() => {
    const hasActiveFilters = Object.values(filterState).some(arr => arr.length > 0);
    if (!hasActiveFilters) return userClothes;

    const result = { ...userClothes };
    Object.keys(result).forEach(category => {
      if (!result[category]) return;
      result[category] = result[category].filter(item => {
        return Object.entries(filterState).every(([key, selectedValues]) => {
          if (selectedValues.length === 0) return true;
          const itemValue = item[key];
          if (!itemValue) return false;
          const valuesArray = Array.isArray(itemValue) ? itemValue : [itemValue];
          return selectedValues.some(v => valuesArray.includes(v));
        });
      });
    });
    return result;
  }, [userClothes, filterState]);

  // 필터링된 통계 계산
  const filteredStats = React.useMemo(() => {
    return {
      outerwear: filteredClothes.outerwear?.length || 0,
      tops: filteredClothes.tops?.length || 0,
      bottoms: filteredClothes.bottoms?.length || 0,
      shoes: filteredClothes.shoes?.length || 0,
      total: (filteredClothes.outerwear?.length || 0) + (filteredClothes.tops?.length || 0) +
        (filteredClothes.bottoms?.length || 0) + (filteredClothes.shoes?.length || 0),
    };
  }, [filteredClothes]);

  // 스크롤 상태 감지
  const clothesScrollRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollRotation, setScrollRotation] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const lastScrollLeftRef = useRef(0);
  const scrollTimeoutRef = useRef(null);

  const handleClothesScroll = (e) => {
    if (!hasScrolled) setHasScrolled(true);
    const currentScrollLeft = e.target.scrollLeft;
    const deltaX = currentScrollLeft - lastScrollLeftRef.current;
    const rotation = Math.max(Math.min(deltaX * 0.8, 30), -30);
    setScrollRotation(rotation);
    setIsScrolling(true);
    lastScrollLeftRef.current = currentScrollLeft;

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      setScrollRotation(0);
    }, 100);
  };

  // 카테고리 변경 시 상태 초기화
  useEffect(() => {
    setHasScrolled(false);
    setScrollRotation(0);
    if (clothesScrollRef.current) {
      clothesScrollRef.current.scrollLeft = 0;
      lastScrollLeftRef.current = 0;
    }
  }, [expandedCategory]);

  // 사용자 정보 및 전신 사진 가져오기
  const { userFullBodyImage: storeFullBodyImage, fetchUser } = useUserStore();

  useEffect(() => {
    const loadUserImage = async () => {
      await fetchUser();
    };
    loadUserImage();
  }, [fetchUser]);

  useEffect(() => {
    if (storeFullBodyImage) {
      setUserFullBodyImage(storeFullBodyImage);
    }
  }, [storeFullBodyImage]);

  // 옷장 현황 API 호출 함수
  const fetchWardrobeStats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/items/by-category`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const stats = {
          outerwear: data.outerwear?.length || 0,
          tops: data.tops?.length || 0,
          bottoms: data.bottoms?.length || 0,
          shoes: data.shoes?.length || 0,
          total: (data.outerwear?.length || 0) + (data.tops?.length || 0) +
            (data.bottoms?.length || 0) + (data.shoes?.length || 0),
        };

        setWardrobeStats(stats);
        setUserClothes({
          outerwear: (data.outerwear || []).map(item => ({ ...item, category: 'outerwear' })),
          tops: (data.tops || []).map(item => ({ ...item, category: 'tops' })),
          bottoms: (data.bottoms || []).map(item => ({ ...item, category: 'bottoms' })),
          shoes: (data.shoes || []).map(item => ({ ...item, category: 'shoes' })),
        });
      }
    } catch (error) {
      console.error('Wardrobe API error:', error);
    }
  };

  // 초기 로드
  useEffect(() => {
    fetchWardrobeStats();
  }, []);

  // FittingRoom 탭으로 돌아올 때 데이터 새로고침
  useEffect(() => {
    if (activeTab === TAB_KEYS.FITTING_ROOM) {
      fetchWardrobeStats();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-cream dark:bg-[#1A1918] pb-20">
      {/* Header */}
      {!hideHeader && <SharedHeader />}

      <main className="px-4 pt-2 pb-4 space-y-4">
        {/* 카테고리별 현황 */}
        <div
          className="rounded-3xl p-4 shadow-soft border border-gold-light/20"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(250,248,245,0.98) 100%)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-charcoal dark:text-cream flex items-center gap-2">
              <span className="material-symbols-rounded text-gold text-lg">inventory_2</span>
              내 옷장 현황
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsKeywordModalOpen(true)}
                className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all text-xs font-medium ${Object.values(filterState).some(a => a.length > 0)
                  ? 'bg-gold text-white shadow-md'
                  : 'bg-white text-charcoal-light border border-gold-light/20 hover:bg-gold/10'
                  }`}
              >
                <span className="material-symbols-rounded text-sm">search</span>
                키워드 검색
              </button>
              {Object.values(filterState).some(a => a.length > 0) && (
                <button
                  onClick={() => setFilterState({ tpos: [], styleMoods: [], seasons: [], colors: [] })}
                  className="text-xs text-gold underline font-medium hover:text-gold-dark transition-colors"
                >
                  초기화
                </button>
              )}
              <span className="text-xs text-charcoal-light dark:text-cream-dark">총 {filteredStats.total}벌</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(categoryMap).map(([key, { name, icon, color }]) => (
              <button
                key={key}
                onClick={() => {
                  if (!expandedCategory) {
                    setShouldAnimate(true);
                  } else if (expandedCategory !== key) {
                    setShouldAnimate(false);
                  }
                  setExpandedCategory(expandedCategory === key ? null : key);
                }}
                className={`flex flex-col items-center p-3 rounded-2xl transition-all duration-300 border ${expandedCategory === key
                  ? 'bg-gold/10 border-gold/30 scale-105'
                  : 'bg-cream-dark/50 dark:bg-charcoal-light/10 hover:bg-gold/10 border-transparent hover:border-gold/20'
                  }`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
                  style={{ backgroundColor: `${color}20` }}
                >
                  {(() => {
                    const IconComp = categoryMap[key].IconComponent;
                    return categoryMap[key].customIcon && IconComp ? (
                      <IconComp className="text-xl" style={{ color }} />
                    ) : (
                      <span className="material-symbols-rounded text-lg" style={{ color }}>{icon}</span>
                    );
                  })()}
                </div>
                <span className="text-lg font-bold text-charcoal dark:text-cream">{filteredStats[key] || 0}</span>
                <span className="text-[10px] text-charcoal-light dark:text-cream-dark">{name}</span>
              </button>
            ))}
          </div>

          {/* 확장 옷봉 영역 */}
          <div
            className={`overflow-hidden transition-all duration-500 ease-out ${expandedCategory ? 'max-h-[300px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'
              }`}
          >
            <div className="relative pt-2">
              {/* 옷봉 레일 */}
              {expandedCategory && expandedCategory !== 'shoes' && filteredClothes[expandedCategory]?.length > 0 && (
                <div
                  className="absolute top-6 left-0 right-0 h-[14px] z-10 backdrop-blur-sm"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(245,236,215,0.7) 50%, rgba(212,175,55,0.2) 100%)',
                    borderTop: '2px solid #D4AF37',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,0.8), inset 0 -1px 2px rgba(212,175,55,0.3)',
                    animation: shouldAnimate ? 'slideInRail 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.4s backwards' : 'none',
                  }}
                />
              )}

              {/* 신발장 선반 */}
              {expandedCategory === 'shoes' && filteredClothes['shoes']?.length > 0 && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-[8px] z-10"
                  style={{
                    background: 'linear-gradient(to bottom, #8B5E3C, #5D3A1A)',
                    borderTop: '2px solid #D4AF37',
                    boxShadow: '0 -2px 4px rgba(0,0,0,0.15)',
                    animation: shouldAnimate ? 'slideInRail 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.4s backwards' : 'none',
                  }}
                />
              )}

              {/* 옷 카드들 */}
              <div
                ref={clothesScrollRef}
                onScroll={handleClothesScroll}
                className="flex gap-3 overflow-x-auto pb-3 hide-scrollbar relative z-10"
              >
                {expandedCategory && filteredClothes[expandedCategory]?.map((cloth, idx) => {
                  const isSelected = selectedOutfit[expandedCategory]?.id === cloth.id;
                  return (
                  <div
                    key={cloth.id}
                    onClick={() => toggleClothSelection(cloth, expandedCategory)}
                    className="flex-shrink-0 cursor-pointer group/card"
                    style={{
                      willChange: 'transform',
                      backfaceVisibility: 'hidden',
                      ...(expandedCategory === 'shoes' ? {
                        animation: shouldAnimate ? `slideInSimpleRight 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.55s backwards` : 'none',
                        transform: 'translate3d(0,0,0)',
                      } : {
                        transform: isScrolling
                          ? `rotate(${scrollRotation}deg) translate3d(0,0,0)`
                          : 'translate3d(0,0,0)',
                        transition: isScrolling ? 'transform 0.1s linear' : 'transform 0.2s cubic-bezier(0.25, 1.5, 0.5, 1)',
                        animation: isScrolling
                          ? 'none'
                          : (hasScrolled
                            ? 'none'
                            : (shouldAnimate
                              ? `appearSwingFromRight 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.55s backwards`
                              : 'none')),
                        transformOrigin: 'top center',
                      })
                    }}
                  >
                    {/* 옷걸이 */}
                    {expandedCategory !== 'shoes' && (
                      <div className="flex justify-center">
                        <img
                          src="/assets/hook.png"
                          alt="hook"
                          className="w-16 h-16 object-contain"
                        />
                      </div>
                    )}
                    {/* 옷 카드 */}
                    <div
                      className={`w-20 h-24 rounded-xl overflow-hidden relative backdrop-blur-sm transition-all duration-200 ${expandedCategory !== 'shoes' ? '-mt-4' : 'mt-2'} ${isSelected ? 'ring-2 ring-gold scale-105' : ''}`}
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
                        border: isSelected ? '2px solid #D4AF37' : '1.5px solid rgba(212,175,55,0.4)',
                        boxShadow: isSelected 
                          ? '0 4px 20px rgba(212,175,55,0.4), 0 0 0 1px rgba(255,255,255,0.5) inset'
                          : '0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.5) inset, 0 2px 4px rgba(212,175,55,0.15)',
                      }}
                    >
                      <img
                        alt={cloth.name || '옷'}
                        className="w-full h-full object-cover"
                        src={cloth.image || cloth.imageUrl}
                      />
                      {/* 선택됨 체크 표시 */}
                      {isSelected && (
                        <div className="absolute top-1 left-1 w-5 h-5 bg-gold rounded-full flex items-center justify-center shadow-md">
                          <span className="material-symbols-rounded text-white text-xs">check</span>
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClothDetail(cloth);
                        }}
                        className="absolute bottom-1 right-1 w-6 h-6 bg-white/90 dark:bg-charcoal/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/card:opacity-100 transition-all duration-200 hover:scale-110 hover:bg-white dark:hover:bg-charcoal"
                      >
                        <span className="material-symbols-rounded text-gold text-xs">info</span>
                      </button>
                    </div>
                  </div>
                  );
                })}

                {/* 빈 상태 */}
                {expandedCategory && (!filteredClothes[expandedCategory] || filteredClothes[expandedCategory].length === 0) && (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 px-4">
                    <span className="material-symbols-rounded text-4xl text-gold-light mb-2">checkroom</span>
                    <p className="text-sm font-medium text-charcoal dark:text-cream mb-1">
                      {expandedCategory === 'shoes' ? '아직 신발이 없어요 👟' : '아직 옷이 없어요 ✨'}
                    </p>
                    <p className="text-xs text-charcoal-light dark:text-cream-dark">
                      새 {expandedCategory === 'shoes' ? '신발을' : '옷을'} 등록해보세요!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 선택된 옷봉 섹션 */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-out ${
            hasSelectedItems ? 'max-h-[220px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div
            className="rounded-3xl p-4 shadow-soft border border-gold-light/20"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(250,248,245,0.98) 100%)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-charcoal dark:text-cream flex items-center gap-2">
                <span className="material-symbols-rounded text-gold text-base">checkroom</span>
                선택한 코디
              </h3>
              <div className="flex items-center gap-2">
                {/* 전체 입어보기 버튼 */}
                <button
                  onClick={handleFullOutfitTryOn}
                  disabled={isFullOutfitLoading}
                  className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm ${
                    isFullOutfitLoading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gold text-white hover:bg-gold-dark hover:shadow-md'
                  }`}
                >
                  {isFullOutfitLoading ? (
                    <>
                      <span className="material-symbols-rounded text-sm animate-spin">progress_activity</span>
                      입어보는 중...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-rounded text-sm">apparel</span>
                      전체 입어보기
                    </>
                  )}
                </button>
                
                {hasSelectedItems && (
                  <button
                    onClick={() => setSelectedOutfit({ outerwear: null, tops: null, bottoms: null, shoes: null })}
                    className="text-[10px] text-red-400 hover:text-red-500 transition-colors ml-1"
                  >
                    전체 해제
                  </button>
                )}
              </div>
            </div>

            {/* 선택된 옷봉 레일 - 위쪽과 동일한 디자인 */}
            <div className="relative pt-2">
              {/* 옷봉 레일 */}
              <div
                className="absolute top-6 left-0 right-0 h-[14px] z-0 backdrop-blur-sm"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(245,236,215,0.7) 50%, rgba(212,175,55,0.2) 100%)',
                  borderTop: '2px solid #D4AF37',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,0.8), inset 0 -1px 2px rgba(212,175,55,0.3)',
                }}
              />

              {/* 선택된 옷 카드들 - 순서 유지하며 선택된 것만 표시 */}
              <div className="flex gap-3 overflow-x-auto pb-3 hide-scrollbar relative z-10 justify-center">
                {['outerwear', 'tops', 'bottoms', 'shoes'].map((category) => {
                  const item = selectedOutfit[category];
                  if (!item) return null;
                  
                  return (
                    <div
                      key={`selected-${category}-${item.id}`}
                      className="flex-shrink-0 cursor-pointer group/selected"
                      style={{
                        animation: 'selectedSwingIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
                        transformOrigin: 'top center',
                      }}
                    >
                      {/* 옷걸이 */}
                      <div className="flex justify-center">
                        <img
                          src="/assets/hook.png"
                          alt="hook"
                          className="w-16 h-16 object-contain"
                        />
                      </div>
                      {/* 옷 카드 */}
                      <div
                        className="w-20 h-24 rounded-xl overflow-hidden relative backdrop-blur-sm -mt-4"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
                          border: '2px solid #D4AF37',
                          boxShadow: '0 4px 20px rgba(212,175,55,0.4), 0 0 0 1px rgba(255,255,255,0.5) inset',
                        }}
                      >
                        <img
                          alt={item.name || '옷'}
                          className="w-full h-full object-cover"
                          src={item.image || item.imageUrl}
                        />
                        {/* X 버튼 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSelection(category);
                          }}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500/90 text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover/selected:opacity-100 hover:bg-red-600 hover:scale-110 transition-all"
                        >
                          <span className="material-symbols-rounded text-xs">close</span>
                        </button>
                        {/* 카테고리 라벨 */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent py-1">
                          <span className="text-[9px] text-white font-medium block text-center">
                            {categoryMap[category].name}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Before & After 섹션 */}
        <div
          className="bg-white/90 dark:bg-charcoal/80 backdrop-blur-md rounded-3xl p-5 shadow-soft border border-gold-light/20"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(250,248,245,0.98) 100%)' }}
        >
          <h3 className="text-base font-bold text-charcoal dark:text-cream flex items-center gap-2 mb-4">
            <span className="material-symbols-rounded text-gold text-lg">compare</span>
            Before & After
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Before */}
            <div className="relative">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-cream-dark/30 dark:bg-charcoal-light/20 border border-gold-light/20">
                {userFullBodyImage ? (
                  <img
                    src={userFullBodyImage}
                    alt="Before"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-sm text-charcoal-light dark:text-cream-dark">사진 없음</span>
                  </div>
                )}
              </div>
              <div className="mt-2 text-center">
                <span className="text-xs font-semibold text-charcoal-light dark:text-cream-dark uppercase">Before</span>
              </div>
            </div>

            {/* After */}
            <div className="relative">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-cream-dark/30 dark:bg-charcoal-light/20 border border-gold-light/20">
                {beforeAfterImage ? (
                  <img
                    src={beforeAfterImage}
                    alt="After"
                    className="w-full h-full object-contain"
                  />
                ) : userFullBodyImage ? (
                  <img
                    src={userFullBodyImage}
                    alt="After"
                    className="w-full h-full object-contain opacity-50"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-sm text-charcoal-light dark:text-cream-dark">사진 없음</span>
                  </div>
                )}
                {isVtoLoading && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gold border-t-transparent"></div>
                  </div>
                )}
              </div>
              <div className="mt-2 text-center">
                <span className="text-xs font-semibold text-gold uppercase">After</span>
              </div>
            </div>
          </div>
        </div>

        {/* 애니메이션 스타일 */}
        <style>
          {`
            @keyframes appearSwingFromRight {
              0% { opacity: 0; transform: translateX(100vw) rotate(5deg); }
              50% { opacity: 1; transform: translateX(0) rotate(-3deg); }
              70% { transform: rotate(2deg); }
              85% { transform: rotate(-1deg); }
              100% { transform: rotate(0); }
            }
            
            @keyframes slideInRail {
              0% { opacity: 0; transform: translateX(100%); }
              100% { opacity: 1; transform: translateX(0); }
            }
            
            @keyframes slideInSimpleRight {
              0% { opacity: 0; transform: translateX(100vw); }
              100% { opacity: 1; transform: translateX(0); }
            }
            
            @keyframes slideInFromRight {
              0% { opacity: 0; transform: translateX(50px); }
              100% { opacity: 1; transform: translateX(0); }
            }
            
            .animate-slideInFromRight {
              animation: slideInFromRight 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
            }
            
            @keyframes selectedSwingIn {
              0% { opacity: 0; transform: translateX(100px) rotate(15deg); }
              40% { opacity: 1; transform: translateX(0) rotate(-8deg); }
              60% { transform: rotate(5deg); }
              80% { transform: rotate(-3deg); }
              100% { transform: rotate(0); }
            }
          `}
        </style>

      </main>

      {/* 옷 상세 모달 */}
      {selectedClothDetail && (
        <ClothDetailModal
          cloth={selectedClothDetail}
          onClose={() => setSelectedClothDetail(null)}
          onTryOn={async () => {
            const clothToTryOn = selectedClothDetail; // 클로저용 복사
            try {
              const token = localStorage.getItem('accessToken');
              const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
              const clothingId = clothToTryOn.id;
              const category = clothToTryOn.category;

              console.log(`[VTO] Starting try-on for clothing: ${clothingId}, category: ${category}`);

              setSelectedClothDetail(null);
              setIsVtoLoading(true);
              startSingleItemLoading('fitting-room'); // 헤더 로딩 애니메이션 시작

              const response = await fetch(`${backendUrl}/api/fitting/single-item-tryon`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  clothingId: clothingId,
                  clothingOwnerId: clothToTryOn.userId, // 다른 사람 옷 입어보기 지원
                  category: category,
                  denoiseSteps: 10,
                  seed: 42,
                }),
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '가상 피팅 요청 실패');
              }

              const result = await response.json();

              if (result.success && result.imageUrl) {
                setBeforeAfterImage(result.imageUrl);
                saveToHistory(result.imageUrl, clothToTryOn);

                // 새 VTO 결과 모달에도 저장
                addVtoResult({
                  imageUrl: result.imageUrl,
                  postId: 'direct-fitting',
                  appliedClothing: [clothToTryOn?.name || '옷'],
                  isDirect: true
                }, VTO_TYPE_SINGLE);
                refreshVtoData(); // 스토어 새로고침
              } else {
                throw new Error('결과 이미지를 받지 못했습니다.');
              }
            } catch (error) {
              console.error('Single item try-on error:', error);
              alert(`가상 피팅 실패: ${error.message}`);
            } finally {
              setIsVtoLoading(false);
              stopSingleItemLoading('fitting-room'); // 헤더 로딩 애니메이션 종료
            }
          }}
          onEdit={() => {
            const itemId = selectedClothDetail.id;
            setSelectedClothDetail(null);
            navigate(`/item/edit/${itemId}`);
          }}
          onDelete={async () => {
            if (window.confirm('정말 이 옷을 삭제하시겠습니까?')) {
              try {
                const token = localStorage.getItem('accessToken');
                const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000'}/items/${selectedClothDetail.id}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                  setUserClothes((prev) => {
                    const newClothes = { ...prev };
                    const category = selectedClothDetail.category;
                    if (newClothes[category]) {
                      newClothes[category] = newClothes[category].filter(item => item.id !== selectedClothDetail.id);
                    }
                    return newClothes;
                  });
                  setSelectedClothDetail(null);
                } else {
                  alert('삭제 실패');
                }
              } catch (e) {
                console.error(e);
                alert('삭제 실패');
              }
            }
          }}
        />
      )}


      {/* 키워드 필터 모달 */}
      {isKeywordModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center animate-fadeIn"
          onClick={() => setIsKeywordModalOpen(false)}
        >
          <div
            className="bg-warm-white dark:bg-charcoal w-full max-w-sm sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-slideUp sm:animate-slideDown max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gold-light/20 flex items-center justify-between bg-white/50 backdrop-blur-sm relative z-10">
              <h3 className="text-lg font-bold text-charcoal dark:text-cream">키워드로 옷 찾기</h3>
              <button
                onClick={() => {
                  setFilterState({ tpos: [], styleMoods: [], seasons: [], colors: [] });
                }}
                className="text-xs text-gold underline font-medium"
              >
                초기화
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {keywordGroups.map((group) => (
                <div key={group.key}>
                  <h4 className="text-sm font-bold text-charcoal dark:text-cream mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-gold rounded-full"></span>
                    {group.title}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((option) => {
                      const isSelected = filterState[group.key].includes(option.value);
                      return (
                        <button
                          key={option.value}
                          onClick={() => {
                            setFilterState(prev => {
                              const current = prev[group.key];
                              const updated = current.includes(option.value)
                                ? current.filter(v => v !== option.value)
                                : [...current, option.value];
                              return { ...prev, [group.key]: updated };
                            });
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${isSelected
                            ? 'bg-gold text-white border-gold shadow-md transform scale-105'
                            : 'bg-white dark:bg-charcoal-light border-gold-light/20 text-charcoal-light dark:text-cream-dark hover:border-gold/50'
                            }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gold-light/20 bg-white/50 backdrop-blur-sm safe-area-pb">
              <button
                onClick={() => setIsKeywordModalOpen(false)}
                className="w-full py-3.5 bg-gradient-to-r from-gold to-gold-dark text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
              >
                {(() => {
                  const total = Object.values(filteredClothes).reduce((acc, list) => acc + list.length, 0);
                  return `${total}벌의 옷 결과 보기`;
                })()}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FittingRoomPage;
