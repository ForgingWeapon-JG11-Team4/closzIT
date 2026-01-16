import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SharedHeader from '../../components/SharedHeader';
import BottomNav from '../../components/BottomNav';
import { useUserStore } from '../../stores/userStore';

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

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

// 이미지 회전 유틸리티 (Canvas 사용)
const rotateImageBase64 = (base64Data, degrees) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // 90도, 270도 회전 시 width/height 교체
      if (degrees === 90 || degrees === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      // 중앙 기준 회전
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      // Data URL에서 Base64 부분만 추출
      resolve(canvas.toDataURL('image/png').split(',')[1]);
    };
    img.onerror = reject;
    img.src = `data:image/png;base64,${base64Data}`;
  });
};

const LabelingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, userCredit, fetchUser } = useUserStore();

  // RegisterPage에서 전달받은 이미지 정보
  const { imageUrl: initialImageUrl, imageFile: initialImageFile, images: batchImages } = location.state || {};

  // 배치 이미지 처리 상태
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [totalBatchImages] = useState(batchImages?.length || 0);
  const isBatchMode = totalBatchImages > 0;

  // 현재 처리 중인 이미지 (배치 모드일 경우 배치에서 가져오기)
  const currentBatchImage = isBatchMode ? batchImages[currentBatchIndex] : null;
  const [currentImageUrl, setCurrentImageUrl] = useState(currentBatchImage?.imageUrl || initialImageUrl);
  const [currentImageFile, setCurrentImageFile] = useState(currentBatchImage?.imageFile || initialImageFile);

  // 분석 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  // 각 아이템별 사용 안함 표시 (skip)
  const [skippedItems, setSkippedItems] = useState([]);

  // 저장 중 상태
  const [isSaving, setIsSaving] = useState(false);

  // 등록 완료 팝업 상태
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [savedItemImages, setSavedItemImages] = useState([]); // 저장된 아이템 이미지들

  // 이미지 확대 모달 상태
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [zoomedImageSrc, setZoomedImageSrc] = useState(null); // 확대할 이미지 src

  // 옷 펴기 상태
  const [flatteningItems, setFlatteningItems] = useState(new Set()); // 옷 펴기 진행 중인 아이템 인덱스 Set
  const [flattenedImages, setFlattenedImages] = useState({}); // { itemIndex: base64Image }
  const [skippedFlattenImages, setSkippedFlattenImages] = useState([]); // 펼쳐진 이미지 제외 목록
  const [showFlattenConfirm, setShowFlattenConfirm] = useState(false); // 옷 펴기 확인 팝업

  // 각 아이템별 수정된 폼 데이터 저장
  const [itemFormData, setItemFormData] = useState([]);

  // 각 아이템별 SAM2 이미지 사용 여부 (체크박스 상태)
  // true: SAM2 배경 제거 이미지 사용, false: YOLO 크롭 이미지 사용
  const [useSam2Images, setUseSam2Images] = useState({});  // 현재 선택된 아이템의 폼 상태
  const currentFormData = itemFormData[currentItemIndex] || {};

  // 현재 아이템이 신발인지 확인 (패턴/디테일 UI 숨김용)
  // analysisResults[idx].label은 Bedrock 분석 결과 객체 (category, sub_category 등)
  const isCurrentItemShoes =
    analysisResults[currentItemIndex]?.label?.category?.toLowerCase() === 'shoes' ||
    currentFormData.category?.toLowerCase() === 'shoes';

  // 페이지 로드 시 사용자 ID 가져오기
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.warn('[LabelingPage] No access token found');
      return;
    }
    fetchUser();
  }, [fetchUser]);

  // 배치 인덱스 변경 시 이미지 업데이트
  useEffect(() => {
    if (isBatchMode && batchImages && batchImages[currentBatchIndex]) {
      const image = batchImages[currentBatchIndex];
      setCurrentImageUrl(image.imageUrl);
      setCurrentImageFile(image.imageFile);
    }
  }, [currentBatchIndex, isBatchMode, batchImages]);

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

      // 디버그: yoloImage, sam2Image 필드 확인
      console.log('[DEBUG] Analysis results with image fields:', results.map((item, idx) => ({
        idx,
        hasYoloImage: !!item.yoloImage,
        hasSam2Image: !!item.sam2Image,
        hasImage: !!item.image,
      })));
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

      // SAM2 이미지 사용 여부 초기화 (기본값: true - SAM2 배경 제거 이미지 사용)
      const initialUseSam2 = {};
      results.forEach((_, idx) => { initialUseSam2[idx] = true; });
      setUseSam2Images(initialUseSam2);

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

  // 옷 펴기 실행 함수 (개별 및 일괄 처리용)
  const executeFlattenClothing = async (targetIndex) => {
    if (!analysisResults[targetIndex]) return;

    setFlatteningItems(prev => new Set(prev).add(targetIndex));

    try {
      const currentItem = analysisResults[targetIndex];
      const formData = itemFormData[targetIndex] || {};

      console.log(`[DEBUG] Flattening clothing (index: ${targetIndex}):`, formData.category, formData.sub_category);

      const token = localStorage.getItem('accessToken');

      // 체크박스 상태에 따라 이미지 선택: 체크됨=SAM2, 미체크=YOLO
      const selectedImage = useSam2Images[targetIndex]
        ? (currentItem.sam2Image || currentItem.image)
        : (currentItem.yoloImage || currentItem.image);

      // Step 1: 작업 요청 → jobId 받기
      const response = await fetch(`${API_BASE_URL}/analysis/flatten`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          image_base64: selectedImage,
          category: formData.category,
          sub_category: formData.sub_category,
          colors: formData.colors || [],
          pattern: formData.pattern || [],
          detail: formData.detail || [],
          style_mood: formData.style_mood || [],
        }),
      });

      if (!response.ok) {
        throw new Error(`Flatten request failed: ${response.status}`);
      }

      const queueResult = await response.json();
      console.log(`[DEBUG] Queue result (index: ${targetIndex}):`, queueResult);

      // 큐 방식인 경우 polling
      if (queueResult.jobId && queueResult.status === 'queued') {
        const jobId = queueResult.jobId;
        console.log(`[DEBUG] Job queued, polling for result (index: ${targetIndex}):`, jobId);

        // Step 2: Polling으로 결과 대기
        const pollInterval = 1000; // 1초
        const maxPolls = 300; // 최대 5분 대기
        let pollCount = 0;

        const pollForResult = async () => {
          while (pollCount < maxPolls) {
            pollCount++;
            await new Promise(resolve => setTimeout(resolve, pollInterval));

            try {
              const statusResponse = await fetch(`${API_BASE_URL}/queue/job/flatten/${jobId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });

              if (!statusResponse.ok) {
                console.warn('[DEBUG] Status check failed:', statusResponse.status);
                continue;
              }

              const statusResult = await statusResponse.json();

              if (statusResult.status === 'completed') {
                // 완료! 결과 처리
                if (statusResult.result?.success && statusResult.result?.flattened_image_base64) {
                  setFlattenedImages(prev => ({
                    ...prev,
                    [targetIndex]: statusResult.result.flattened_image_base64,
                  }));
                  // 크레딧 업데이트
                  if (statusResult.result.remainingCredit !== undefined) {
                    // userStore의 refreshCredit 호출
                    fetchUser(true);
                  }
                  return; // 성공적으로 완료
                } else if (!statusResult.result) {
                  // result가 아직 Redis에서 로드되지 않은 경우 → 다음 poll 대기
                  console.log('[DEBUG] Job completed but result not yet available, continuing poll...');
                  continue;
                } else {
                  throw new Error('No flattened image in result');
                }
              } else if (statusResult.status === 'failed') {
                throw new Error(statusResult.error || '옷 펴기 작업이 실패했습니다.');
              }
              // 'waiting', 'active' 상태면 계속 polling
            } catch (pollError) {
              console.error('[DEBUG] Poll error:', pollError);
              // 일시적 오류면 계속 polling
            }
          }
          throw new Error('옷 펴기 작업 시간이 초과되었습니다.');
        };

        await pollForResult();
      } else if (queueResult.success && queueResult.flattened_image_base64) {
        // 기존 동기 방식 응답 (fallback)
        setFlattenedImages(prev => ({
          ...prev,
          [targetIndex]: queueResult.flattened_image_base64,
        }));
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error(`[ERROR] Flatten error (index: ${targetIndex}):`, error);
      // 개별 에러는 alert를 띄우지 않고 콘솔에만 기록하거나, 필요시 토스트 메시지 등으로 처리
      // 단, 단일 실행일 때는 alert가 필요할 수 있음
      if (flatteningItems.size === 1) { // 대략적인 체크 (정확하진 않음)
        alert(`옷 펴기 중 오류가 발생했습니다.\n${error.message}`);
      }
    } finally {
      setFlatteningItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetIndex);
        return newSet;
      });
    }
  };

  // 기존 단일 옷 펴기 핸들러 (현재 인덱스 사용)
  const handleFlattenClothing = () => {
    executeFlattenClothing(currentItemIndex);
  };

  // 전체 옷 펴기 상태
  const [showFlattenAllConfirm, setShowFlattenAllConfirm] = useState(false);
  const [flattenAllCost, setFlattenAllCost] = useState(0);
  const [flattenAllTargets, setFlattenAllTargets] = useState([]);

  // 전체 옷 펴기 버튼 핸들러
  const handleFlattenAll = () => {
    // 대상: 스킵되지 않음 AND 아직 펴지지 않음 AND 현재 작업중이 아님
    const targets = analysisResults.map((_, idx) => idx).filter(idx =>
      !skippedItems.includes(idx) &&
      !flattenedImages[idx] &&
      !flatteningItems.has(idx)
    );

    if (targets.length === 0) {
      alert('옷 펴기를 진행할 의상이 없습니다.');
      return;
    }

    setFlattenAllTargets(targets);
    setFlattenAllCost(targets.length);
    setShowFlattenAllConfirm(true);
  };

  // 전체 옷 펴기 확인 핸들러
  const handleConfirmFlattenAll = () => {
    setShowFlattenAllConfirm(false);

    // 일괄 실행
    flattenAllTargets.forEach(idx => {
      executeFlattenClothing(idx);
    });
  };

  // 분석된 의상 이미지 회전 (90도)
  const handleRotateAnalyzedImage = async () => {
    if (!analysisResults[currentItemIndex] || !analysisResults[currentItemIndex].image) return;

    try {
      const currentImage = analysisResults[currentItemIndex].image;
      const rotatedImage = await rotateImageBase64(currentImage, 90);

      setAnalysisResults(prev => {
        const newData = [...prev];
        newData[currentItemIndex] = {
          ...newData[currentItemIndex],
          image: rotatedImage
        };
        return newData;
      });
    } catch (e) {
      console.error('Image rotation failed:', e);
    }
  };

  // 펼쳐진 의상 이미지 회전 (90도)
  const handleRotateFlattenedImage = async () => {
    if (!flattenedImages[currentItemIndex]) return;

    try {
      const currentImage = flattenedImages[currentItemIndex];
      const rotatedImage = await rotateImageBase64(currentImage, 90);

      setFlattenedImages(prev => ({
        ...prev,
        [currentItemIndex]: rotatedImage
      }));
    } catch (e) {
      console.error('Flattened image rotation failed:', e);
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
          // 체크박스 상태에 따라 이미지 선택: 체크됨=SAM2, 미체크=YOLO
          image_base64: useSam2Images[index]
            ? (analysisItem.sam2Image || analysisItem.image)
            : (analysisItem.yoloImage || analysisItem.image),
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

      // 저장된 아이템 이미지들 수집
      const savedImages = itemsToSave.map((item, idx) => {
        // 펼쳐진 이미지가 있으면 우선 사용
        const flattenImg = item.flatten_image_base64;
        const originalImg = item.image_base64;
        return flattenImg
          ? `data:image/png;base64,${flattenImg}`
          : `data:image/png;base64,${originalImg}`;
      });
      setSavedItemImages(savedImages);

      // 저장 후 사용자 정보(크레딧) 갱신
      await fetchUser(true);

      // 배치 모드: 다음 이미지로 자동 전환 또는 완료
      if (isBatchMode && currentBatchIndex < totalBatchImages - 1) {
        // 다음 이미지로 이동
        const nextIndex = currentBatchIndex + 1;
        setCurrentBatchIndex(nextIndex);
        const nextImage = batchImages[nextIndex];
        setCurrentImageUrl(nextImage.imageUrl);
        setCurrentImageFile(nextImage.imageFile);

        // 분석 상태 초기화
        setIsAnalyzed(false);
        setAnalysisResults([]);
        setItemFormData([]);
        setSkippedItems([]);
        setCurrentItemIndex(0);
        setFlattenedImages({});
        setSkippedFlattenImages([]);
      } else {
        // 배치 모드가 아니거나 마지막 이미지인 경우 성공 팝업 표시
        setShowSuccessPopup(true);
      }

    } catch (error) {
      console.error('[ERROR] Save error:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 현재 표시할 분석 이미지 (체크박스 상태에 따라 SAM2/YOLO 선택)
  const currentAnalyzedImage = isAnalyzed && analysisResults[currentItemIndex]
    ? `data:image/png;base64,${useSam2Images[currentItemIndex]
      ? (analysisResults[currentItemIndex].sam2Image || analysisResults[currentItemIndex].image)
      : (analysisResults[currentItemIndex].yoloImage || analysisResults[currentItemIndex].image)
    }`
    : null;

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ backgroundColor: '#FAF8F5' }}>

      {/* ========== 분석 중 팝업 ========== */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div
            className="bg-white rounded-3xl shadow-2xl p-8 mx-6 max-w-sm w-full text-center"
            style={{ border: '1px solid rgba(212, 175, 55, 0.2)' }}
          >
            {/* 요정 이미지 - 좌우 흔들림 애니메이션 */}
            <div className="animate-wiggle mb-4">
              <img
                src="/assets/fairy-analyzing.png"
                alt="분석 중인 요정"
                className="w-40 h-40 mx-auto object-contain"
              />
            </div>

            {/* 메시지 */}
            <h3 className="text-lg font-bold mb-2" style={{ color: '#2C2C2C' }}>
              요정이 옷을 분석하고 있어요
            </h3>
            <p className="text-sm" style={{ color: '#6B6B6B' }}>
              잠시만 기다려 주세요...
            </p>

            {/* 로딩 인디케이터 */}
            <div className="mt-4 flex justify-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      {/* ========== 등록 완료 팝업 ========== */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div
            className="bg-white rounded-3xl shadow-2xl p-6 mx-6 max-w-sm w-full text-center"
            style={{ border: '1px solid rgba(212, 175, 55, 0.2)' }}
          >
            {/* 성공 아이콘 */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center animate-bounce-slow"
              style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)', boxShadow: '0 4px 15px rgba(212, 175, 55, 0.4)' }}>
              <span className="material-symbols-rounded text-3xl text-white">check</span>
            </div>

            <h3 className="text-xl font-bold mb-2" style={{ color: '#2C2C2C' }}>
              옷이 등록되었어요!
            </h3>

            <div className="flex flex-col items-center gap-1 mb-6">
              <p className="text-sm text-gray-400">
                {savedItemImages.length}벌의 옷이 옷장에 추가되었습니다
              </p>
              <span className="text-gold font-bold text-sm bg-gold/10 px-3 py-1 rounded-full border border-gold/20">
                + {savedItemImages.length} 크레딧 적립
              </span>
            </div>

            {/* 등록된 옷 이미지들 */}
            <div className="flex justify-center gap-2 mb-6 flex-wrap">
              {savedItemImages.map((img, idx) => (
                <div
                  key={idx}
                  className="w-16 h-16 rounded-xl overflow-hidden shadow-md bg-white"
                  style={{ border: '1px solid rgba(212, 175, 55, 0.2)' }}
                >
                  <img
                    src={img}
                    alt={`등록된 옷 ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>

            {/* 보유 크레딧 표시 */}
            <div className="flex items-center justify-center gap-2 mb-6 py-3 px-4 bg-[#FDFBF7] rounded-xl border border-gold/10">
              <span className="text-sm text-gray-600 font-medium">보유 크레딧:</span>
              <span className="material-symbols-rounded text-gold text-lg">monetization_on</span>
              <span className="font-bold text-gold text-lg">{userCredit}</span>
            </div>

            {/* 확인 버튼 */}
            <button
              onClick={() => {
                setShowSuccessPopup(false);
                // 전체 페이지 새로고침으로 메인 데이터 갱신
                window.location.href = '/main';
              }}
              className="w-full py-3.5 rounded-xl font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
                boxShadow: '0 4px 14px rgba(184, 134, 11, 0.35)'
              }}
            >
              내 옷장으로 가기
            </button>
          </div>
        </div>
      )}

      {/* ========== 전체 옷 펴기 확인 팝업 ========== */}
      {showFlattenAllConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div
            className="bg-white rounded-3xl shadow-2xl p-6 mx-6 max-w-sm w-full text-center"
            style={{ border: '1px solid rgba(212, 175, 55, 0.2)' }}
          >
            {/* 동전 아이콘 */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-gradient-to-br from-gold/20 to-gold-light/20"
              style={{ border: '2px solid rgba(212, 175, 55, 0.3)' }}>
              <span className="material-symbols-rounded text-3xl text-gold">monetization_on</span>
            </div>

            <h3 className="text-lg font-bold mb-2" style={{ color: '#2C2C2C' }}>
              {flattenAllCost} 크레딧을 사용하시겠어요?
            </h3>
            <p className="text-sm mb-4" style={{ color: '#6B6B6B' }}>
              전체 {flattenAllCost}벌의 옷을 한 번에 폅니다
            </p>

            {/* 크레딧 잔액 표시 */}
            <div className="flex items-center justify-center gap-2 mb-6 py-2 px-4 rounded-xl bg-cream-dark/50">
              <span className="material-symbols-rounded text-gold">account_balance_wallet</span>
              <span className="text-sm" style={{ color: '#6B6B6B' }}>보유 크레딧: </span>
              <span className="text-lg font-bold text-gold">{userCredit}</span>
            </div>

            {/* 버튼들 */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowFlattenAllConfirm(false)}
                className="flex-1 py-3 rounded-xl font-medium transition-all"
                style={{
                  background: '#F5F0E8',
                  color: '#6B6B6B',
                  border: '1px solid rgba(212, 175, 55, 0.2)'
                }}
              >
                취소
              </button>
              <button
                onClick={handleConfirmFlattenAll}
                disabled={userCredit < flattenAllCost}
                className="flex-1 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
                style={{
                  background: userCredit < flattenAllCost ? '#9CA3AF' : 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
                  boxShadow: userCredit < flattenAllCost ? 'none' : '0 4px 14px rgba(184, 134, 11, 0.35)',
                  cursor: userCredit < flattenAllCost ? 'not-allowed' : 'pointer'
                }}
              >
                {userCredit < flattenAllCost ? '크레딧 부족' : '일괄 사용'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 옷 펴기 확인 팝업 ========== */}
      {showFlattenConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div
            className="bg-white rounded-3xl shadow-2xl p-6 mx-6 max-w-sm w-full text-center"
            style={{ border: '1px solid rgba(212, 175, 55, 0.2)' }}
          >
            {/* 동전 아이콘 */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-gradient-to-br from-gold/20 to-gold-light/20"
              style={{ border: '2px solid rgba(212, 175, 55, 0.3)' }}>
              <span className="material-symbols-rounded text-3xl text-gold">monetization_on</span>
            </div>

            <h3 className="text-lg font-bold mb-2" style={{ color: '#2C2C2C' }}>
              1 크레딧을 사용하시겠어요?
            </h3>
            <p className="text-sm mb-4" style={{ color: '#6B6B6B' }}>
              옷 펴기 기능을 이용합니다
            </p>

            {/* 크레딧 잔액 표시 */}
            <div className="flex items-center justify-center gap-2 mb-6 py-2 px-4 rounded-xl bg-cream-dark/50">
              <span className="material-symbols-rounded text-gold">account_balance_wallet</span>
              <span className="text-sm" style={{ color: '#6B6B6B' }}>보유 크레딧: </span>
              <span className="text-lg font-bold text-gold">{userCredit}</span>
            </div>

            {/* 버튼들 */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowFlattenConfirm(false)}
                className="flex-1 py-3 rounded-xl font-medium transition-all"
                style={{
                  background: '#F5F0E8',
                  color: '#6B6B6B',
                  border: '1px solid rgba(212, 175, 55, 0.2)'
                }}
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowFlattenConfirm(false);
                  handleFlattenClothing();
                }}
                disabled={userCredit < 1}
                className="flex-1 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
                style={{
                  background: userCredit < 1 ? '#9CA3AF' : 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
                  boxShadow: userCredit < 1 ? 'none' : '0 4px 14px rgba(184, 134, 11, 0.35)',
                  cursor: userCredit < 1 ? 'not-allowed' : 'pointer'
                }}
              >
                {userCredit < 1 ? '크레딧 부족' : '사용하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Header - VTO 결과 모달 포함 */}
      <SharedHeader
        title={isBatchMode ? `옷 정보 입력 (${currentBatchIndex + 1}/${totalBatchImages})` : "옷 정보 입력"}
        showBackButton
        onBackClick={() => navigate('/register')}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 pb-28">

        {/* Image Section - 분석 전후 다른 레이아웃 */}
        <div className="py-6">
          {!isAnalyzed ? (
            // 분석 전: 원본 이미지만 표시
            <div className="flex flex-col items-center">
              <div className="relative w-48 h-48 bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden flex items-center justify-center">
                {currentImageUrl ? (
                  <img src={currentImageUrl} alt="선택된 의상" className="w-full h-full object-contain" />
                ) : (
                  <span className="material-symbols-rounded text-6xl text-gray-300">checkroom</span>
                )}
              </div>

              {/* 새 이미지 선택 버튼 */}
              <label
                className="mt-3 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all hover:scale-105"
                style={{
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  color: '#B8860B',
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(250, 248, 245, 0.8) 100%)'
                }}
              >
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
                className="mt-3 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95"
                style={{
                  background: isAnalyzing || !currentImageFile
                    ? '#9CA3AF'
                    : 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
                  boxShadow: isAnalyzing || !currentImageFile
                    ? 'none'
                    : '0 4px 14px rgba(184, 134, 11, 0.35)',
                  cursor: isAnalyzing || !currentImageFile ? 'not-allowed' : 'pointer'
                }}
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
                  <span className="text-xs text-gray-400 hover:text-gold cursor-pointer underline">
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
                    <>
                      <img
                        src={currentAnalyzedImage}
                        alt="분석된 의상"
                        className="w-full h-full object-contain cursor-pointer transition-transform hover:scale-105"
                        onClick={() => { setZoomedImageSrc(currentAnalyzedImage); setIsImageZoomed(true); }}
                      />
                      {/* 회전 버튼 (분석된 이미지) */}
                      {!skippedItems.includes(currentItemIndex) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRotateAnalyzedImage();
                          }}
                          className="absolute bottom-2 right-2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md z-10 transition-all text-gray-600 hover:text-gold"
                          title="90도 회전"
                        >
                          <span className="material-symbols-rounded text-lg">rotate_right</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="material-symbols-rounded text-6xl text-gray-300">checkroom</span>
                  )}
                </div>

                {/* SAM2/YOLO 이미지 선택 체크박스 */}
                {currentAnalyzedImage && !skippedItems.includes(currentItemIndex) && (
                  <label className="mt-2 flex items-center justify-center gap-2 text-xs cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={useSam2Images[currentItemIndex] ?? true}
                      onChange={(e) => setUseSam2Images(prev => ({
                        ...prev,
                        [currentItemIndex]: e.target.checked
                      }))}
                      className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold cursor-pointer"
                    />
                    <span className={`transition-colors ${useSam2Images[currentItemIndex] ? 'text-gold font-medium' : 'text-gray-500'}`}>
                      배경 제거 적용
                    </span>
                  </label>
                )}

                {/* 아이템 네비게이션 */}
                {analysisResults.length > 1 && (
                  <div className="mt-3 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-3">
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

                    {/* 전체 옷 펴기 버튼 (Global Position) */}
                    {(() => {
                      // 남은 대상 계산: 스킵X, 펴지지 않음, 현재 작업중 아님
                      const remainingTargets = analysisResults.filter((_, idx) =>
                        !skippedItems.includes(idx) &&
                        !flattenedImages[idx] &&
                        !flatteningItems.has(idx)
                      ).length;

                      const isAllCompleted = analysisResults.every((_, idx) =>
                        skippedItems.includes(idx) || flattenedImages[idx]
                      );

                      if (isAllCompleted) return null; // 모든 작업 완료 시 숨김

                      return (
                        <button
                          onClick={handleFlattenAll}
                          disabled={remainingTargets === 0}
                          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${remainingTargets > 0
                            ? 'bg-white border border-gold text-gold hover:bg-gold hover:text-white'
                            : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                          {remainingTargets > 0 ? (
                            <>
                              <span className="material-symbols-rounded text-sm">filter_none</span>
                              남은 {remainingTargets}벌 일괄 펴기
                            </>
                          ) : (
                            <>
                              <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                              작업 진행 중...
                            </>
                          )}
                        </button>
                      );
                    })()}
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
                  <div className="relative w-32 h-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden group">
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

                    {/* 회전 버튼 (우측 하단) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRotateFlattenedImage();
                      }}
                      className="absolute bottom-1 right-1 w-7 h-7 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-sm z-10 transition-all text-gray-600 hover:text-gold"
                      title="90도 회전"
                    >
                      <span className="material-symbols-rounded text-sm">rotate_right</span>
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
                  // 옷 펴기 버튼들 컨테이너
                  <div className="flex flex-col gap-2">
                    {/* 개별 옷 펴기 버튼 */}
                    <button
                      onClick={() => setShowFlattenConfirm(true)}
                      disabled={flatteningItems.has(currentItemIndex)}
                      className="w-20 h-24 rounded-xl shadow-lg flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95"
                      style={{
                        background: flatteningItems.has(currentItemIndex)
                          ? '#9CA3AF'
                          : 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
                        boxShadow: flatteningItems.has(currentItemIndex)
                          ? 'none'
                          : '0 4px 14px rgba(184, 134, 11, 0.35)',
                        cursor: flatteningItems.has(currentItemIndex) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {flatteningItems.has(currentItemIndex) ? (
                        <>
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-white font-medium mt-1">생성 중...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-rounded text-2xl text-white">dry_cleaning</span>
                          <span className="text-xs text-white font-medium mt-1">옷 펴기</span>
                          <span className="text-[10px] text-white/80 mt-0.5">
                            (1 크레딧)
                          </span>
                        </>
                      )}
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
                <span className="text-gold text-sm font-medium">
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
                      ? 'bg-gold text-white'
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
                        ? 'bg-gold/80 text-white'
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
                <span className="text-gold text-sm font-medium">
                  {(currentFormData.season || []).map(s => seasonOptions.find(o => o.value === s)?.label || s).join(', ') || '선택해주세요'}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {seasonOptions.map((season) => (
                  <button
                    key={season.value}
                    onClick={() => toggleSeason(season.value)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${(currentFormData.season || []).includes(season.value)
                      ? 'bg-gold text-white'
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
                <span className="text-gold text-sm font-medium">
                  {(currentFormData.tpo || []).map(t => tpoOptions.find(o => o.value === t)?.label || t).join(', ') || '선택해주세요'}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {tpoOptions.map((tpo) => (
                  <button
                    key={tpo.value}
                    onClick={() => toggleTpo(tpo.value)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${(currentFormData.tpo || []).includes(tpo.value)
                      ? 'bg-gold text-white'
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
                <span className="text-gold text-sm font-medium">
                  {(currentFormData.colors || []).map(c => colorOptions.find(o => o.value === c)?.name || c).join(', ') || '선택해주세요'}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => toggleColor(color.value)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${(currentFormData.colors || []).includes(color.value)
                      ? 'bg-gold text-white'
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
                  <span className="text-gold text-sm font-medium">
                    {(currentFormData.pattern || []).map(p => patternOptions.find(o => o.value === p)?.label || p).join(', ') || '선택해주세요'}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {patternOptions.map((pattern) => (
                    <button
                      key={pattern.value}
                      onClick={() => togglePattern(pattern.value)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${(currentFormData.pattern || []).includes(pattern.value)
                        ? 'bg-gold text-white'
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
                  <span className="text-gold text-sm font-medium">
                    {(currentFormData.detail || []).map(d => detailOptions.find(o => o.value === d)?.label || d).join(', ') || '선택해주세요'}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {detailOptions.map((detail) => (
                    <button
                      key={detail.value}
                      onClick={() => toggleDetail(detail.value)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${(currentFormData.detail || []).includes(detail.value)
                        ? 'bg-gold text-white'
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
                <span className="text-gold text-sm font-medium">
                  {(currentFormData.style_mood || []).map(s => styleMoodOptions.find(o => o.value === s)?.label || s).join(', ') || '선택해주세요'}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {styleMoodOptions.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => toggleStyleMood(style.value)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${(currentFormData.style_mood || []).includes(style.value)
                      ? 'bg-gold text-white'
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
                  : 'bg-gold text-white hover:opacity-90 active:scale-[0.98]'
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

      {/* Global Bottom Navigation */}
      <BottomNav />

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

      {/* 확대 모달 및 분석 팝업 애니메이션 스타일 */}
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
        @keyframes wiggle {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-wiggle {
          animation: wiggle 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LabelingPage;
