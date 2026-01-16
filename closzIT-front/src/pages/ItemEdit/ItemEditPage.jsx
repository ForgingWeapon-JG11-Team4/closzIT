import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SharedHeader from '../../components/SharedHeader';
import BottomNav from '../../components/BottomNav';

// 카테고리 옵션 (한글 매핑)
const categoryLabels = {
  'Outer': '아우터',
  'Top': '상의',
  'Bottom': '하의',
  'Shoes': '신발'
};

const subCategoryLabels = {
  // Outer
  'Cardigan': '가디건', 'Jacket': '자켓', 'Blazer': '블레이저', 'Jumper': '점퍼',
  'Padding': '패딩', 'Coat': '코트', 'Vest': '조끼', 'Hoodie-zipup': '후드집업',
  'Windbreaker': '윈드브레이커',
  // Top
  'Short-sleeve-T': '반팔티', 'Long-sleeve-T': '긴팔티', 'Hoodie': '후드티',
  'Sweatshirt': '맨투맨', 'Knit': '니트', 'Shirt': '셔츠', 'Sleeveless': '민소매',
  'Polo-shirt': '폴로셔츠',
  // Bottom
  'Denim': '청바지', 'Slacks': '슬랙스', 'Cotton-pants': '면바지',
  'Sweatpants': '트레이닝', 'Shorts': '반바지', 'Skirt': '스커트', 'Leggings': '레깅스',
  // Shoes
  'Sneakers': '스니커즈', 'Loafers': '로퍼', 'Dress-shoes': '구두',
  'Boots': '부츠', 'Sandals': '샌들', 'Slippers': '슬리퍼',
  'Other': '기타'
};

// 계절 옵션
const seasonOptions = [
  { label: '봄', value: 'Spring' },
  { label: '여름', value: 'Summer' },
  { label: '가을', value: 'Autumn' },
  { label: '겨울', value: 'Winter' }
];

// TPO 옵션
const tpoOptions = [
  { label: '데일리', value: 'Daily' },
  { label: '출근', value: 'Commute' },
  { label: '데이트', value: 'Date' },
  { label: '운동', value: 'Sports' },
  { label: '여행', value: 'Travel' },
  { label: '결혼식', value: 'Wedding' },
  { label: '파티', value: 'Party' },
  { label: '학교', value: 'School' },
  { label: '집', value: 'Home' }
];

// 카테고리 옵션
const categoryOptions = {
  'Outer': ['Cardigan', 'Jacket', 'Blazer', 'Jumper', 'Padding', 'Coat', 'Vest', 'Hoodie-zipup', 'Windbreaker'],
  'Top': ['Short-sleeve-T', 'Long-sleeve-T', 'Hoodie', 'Sweatshirt', 'Knit', 'Shirt', 'Sleeveless', 'Polo-shirt'],
  'Bottom': ['Denim', 'Slacks', 'Cotton-pants', 'Sweatpants', 'Shorts', 'Skirt', 'Leggings'],
  'Shoes': ['Sneakers', 'Loafers', 'Dress-shoes', 'Boots', 'Sandals', 'Slippers']
};

// 색상 옵션
const colorOptions = [
  { name: '블랙', value: 'Black', hex: '#000000' },
  { name: '화이트', value: 'White', hex: '#ffffff' },
  { name: '그레이', value: 'Gray', hex: '#808080' },
  { name: '베이지', value: 'Beige', hex: '#f5f5dc' },
  { name: '브라운', value: 'Brown', hex: '#8b4513' },
  { name: '네이비', value: 'Navy', hex: '#000080' },
  { name: '블루', value: 'Blue', hex: '#3b82f6' },
  { name: '스카이블루', value: 'Sky-blue', hex: '#87ceeb' },
  { name: '레드', value: 'Red', hex: '#dc2626' },
  { name: '핑크', value: 'Pink', hex: '#ec4899' },
  { name: '오렌지', value: 'Orange', hex: '#f97316' },
  { name: '옐로우', value: 'Yellow', hex: '#eab308' },
  { name: '그린', value: 'Green', hex: '#22c55e' },
  { name: '민트', value: 'Mint', hex: '#a7f3d0' },
  { name: '퍼플', value: 'Purple', hex: '#a855f7' },
  { name: '카키', value: 'Khaki', hex: '#6b7280' },
];

// 패턴 옵션
const patternOptions = [
  { label: '무지', value: 'Solid' },
  { label: '스트라이프', value: 'Stripe' },
  { label: '체크', value: 'Check' },
  { label: '도트', value: 'Dot' },
  { label: '플로럴', value: 'Floral' },
  { label: '애니멀', value: 'Animal' },
  { label: '그래픽', value: 'Graphic' },
  { label: '카모', value: 'Camouflage' },
  { label: '아가일', value: 'Argyle' },
];

// 디테일 옵션
const detailOptions = [
  { label: '로고', value: 'Logo' },
  { label: '포켓', value: 'Pocket' },
  { label: '버튼', value: 'Button' },
  { label: '지퍼', value: 'Zipper' },
  { label: '후드', value: 'Hood' },
  { label: '자수', value: 'Embroidery' },
  { label: '퀼팅', value: 'Quilted' },
  { label: '워싱', value: 'Distressed' },
  { label: '니트립', value: 'Knit-rib' },
];

// 스타일 무드 옵션
const styleMoodOptions = [
  { label: '캐주얼', value: 'Casual' },
  { label: '스트릿', value: 'Street' },
  { label: '미니멀', value: 'Minimal' },
  { label: '포멀', value: 'Formal' },
  { label: '스포티', value: 'Sporty' },
  { label: '빈티지', value: 'Vintage' },
  { label: '고프코어', value: 'Gorpcore' },
];

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

const ItemEditPage = () => {
  const navigate = useNavigate();
  const { itemId } = useParams(); // URL 파라미터에서 itemId 가져오기

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 폼 데이터
  const [formData, setFormData] = useState({
    category: '',
    subCategory: '',
    seasons: [],
    tpos: [],
    colors: [],
    patterns: [],
    details: [],
    styleMoods: [],
  });

  // 신발인지 확인 (패턴/디테일 숨김용)
  const isShoes = formData.category === 'Shoes';

  // 옷 정보 불러오기
  useEffect(() => {
    if (!itemId) {
      alert('옷 정보를 찾을 수 없습니다.');
      navigate(-1);
      return;
    }

    const fetchItemData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('옷 정보를 불러오는데 실패했습니다.');
        }

        const data = await response.json();

        // 데이터 매핑
        setFormData({
          category: data.category || '',
          subCategory: data.subCategory || '',
          seasons: data.seasons || [],
          tpos: data.tpos || [],
          colors: data.colors || [],
          patterns: data.patterns || [],
          details: data.details || [],
          styleMoods: data.styleMoods || [],
        });
      } catch (error) {
        console.error('Error fetching item data:', error);
        alert('옷 정보를 불러오는데 실패했습니다.');
        navigate(-1);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItemData();
  }, [itemId, navigate]);

  // 폼 데이터 업데이트
  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 토글 함수들
  const toggleSeason = (seasonValue) => {
    const current = formData.seasons || [];
    const updated = current.includes(seasonValue)
      ? current.filter(s => s !== seasonValue)
      : [...current, seasonValue];
    updateFormData('seasons', updated);
  };

  const toggleTpo = (tpoValue) => {
    const current = formData.tpos || [];
    const updated = current.includes(tpoValue)
      ? current.filter(t => t !== tpoValue)
      : [...current, tpoValue];
    updateFormData('tpos', updated);
  };

  const toggleColor = (colorValue) => {
    const current = formData.colors || [];
    const updated = current.includes(colorValue)
      ? current.filter(c => c !== colorValue)
      : [...current, colorValue];
    updateFormData('colors', updated);
  };

  const togglePattern = (patternValue) => {
    const current = formData.patterns || [];
    const updated = current.includes(patternValue)
      ? current.filter(p => p !== patternValue)
      : [...current, patternValue];
    updateFormData('patterns', updated);
  };

  const toggleDetail = (detailValue) => {
    const current = formData.details || [];
    const updated = current.includes(detailValue)
      ? current.filter(d => d !== detailValue)
      : [...current, detailValue];
    updateFormData('details', updated);
  };

  const toggleStyleMood = (styleMoodValue) => {
    const current = formData.styleMoods || [];
    const updated = current.includes(styleMoodValue)
      ? current.filter(s => s !== styleMoodValue)
      : [...current, styleMoodValue];
    updateFormData('styleMoods', updated);
  };

  // 저장 핸들러
  const handleSave = async () => {
    // 필수 항목 검증
    if (!formData.category || !formData.subCategory) {
      alert('카테고리와 세부 카테고리를 선택해주세요.');
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category: formData.category,
          subCategory: formData.subCategory,
          colors: formData.colors,
          patterns: formData.patterns,
          details: formData.details,
          styleMoods: formData.styleMoods,
          tpos: formData.tpos,
          seasons: formData.seasons,
        })
      });

      if (!response.ok) {
        throw new Error('옷 정보 수정에 실패했습니다.');
      }

      alert('옷 정보가 수정되었습니다.');
      navigate(-1);
    } catch (error) {
      console.error('Error updating item:', error);
      alert('옷 정보 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream dark:bg-[#1A1918] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-[#1A1918] pb-24">
      <SharedHeader
        title="옷 정보 수정"
        showBackButton
        onBackClick={() => navigate(-1)}
      />

      <div className="max-w-2xl mx-auto p-6 pt-6">
        {/* 카테고리 */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-charcoal dark:text-cream mb-3">카테고리</h3>
          <div className="grid grid-cols-4 gap-2">
            {Object.keys(categoryLabels).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  updateFormData('category', cat);
                  updateFormData('subCategory', '');
                }}
                className={`py-2 px-4 rounded-xl font-medium transition-colors ${formData.category === cat
                  ? 'bg-gold text-white'
                  : 'bg-warm-white dark:bg-charcoal text-charcoal dark:text-cream border border-gold-light/20'
                  }`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* 세부 카테고리 */}
        {formData.category && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-charcoal dark:text-cream mb-3">세부 카테고리</h3>
            <div className="flex flex-wrap gap-2">
              {categoryOptions[formData.category]?.map((subCat) => (
                <button
                  key={subCat}
                  onClick={() => updateFormData('subCategory', subCat)}
                  className={`py-2 px-4 rounded-xl font-medium transition-colors ${formData.subCategory === subCat
                    ? 'bg-gold text-white'
                    : 'bg-warm-white dark:bg-charcoal text-charcoal dark:text-cream border border-gold-light/20'
                    }`}
                >
                  {subCategoryLabels[subCat]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 계절 */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-charcoal dark:text-cream mb-3">계절</h3>
          <div className="flex flex-wrap gap-2">
            {seasonOptions.map((season) => (
              <button
                key={season.value}
                onClick={() => toggleSeason(season.value)}
                className={`py-2 px-4 rounded-xl font-medium transition-colors ${formData.seasons.includes(season.value)
                  ? 'bg-gold text-white'
                  : 'bg-warm-white dark:bg-charcoal text-charcoal dark:text-cream border border-gold-light/20'
                  }`}
              >
                {season.label}
              </button>
            ))}
          </div>
        </div>

        {/* TPO */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-charcoal dark:text-cream mb-3">TPO</h3>
          <div className="flex flex-wrap gap-2">
            {tpoOptions.map((tpo) => (
              <button
                key={tpo.value}
                onClick={() => toggleTpo(tpo.value)}
                className={`py-2 px-4 rounded-xl font-medium transition-colors ${formData.tpos.includes(tpo.value)
                  ? 'bg-gold text-white'
                  : 'bg-warm-white dark:bg-charcoal text-charcoal dark:text-cream border border-gold-light/20'
                  }`}
              >
                {tpo.label}
              </button>
            ))}
          </div>
        </div>

        {/* 색상 */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-charcoal dark:text-cream mb-3">색상</h3>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((color) => (
              <button
                key={color.value}
                onClick={() => toggleColor(color.value)}
                className={`py-2 px-4 rounded-xl font-medium transition-colors flex items-center gap-2 ${formData.colors.includes(color.value)
                  ? 'bg-gold text-white'
                  : 'bg-warm-white dark:bg-charcoal text-charcoal dark:text-cream border border-gold-light/20'
                  }`}
              >
                <div
                  className="w-4 h-4 rounded-full border border-charcoal/20"
                  style={{ backgroundColor: color.hex }}
                />
                {color.name}
              </button>
            ))}
          </div>
        </div>

        {/* 패턴 (신발 제외) */}
        {!isShoes && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-charcoal dark:text-cream mb-3">패턴</h3>
            <div className="flex flex-wrap gap-2">
              {patternOptions.map((pattern) => (
                <button
                  key={pattern.value}
                  onClick={() => togglePattern(pattern.value)}
                  className={`py-2 px-4 rounded-xl font-medium transition-colors ${formData.patterns.includes(pattern.value)
                    ? 'bg-gold text-white'
                    : 'bg-warm-white dark:bg-charcoal text-charcoal dark:text-cream border border-gold-light/20'
                    }`}
                >
                  {pattern.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 디테일 (신발 제외) */}
        {!isShoes && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-charcoal dark:text-cream mb-3">디테일</h3>
            <div className="flex flex-wrap gap-2">
              {detailOptions.map((detail) => (
                <button
                  key={detail.value}
                  onClick={() => toggleDetail(detail.value)}
                  className={`py-2 px-4 rounded-xl font-medium transition-colors ${formData.details.includes(detail.value)
                    ? 'bg-gold text-white'
                    : 'bg-warm-white dark:bg-charcoal text-charcoal dark:text-cream border border-gold-light/20'
                    }`}
                >
                  {detail.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 스타일 */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-charcoal dark:text-cream mb-3">스타일</h3>
          <div className="flex flex-wrap gap-2">
            {styleMoodOptions.map((style) => (
              <button
                key={style.value}
                onClick={() => toggleStyleMood(style.value)}
                className={`py-2 px-4 rounded-xl font-medium transition-colors ${formData.styleMoods.includes(style.value)
                  ? 'bg-gold text-white'
                  : 'bg-warm-white dark:bg-charcoal text-charcoal dark:text-cream border border-gold-light/20'
                  }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="mt-10 mb-6">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-4 bg-gradient-to-r from-gold to-gold-dark text-white rounded-xl font-bold hover:from-gold-dark hover:to-gold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '저장 중...' : '수정 완료'}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ItemEditPage;
