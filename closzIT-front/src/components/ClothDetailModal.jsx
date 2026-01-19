// src/components/ClothDetailModal.jsx
// 공유 의류 상세 모달 컴포넌트 - 클릭으로 상세 패널 토글
import React, { useState } from 'react';

// ========== 영어 → 한글 번역 매핑 ==========
const translations = {
  categories: {
    outerwear: '외투',
    tops: '상의',
    bottoms: '하의',
    shoes: '신발',
    Outer: '외투',
    Top: '상의',
    Bottom: '하의',
    Shoes: '신발',
  },
  tpos: {
    Daily: '데일리',
    Commute: '출근',
    Date: '데이트',
    Sports: '운동',
    Travel: '여행',
    Party: '파티',
    School: '학교',
    Home: '집',
  },
  styleMoods: {
    Casual: '캐주얼',
    Street: '스트릿',
    Minimal: '미니멀',
    Formal: '포멀',
    Sporty: '스포티',
    Vintage: '빈티지',
    Gorpcore: '고프코어',
  },
  seasons: {
    Spring: '봄',
    Summer: '여름',
    Autumn: '가을',
    Fall: '가을',
    Winter: '겨울',
  },
  colors: {
    Black: '블랙',
    White: '화이트',
    Gray: '그레이',
    Grey: '그레이',
    Beige: '베이지',
    Brown: '브라운',
    Navy: '네이비',
    Blue: '블루',
    'Sky-blue': '하늘색',
    Red: '레드',
    Pink: '핑크',
    Orange: '오렌지',
    Yellow: '옐로우',
    Green: '그린',
    Mint: '민트',
    Purple: '퍼플',
    Khaki: '카키',
  },
};

const translateValue = (type, value) => {
  if (!value) return null;
  const map = translations[type];
  if (!map) return value;

  if (Array.isArray(value)) {
    return value.map(v => map[v] || v).join(', ');
  }
  return map[value] || value;
};

const ClothDetailModal = ({
  cloth,
  onClose,
  onTryOn,
  onEdit,
  onDelete,
  showActions = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!cloth) return null;

  const renderInfoSection = (label, value) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    const displayValue = Array.isArray(value) ? value.join(', ') : value;
    if (!displayValue || displayValue === 'undefined') return null;
    return (
      <div className="bg-cream-dark/50 dark:bg-charcoal-light/20 rounded-xl p-3">
        <p className="text-[10px] text-charcoal-light dark:text-cream-dark uppercase font-semibold mb-1">{label}</p>
        <p className="text-sm font-medium text-charcoal dark:text-cream">{displayValue}</p>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-warm-white dark:bg-charcoal rounded-3xl shadow-2xl w-[90%] max-w-sm overflow-hidden relative flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          <span className="material-symbols-rounded text-white text-lg">close</span>
        </button>

        {/* 이미지 영역 - 높이 우선 (object-contain) */}
        <div
          className="relative bg-charcoal/10 flex-shrink-0 transition-all duration-300 ease-out"
          style={{ height: isExpanded ? '180px' : '400px' }}
        >
          <img
            src={cloth.flattenImageUrl || cloth.image || cloth.imageUrl}
            alt={cloth.name}
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

          {/* 이름 오버레이 */}
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="text-white text-xl font-bold drop-shadow-lg">{cloth.name || '의류'}</h3>
            <p className="text-white/80 text-sm">
              {translateValue('categories', cloth.category)}
              {cloth.subCategory && ` · ${cloth.subCategory}`}
            </p>
          </div>
        </div>

        {/* 하단 콘텐츠 영역 */}
        <div className="bg-warm-white dark:bg-charcoal flex-1 overflow-hidden">
          {/* 상세 정보 보기 버튼 */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full py-3 flex items-center justify-center gap-2 text-gold font-medium hover:bg-gold/10 transition-colors border-b border-gold-light/20"
          >
            <span className="material-symbols-rounded text-lg">
              {isExpanded ? 'expand_more' : 'expand_less'}
            </span>
            {isExpanded ? '상세 정보 닫기' : '상세 정보 보기'}
          </button>

          {/* 옷 정보 수정하기 버튼 */}
          {showActions && onEdit && (
            <button
              onClick={onEdit}
              className="w-full py-3 flex items-center justify-center gap-2 text-gold-dark font-medium hover:bg-gold/10 transition-colors border-b border-gold-light/20"
            >
              <span className="material-symbols-rounded text-lg">edit</span>
              옷 정보 수정하기
            </button>
          )}

          {/* 상세 정보 콘텐츠 (토글) */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}
          >
            <div className="p-4 space-y-2 max-h-[250px] overflow-y-auto">
              {renderInfoSection('TPO', translateValue('tpos', cloth.tpos))}
              {renderInfoSection('스타일', translateValue('styleMoods', cloth.styleMoods))}
              {renderInfoSection('계절', translateValue('seasons', cloth.seasons))}
              {renderInfoSection('색상', translateValue('colors', cloth.colors))}
              {cloth.wearCount !== undefined && renderInfoSection('착용 횟수', `${cloth.wearCount}회`)}

              {/* 삭제 버튼 - 상세 정보 안에 */}
              {showActions && onDelete && (
                <div className="pt-2">
                  <button
                    onClick={onDelete}
                    className="w-full py-2.5 bg-red-50 text-red-500 rounded-xl font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <span className="material-symbols-rounded text-base">delete</span>
                    삭제
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 원 클릭 착장 버튼 - 항상 보임 */}
          {showActions && onTryOn && (
            <div className="p-4 pt-2">
              <button
                onClick={onTryOn}
                className="w-full py-3.5 bg-gradient-to-r from-gold to-gold-dark text-white rounded-xl font-bold hover:from-gold-dark hover:to-gold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <span className="material-symbols-rounded text-lg">auto_awesome</span>
                원 클릭 착장
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClothDetailModal;
