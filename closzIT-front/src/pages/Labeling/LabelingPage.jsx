import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// 카테고리 옵션 (한글 매핑)
const categoryLabels = {
  'Outer': '아우터',
  'Top': '상의',
  'Bottom': '하의',
  'Shoes': '신발',
  'Other': '기타'
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
  { label: '파티', value: 'Party' },
  { label: '학교', value: 'School' },
  { label: '집', value: 'Home' }
];

// 카테고리 옵션
const categoryOptions = {
  'Outer': ['Cardigan', 'Jacket', 'Blazer', 'Jumper', 'Padding', 'Coat', 'Vest', 'Hoodie-zipup', 'Windbreaker', 'Other'],
  'Top': ['Short-sleeve-T', 'Long-sleeve-T', 'Hoodie', 'Sweatshirt', 'Knit', 'Shirt', 'Sleeveless', 'Polo-shirt', 'Other'],
  'Bottom': ['Denim', 'Slacks', 'Cotton-pants', 'Sweatpants', 'Shorts', 'Skirt', 'Leggings', 'Other'],
  'Shoes': ['Sneakers', 'Loafers', 'Dress-shoes', 'Boots', 'Sandals', 'Slippers', 'Other'],
  'Other': ['Other']
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
  { label: '그래픽', value: 'Graphic' }
];

const API_BASE_URL = 'http://localhost:3000';

const LabelingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // RegisterPage에서 전달받은 이미지 정보
  const { imageUrl, imageFile } = location.state || {};

  // 분석 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  // 각 아이템별 사용 안함 표시 (skip)
  const [skippedItems, setSkippedItems] = useState([]);

  // 각 아이템별 수정된 폼 데이터 저장
  const [itemFormData, setItemFormData] = useState([]);

  // 현재 선택된 아이템의 폼 상태
  const currentFormData = itemFormData[currentItemIndex] || {};

  // 아이템 변경 시 폼 데이터 로드
  useEffect(() => {
    if (analysisResults.length > 0 && itemFormData.length > 0) {
      // 현재 아이템의 저장된 폼 데이터가 있으면 그대로 사용
    }
  }, [currentItemIndex, analysisResults, itemFormData]);

  // 폼 데이터 업데이트 함수
  const updateCurrentFormData = (field, value) => {
    setItemFormData(prev => {
      const newData = [...prev];
      newData[currentItemIndex] = {
        ...newData[currentItemIndex],
        [field]: value
      };
      return newData;
    });
  };

  const toggleSeason = (seasonValue) => {
    const current = currentFormData.season || [];
    const updated = current.includes(seasonValue)
      ? current.filter(s => s !== seasonValue)
      : [...current, seasonValue];
    updateCurrentFormData('season', updated);
  };

  const toggleTpo = (tpoValue) => {
    const current = currentFormData.tpo || [];
    const updated = current.includes(tpoValue)
      ? current.filter(t => t !== tpoValue)
      : [...current, tpoValue];
    updateCurrentFormData('tpo', updated);
  };

  const toggleColor = (colorValue) => {
    const current = currentFormData.colors || [];
    const updated = current.includes(colorValue)
      ? current.filter(c => c !== colorValue)
      : [...current, colorValue];
    updateCurrentFormData('colors', updated);
  };

  // 다음 스킵되지 않은 아이템 인덱스 찾기
  const findNextNonSkippedIndex = (currentIdx) => {
    for (let i = currentIdx + 1; i < analysisResults.length; i++) {
      if (!skippedItems.includes(i)) {
        return i;
      }
    }
    return -1; // 더 이상 스킵되지 않은 아이템 없음
  };

  // 의상 분석 API 호출
  const handleAnalyze = async () => {
    if (!imageFile) {
      alert('이미지를 먼저 선택해주세요.');
      return;
    }

    setIsAnalyzing(true);
    console.log('[DEBUG] Starting analysis...');

    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      const response = await fetch(`${API_BASE_URL}/analysis`, {
        method: 'POST',
        body: formData,
      });

      console.log('[DEBUG] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ERROR] Response error:', errorText);
        throw new Error(`분석 요청 실패: ${response.status}`);
      }

      const data = await response.json();
      console.log('[DEBUG] Response data:', data);

      // 분석 결과 저장
      const results = data.results || [];
      setAnalysisResults(results);

      // 각 아이템별 폼 데이터 초기화
      const initialFormData = results.map(item => {
        const label = item.label || {};
        return {
          id: item.id,
          category: label.category || '',
          sub_category: label.sub_category || '',
          season: label.season || [],
          tpo: label.tpo || [],
          colors: label.colors || [],
          pattern: label.pattern?.[0] || ''
        };
      });
      setItemFormData(initialFormData);
      setCurrentItemIndex(0);
      setIsAnalyzed(true);
    } catch (error) {
      console.error('[ERROR] Analysis error:', error);
      alert(`의상 분석 중 오류가 발생했습니다.\n${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 저장 API 호출 - 모든 비스킵 아이템 일괄 저장
  const handleSave = async () => {
    // 저장할 아이템 필터링 (스킵되지 않은 것만)
    const itemsToSave = analysisResults
      .map((item, index) => ({ item, index }))
      .filter(({ index }) => !skippedItems.includes(index));

    if (itemsToSave.length === 0) {
      alert('저장할 항목이 없습니다.');
      return;
    }

    try {
      // 모든 아이템 병렬 저장
      const savePromises = itemsToSave.map(async ({ item, index }) => {
        const formData = itemFormData[index];

        if (!formData) {
          console.warn(`[WARN] No form data for item ${index}`);
          return { success: false, index };
        }

        const response = await fetch(`${API_BASE_URL}/analysis/${item.id}/confirm`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: formData.category,
            sub_category: formData.sub_category,
            tpo: formData.tpo,
            season: formData.season,
            colors: formData.colors,
            pattern: [formData.pattern],
          }),
        });

        if (!response.ok) {
          console.error(`[ERROR] Failed to save item ${index}`);
          return { success: false, index };
        }

        return { success: true, index };
      });

      const results = await Promise.all(savePromises);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (failCount > 0) {
        alert(`${successCount}개 저장 완료, ${failCount}개 저장 실패`);
      } else {
        alert(`${successCount}개 아이템이 저장되었습니다! (${skippedItems.length}개 제외)`);
      }

      navigate('/main');
    } catch (error) {
      console.error('[ERROR] Save error:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  // 현재 표시할 분석 이미지
  const currentAnalyzedImage = isAnalyzed && analysisResults[currentItemIndex]?.image
    ? `data:image/png;base64,${analysisResults[currentItemIndex].image}`
    : null;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans flex flex-col">

      {/* Header */}
      <header className="flex items-center px-4 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-40">
        <button
          onClick={() => navigate('/register')}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="material-symbols-rounded text-2xl text-gray-600 dark:text-gray-300">arrow_back</span>
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-gray-900 dark:text-white pr-10">옷 정보 입력</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 pb-28">

        {/* Image Section - 분석 전후 다른 레이아웃 */}
        <div className="py-6">
          {!isAnalyzed ? (
            // 분석 전: 원본 이미지만 표시
            <div className="flex flex-col items-center">
              <div className="relative w-48 h-48 bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden flex items-center justify-center">
                {imageUrl ? (
                  <img src={imageUrl} alt="선택된 의상" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-rounded text-6xl text-gray-300">checkroom</span>
                )}
              </div>

              {/* 의상 분석 버튼 */}
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !imageFile}
                className={`mt-4 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${isAnalyzing || !imageFile
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:opacity-90 active:scale-[0.98]'
                  }`}
              >
                {isAnalyzing ? '분석 중...' : '의상 분석'}
              </button>
            </div>
          ) : (
            // 분석 후: 원본(좌) + 분석 이미지(중앙)
            <div className="flex items-start justify-center gap-4">
              {/* 원본 이미지 (작게) */}
              <div className="flex-shrink-0">
                <p className="text-xs text-gray-500 text-center mb-1">원본</p>
                <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                  {imageUrl && <img src={imageUrl} alt="원본" className="w-full h-full object-cover" />}
                </div>
              </div>

              {/* 분석된 이미지 (크게) */}
              <div className="flex flex-col items-center">
                <p className="text-xs text-gray-500 text-center mb-1">
                  분석 결과 ({currentItemIndex + 1}/{analysisResults.length})
                  {skippedItems.includes(currentItemIndex) && <span className="text-red-500 ml-1">(제외됨)</span>}
                </p>
                <div className="relative w-48 h-48 bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                  {/* X 버튼 - 제외/포함 토글 */}
                  <button
                    onClick={() => {
                      setSkippedItems(prev =>
                        prev.includes(currentItemIndex)
                          ? prev.filter(i => i !== currentItemIndex)
                          : [...prev, currentItemIndex]
                      );
                    }}
                    className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center z-10 transition-all ${skippedItems.includes(currentItemIndex)
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200/80 text-gray-600 hover:bg-red-100 hover:text-red-500'
                      }`}
                  >
                    <span className="material-symbols-rounded text-sm">
                      {skippedItems.includes(currentItemIndex) ? 'undo' : 'close'}
                    </span>
                  </button>

                  {/* 제외된 아이템 오버레이 */}
                  {skippedItems.includes(currentItemIndex) && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-5">
                      <p className="text-white font-bold">제외됨</p>
                    </div>
                  )}

                  {currentAnalyzedImage ? (
                    <img src={currentAnalyzedImage} alt="분석된 의상" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-rounded text-6xl text-gray-300">checkroom</span>
                  )}
                </div>

                {/* 아이템 네비게이션 */}
                {analysisResults.length > 1 && (
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => setCurrentItemIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentItemIndex === 0}
                      className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 disabled:opacity-30"
                    >
                      <span className="material-symbols-rounded text-sm">chevron_left</span>
                    </button>
                    <div className="flex gap-1">
                      {analysisResults.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentItemIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-colors ${idx === currentItemIndex ? 'bg-primary' : 'bg-gray-300'
                            }`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentItemIndex(prev => Math.min(analysisResults.length - 1, prev + 1))}
                      disabled={currentItemIndex === analysisResults.length - 1}
                      className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 disabled:opacity-30"
                    >
                      <span className="material-symbols-rounded text-sm">chevron_right</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Form Fields - 분석 완료 후에만 표시 */}
        {isAnalyzed && (
          <div className="space-y-1">

            {/* 카테고리 */}
            <div className="py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-900 dark:text-white font-medium">카테고리</span>
                <span className="text-primary text-sm font-medium">
                  {categoryLabels[currentFormData.category] || currentFormData.category} &gt; {subCategoryLabels[currentFormData.sub_category] || currentFormData.sub_category}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {Object.keys(categoryOptions).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      updateCurrentFormData('category', cat);
                      updateCurrentFormData('sub_category', categoryOptions[cat][0]);
                    }}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${currentFormData.category === cat
                      ? 'bg-primary text-white'
                      : 'border border-gray-300 dark:border-gray-600 text-gray-500'
                      }`}
                  >
                    {categoryLabels[cat]}
                  </button>
                ))}
              </div>
              {currentFormData.category && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {categoryOptions[currentFormData.category]?.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => updateCurrentFormData('sub_category', sub)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${currentFormData.sub_category === sub
                        ? 'bg-primary/80 text-white'
                        : 'border border-gray-200 dark:border-gray-700 text-gray-400'
                        }`}
                    >
                      {subCategoryLabels[sub] || sub}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 계절 */}
            <div className="py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-900 dark:text-white font-medium">계절</span>
                <span className="text-primary text-sm font-medium">
                  {(currentFormData.season || []).map(s => seasonOptions.find(o => o.value === s)?.label || s).join(', ') || '선택해주세요'}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {seasonOptions.map((season) => (
                  <button
                    key={season.value}
                    onClick={() => toggleSeason(season.value)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${(currentFormData.season || []).includes(season.value)
                      ? 'bg-primary text-white'
                      : 'border border-gray-300 dark:border-gray-600 text-gray-500'
                      }`}
                  >
                    {season.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TPO */}
            <div className="py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-900 dark:text-white font-medium">TPO</span>
                <span className="text-primary text-sm font-medium">
                  {(currentFormData.tpo || []).map(t => tpoOptions.find(o => o.value === t)?.label || t).join(', ') || '선택해주세요'}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {tpoOptions.map((tpo) => (
                  <button
                    key={tpo.value}
                    onClick={() => toggleTpo(tpo.value)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${(currentFormData.tpo || []).includes(tpo.value)
                      ? 'bg-primary text-white'
                      : 'border border-gray-300 dark:border-gray-600 text-gray-500'
                      }`}
                  >
                    {tpo.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 색상 */}
            <div className="py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-900 dark:text-white font-medium">색상</span>
                <span className="text-primary text-sm font-medium">
                  {(currentFormData.colors || []).map(c => colorOptions.find(o => o.value === c)?.name || c).join(', ') || '선택해주세요'}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => toggleColor(color.value)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${(currentFormData.colors || []).includes(color.value)
                      ? 'bg-primary text-white'
                      : 'border border-gray-300 dark:border-gray-600 text-gray-500'
                      }`}
                  >
                    <span className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: color.hex }} />
                    {color.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 패턴 */}
            <div className="py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-900 dark:text-white font-medium">패턴</span>
                <span className="text-primary text-sm font-medium">
                  {patternOptions.find(p => p.value === currentFormData.pattern)?.label || currentFormData.pattern || '선택해주세요'}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {patternOptions.map((pattern) => (
                  <button
                    key={pattern.value}
                    onClick={() => updateCurrentFormData('pattern', pattern.value)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${currentFormData.pattern === pattern.value
                      ? 'bg-primary text-white'
                      : 'border border-gray-300 dark:border-gray-600 text-gray-500'
                      }`}
                  >
                    {pattern.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 저장 버튼 */}
            <div className="pt-6 pb-4">
              <button
                onClick={handleSave}
                className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
              >
                {currentItemIndex < analysisResults.length - 1
                  ? `저장 후 다음 (${currentItemIndex + 1}/${analysisResults.length})`
                  : '저장 완료'
                }
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 flex items-center justify-around pb-2 z-50">
        <button
          onClick={() => navigate('/main')}
          className="flex flex-col items-center justify-center w-16 h-full text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors gap-1"
        >
          <span className="material-symbols-rounded text-2xl">home</span>
          <span className="text-[10px] font-medium">홈</span>
        </button>

        <div className="relative -top-5">
          <button
            onClick={() => navigate('/register')}
            className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-gray-900"
          >
            <span className="material-symbols-rounded text-4xl">add</span>
          </button>
        </div>

        <button className="flex flex-col items-center justify-center w-16 h-full text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors gap-1">
          <span className="material-symbols-rounded text-2xl">grid_view</span>
          <span className="text-[10px] font-medium">SNS</span>
        </button>
      </div>
    </div>
  );
};

export default LabelingPage;
