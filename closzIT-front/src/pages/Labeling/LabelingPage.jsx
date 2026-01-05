import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

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

// 패턴 옵션 (CLOTHING_SPEC.md 기준)
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

// 디테일 옵션 (CLOTHING_SPEC.md 기준)
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

// 스타일 무드 옵션 (CLOTHING_SPEC.md 기준)
const styleMoodOptions = [
  { label: '캐주얼', value: 'Casual' },
  { label: '스트릿', value: 'Street' },
  { label: '미니멀', value: 'Minimal' },
  { label: '포멀', value: 'Formal' },
  { label: '스포티', value: 'Sporty' },
  { label: '빈티지', value: 'Vintage' },
  { label: '고프코어', value: 'Gorpcore' },
];

const API_BASE_URL = 'http://localhost:3000';

const LabelingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // RegisterPage에서 전달받은 이미지 정보
  const { imageUrl: initialImageUrl, imageFile: initialImageFile } = location.state || {};

  // 현재 사용 중인 이미지 (새 이미지 등록 가능)
  const [currentImageUrl, setCurrentImageUrl] = useState(initialImageUrl);
  const [currentImageFile, setCurrentImageFile] = useState(initialImageFile);

  // 현재 로그인된 사용자 ID
  const [userId, setUserId] = useState(null);

  // 분석 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  // 각 아이템별 사용 안함 표시 (skip)
  const [skippedItems, setSkippedItems] = useState([]);

  // 저장 중 상태
  const [isSaving, setIsSaving] = useState(false);

  // 이미지 확대 모달 상태
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [zoomedImageSrc, setZoomedImageSrc] = useState(null); // 확대할 이미지 src

  // 옷 펴기 상태
  const [isFlattening, setIsFlattening] = useState(false);
  const [flattenedImages, setFlattenedImages] = useState({}); // { itemIndex: base64Image }
  const [skippedFlattenImages, setSkippedFlattenImages] = useState([]); // 펼쳐진 이미지 제외 목록

  // 각 아이템별 수정된 폼 데이터 저장
  const [itemFormData, setItemFormData] = useState([]);

  // 현재 선택된 아이템의 폼 상태
  const currentFormData = itemFormData[currentItemIndex] || {};

  // 현재 아이템이 신발인지 확인 (패턴/디테일 UI 숨김용)
  // analysisResults[idx].label은 Bedrock 분석 결과 객체 (category, sub_category 등)
  const isCurrentItemShoes =
    analysisResults[currentItemIndex]?.label?.category?.toLowerCase() === 'shoes' ||
    currentFormData.category?.toLowerCase() === 'shoes';

  // 페이지 로드 시 사용자 ID 가져오기
  useEffect(() => {
    const fetchUserId = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.warn('[LabelingPage] No access token found');
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/user/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const userData = await response.json();
          setUserId(userData.id);
          console.log('[LabelingPage] User ID loaded:', userData.id);
        } else {
          console.error('[LabelingPage] Failed to fetch user data');
        }
      } catch (error) {
        console.error('[LabelingPage] Error fetching user:', error);
      }
    };

    fetchUserId();
  }, []);

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

  const togglePattern = (patternValue) => {
    const current = currentFormData.pattern || [];
    const updated = current.includes(patternValue)
      ? current.filter(p => p !== patternValue)
      : [...current, patternValue];
    updateCurrentFormData('pattern', updated);
  };

  const toggleDetail = (detailValue) => {
    const current = currentFormData.detail || [];
    const updated = current.includes(detailValue)
      ? current.filter(d => d !== detailValue)
      : [...current, detailValue];
    updateCurrentFormData('detail', updated);
  };

  const toggleStyleMood = (styleMoodValue) => {
    const current = currentFormData.style_mood || [];
    const updated = current.includes(styleMoodValue)
      ? current.filter(s => s !== styleMoodValue)
      : [...current, styleMoodValue];
    updateCurrentFormData('style_mood', updated);
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

  // 새 이미지 선택 핸들러
  const handleNewImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCurrentImageUrl(url);
      setCurrentImageFile(file);
      // 분석 상태 초기화
      setIsAnalyzed(false);
      setAnalysisResults([]);
      setItemFormData([]);
      setSkippedItems([]);
      setCurrentItemIndex(0);
    }
  };

  // 의상 분석 API 호출
  const handleAnalyze = async () => {
    if (!currentImageFile) {
      alert('이미지를 먼저 선택해주세요.');
      return;
    }

    setIsAnalyzing(true);
    console.log('[DEBUG] Starting analysis...');

    try {
      const formData = new FormData();
      formData.append('file', currentImageFile);
      // userId는 저장 시점에 전송합니다.

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

      // 분석 결과 저장 (DB ID 없음, 임시 ID 부여)
      const results = data.results || [];

      // 탐지된 객체가 없는 경우 알림
      if (results.length === 0) {
        alert('탐지한 의상이 없습니다.\n다른 이미지를 선택해 주세요.');
        setIsAnalyzing(false);
        return;
      }

      setAnalysisResults(results);

      // 각 아이템별 폼 데이터 초기화
      const initialFormData = results.map((item, idx) => {
        const labelData = item.label || {};
        // labelData는 Bedrock 분석 결과 객체 (category, sub_category 등)
        const isShoes = labelData.category?.toLowerCase() === 'shoes';

        return {
          id: idx, // Use index or item.tempId as key
          category: labelData.category || '',
          sub_category: labelData.sub_category || '',
          season: labelData.season || [],
          tpo: labelData.tpo || [],
          colors: labelData.colors || [],
          // 신발인 경우 패턴/디테일은 빈 배열로 처리
          pattern: isShoes ? [] : (labelData.pattern || []),
          detail: isShoes ? [] : (labelData.detail || []),
          style_mood: labelData.style_mood || [],
        };
      });
      setItemFormData(initialFormData);
      setCurrentItemIndex(0);
      setSkippedItems([]);
      setIsAnalyzed(true);
    } catch (error) {
      console.error('[ERROR] Analysis error:', error);
      alert(`의상 분석 중 오류가 발생했습니다.\n${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 옷 펴기 API 호출
  const handleFlattenClothing = async () => {
    if (!analysisResults[currentItemIndex]) return;

    setIsFlattening(true);

    try {
      const currentItem = analysisResults[currentItemIndex];
      const formData = itemFormData[currentItemIndex] || {};

      console.log('[DEBUG] Flattening clothing:', formData.category, formData.sub_category);

      const response = await fetch(`${API_BASE_URL}/analysis/flatten`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: currentItem.image,
          category: formData.category,
          sub_category: formData.sub_category,
          // 추가 라벨링 정보 (프롬프트 품질 향상용)
          colors: formData.colors || [],
          pattern: formData.pattern || [],
          detail: formData.detail || [],
          style_mood: formData.style_mood || [],
        }),
      });

      if (!response.ok) {
        throw new Error(`Flatten request failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('[DEBUG] Flatten result:', result);

      if (result.success && result.flattened_image_base64) {
        setFlattenedImages(prev => ({
          ...prev,
          [currentItemIndex]: result.flattened_image_base64,
        }));
      } else {
        throw new Error('No flattened image received');
      }
    } catch (error) {
      console.error('[ERROR] Flatten error:', error);
      alert(`옷 펴기 중 오류가 발생했습니다.\n${error.message}`);
    } finally {
      setIsFlattening(false);
    }
  };

  // 저장 API 호출 - 모든 비스킵 아이템 일괄 저장
  const handleSave = async () => {
    setIsSaving(true);
    // 저장할 아이템 필터링 (스킵되지 않은 것만)
    const itemsToSave = itemFormData
      .map((formData, index) => {
        const analysisItem = analysisResults[index];
        const isShoes = formData.category?.toLowerCase() === 'shoes' ||
          analysisItem?.label?.category?.toLowerCase() === 'shoes';

        return {
          image_base64: analysisItem.image, // Backend expects image_base64
          // 펼쳐진 이미지: 있고 제외되지 않았으면 전송
          flatten_image_base64: (flattenedImages[index] && !skippedFlattenImages.includes(index))
            ? flattenedImages[index]
            : null,
          embedding: analysisItem.embedding,
          label: {
            category: formData.category,
            sub_category: formData.sub_category,
            colors: formData.colors,
            // 신발인 경우 패턴/디테일은 빈 배열로 처리
            pattern: isShoes ? [] : formData.pattern,
            detail: isShoes ? [] : formData.detail,
            style_mood: formData.style_mood,
            tpo: formData.tpo,
            season: formData.season,
          }
        };
      })
      .filter((_, index) => !skippedItems.includes(index));

    if (itemsToSave.length === 0) {
      alert('저장할 항목이 없습니다.');
      return;
    }

    try {
      console.log('[DEBUG] Saving items:', itemsToSave.length);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        alert('로그인이 필요합니다.');
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/analysis/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items: itemsToSave }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ERROR] Save failed:', errorText);
        throw new Error(`저장 실패: ${response.status}`);
      }

      const result = await response.json();
      alert(`${result.savedCount}개 아이템이 성공적으로 저장되었습니다!`);
      navigate('/main');

    } catch (error) {
      console.error('[ERROR] Save error:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
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
                {currentImageUrl ? (
                  <img src={currentImageUrl} alt="선택된 의상" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-rounded text-6xl text-gray-300">checkroom</span>
                )}
              </div>

              {/* 새 이미지 선택 버튼 */}
              <label className="mt-3 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                다른 이미지 선택
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleNewImageSelect}
                  className="hidden"
                />
              </label>

              {/* 의상 분석 버튼 */}
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !currentImageFile}
                className={`mt-3 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${isAnalyzing || !currentImageFile
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:opacity-90 active:scale-[0.98]'
                  }`}
              >
                {isAnalyzing ? '분석 중...' : '의상 분석'}
              </button>
            </div>
          ) : (
            // 분석 후: 원본(좌) + 분석 이미지(중앙) + 새 이미지 버튼
            <div className="flex items-start justify-center gap-4">
              {/* 원본 이미지 (작게) + 새 이미지 선택 */}
              <div className="flex-shrink-0">
                <p className="text-xs text-gray-500 text-center mb-1">원본</p>
                <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                  {currentImageUrl && (
                    <img
                      src={currentImageUrl}
                      alt="원본"
                      className="w-full h-full object-contain"
                      onClick={() => { setZoomedImageSrc(currentImageUrl); setIsImageZoomed(true); }}
                    />
                  )}
                </div>
                {/* 새 이미지 선택 버튼 */}
                <label className="mt-2 block text-center">
                  <span className="text-xs text-gray-400 hover:text-primary cursor-pointer underline">
                    변경
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleNewImageSelect}
                    className="hidden"
                  />
                </label>
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
                    <img
                      src={currentAnalyzedImage}
                      alt="분석된 의상"
                      className="w-full h-full object-contain cursor-pointer transition-transform hover:scale-105"
                      onClick={() => { setZoomedImageSrc(currentAnalyzedImage); setIsImageZoomed(true); }}
                    />
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

              {/* 옷 펴기 버튼 / 펼쳐진 이미지 (오른쪽) */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <p className="text-xs text-gray-500 text-center mb-1">
                  {flattenedImages[currentItemIndex] ? '펼쳐진 의상' : '복원'}
                </p>

                {flattenedImages[currentItemIndex] ? (
                  // 펼쳐진 이미지 표시 + 제외/복구 토글
                  <div className="relative w-32 h-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                    {/* 우측 상단 토글 버튼 - 클릭 시 제외/복구 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSkippedFlattenImages(prev =>
                          prev.includes(currentItemIndex)
                            ? prev.filter(i => i !== currentItemIndex)
                            : [...prev, currentItemIndex]
                        );
                      }}
                      className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center z-10 transition-all ${skippedFlattenImages.includes(currentItemIndex)
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-200/80 text-gray-600 hover:bg-red-100 hover:text-red-500'
                        }`}
                    >
                      <span className="material-symbols-rounded text-xs">
                        {skippedFlattenImages.includes(currentItemIndex) ? 'undo' : 'close'}
                      </span>
                    </button>

                    {/* 제외된 이미지 오버레이 */}
                    {skippedFlattenImages.includes(currentItemIndex) && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-5">
                        <p className="text-white font-bold text-sm">제외됨</p>
                      </div>
                    )}

                    <img
                      src={`data:image/png;base64,${flattenedImages[currentItemIndex]}`}
                      alt="펼쳐진 의상"
                      className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => {
                        setZoomedImageSrc(`data:image/png;base64,${flattenedImages[currentItemIndex]}`);
                        setIsImageZoomed(true);
                      }}
                    />
                  </div>
                ) : (
                  // 옷 펴기 버튼
                  <button
                    onClick={handleFlattenClothing}
                    disabled={isFlattening}
                    className={`w-20 h-20 rounded-lg shadow-lg flex flex-col items-center justify-center transition-all ${isFlattening
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 hover:scale-105 active:scale-95'
                      }`}
                  >
                    {isFlattening ? (
                      <>
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-white font-medium mt-1">생성 중...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-rounded text-2xl text-white">dry_cleaning</span>
                        <span className="text-xs text-white font-medium mt-1">옷 펴기</span>
                      </>
                    )}
                  </button>
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

            {/* 패턴 (다중 선택) - 신발이 아닌 경우에만 표시 */}
            {!isCurrentItemShoes && (
              <div className="py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-900 dark:text-white font-medium">패턴</span>
                  <span className="text-primary text-sm font-medium">
                    {(currentFormData.pattern || []).map(p => patternOptions.find(o => o.value === p)?.label || p).join(', ') || '선택해주세요'}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {patternOptions.map((pattern) => (
                    <button
                      key={pattern.value}
                      onClick={() => togglePattern(pattern.value)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${(currentFormData.pattern || []).includes(pattern.value)
                        ? 'bg-primary text-white'
                        : 'border border-gray-300 dark:border-gray-600 text-gray-500'
                        }`}
                    >
                      {pattern.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 디테일 - 신발이 아닌 경우에만 표시 */}
            {!isCurrentItemShoes && (
              <div className="py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-900 dark:text-white font-medium">디테일</span>
                  <span className="text-primary text-sm font-medium">
                    {(currentFormData.detail || []).map(d => detailOptions.find(o => o.value === d)?.label || d).join(', ') || '선택해주세요'}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {detailOptions.map((detail) => (
                    <button
                      key={detail.value}
                      onClick={() => toggleDetail(detail.value)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${(currentFormData.detail || []).includes(detail.value)
                        ? 'bg-primary text-white'
                        : 'border border-gray-300 dark:border-gray-600 text-gray-500'
                        }`}
                    >
                      {detail.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 스타일 무드 */}
            <div className="py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-900 dark:text-white font-medium">스타일</span>
                <span className="text-primary text-sm font-medium">
                  {(currentFormData.style_mood || []).map(s => styleMoodOptions.find(o => o.value === s)?.label || s).join(', ') || '선택해주세요'}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {styleMoodOptions.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => toggleStyleMood(style.value)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${(currentFormData.style_mood || []).includes(style.value)
                      ? 'bg-primary text-white'
                      : 'border border-gray-300 dark:border-gray-600 text-gray-500'
                      }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 저장 버튼 */}
            <div className="pt-6 pb-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`w-full py-4 rounded-2xl font-bold text-base shadow-lg transition-all ${isSaving
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-primary text-white hover:opacity-90 active:scale-[0.98]'
                  }`}
              >
                {isSaving
                  ? '저장 중...'
                  : `모든 의상 저장 (${analysisResults.length - skippedItems.length}개)`
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

      {/* 이미지 확대 모달 */}
      {isImageZoomed && zoomedImageSrc && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center animate-fadeIn"
          onClick={() => setIsImageZoomed(false)}
        >
          {/* 어두운 배경 오버레이 */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* 확대된 이미지 */}
          <div
            className="relative z-10 animate-scaleIn flex flex-col items-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 닫기 버튼 (이미지 외부 상단) */}
            <button
              onClick={() => setIsImageZoomed(false)}
              className="absolute -top-2 -right-2 w-10 h-10 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center shadow-lg transition-colors z-20"
            >
              <span className="material-symbols-rounded text-gray-700 text-2xl">close</span>
            </button>

            {/* 이미지 박스 (흰색 배경) */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden p-2">
              <img
                src={zoomedImageSrc}
                alt="확대된 의상"
                className="max-w-[80vw] max-h-[60vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* 확대 모달 애니메이션 스타일 */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.8);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default LabelingPage;
