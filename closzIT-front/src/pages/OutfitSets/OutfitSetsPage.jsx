import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// 모델 사진 import
import model1 from '../../assets/clothes/모델사진/모델1.png';
import model2 from '../../assets/clothes/모델사진/모델2.png';
import fakeTryOnImage from '../../assets/clothes/모델사진/가라착장.png';

const modelPhotos = [
  { id: 1, name: '모델 1', src: model1 },
  { id: 2, name: '모델 2', src: model2 },
];

const OutfitSetsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [outfitSets, setOutfitSets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSet, setSelectedSet] = useState(null);
  
  // VTO 관련 상태
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [isVTOLoading, setIsVTOLoading] = useState(false);
  const [vtoResult, setVtoResult] = useState(null);
  const [showVtoResult, setShowVtoResult] = useState(false);
  const [vtoError, setVtoError] = useState(null);
  
  // 아이템 상세 모달
  const [selectedItem, setSelectedItem] = useState(null);
  
  // 개별 아이템 가상착장 상태
  const [isSingleTryOnLoading, setIsSingleTryOnLoading] = useState(false);
  const [showSingleTryOnResult, setShowSingleTryOnResult] = useState(false);
  const [showSingleModelPicker, setShowSingleModelPicker] = useState(false);

  // 카테고리에서 랜덤 아이템 선택
  const getRandomItem = (items) => {
    if (!items || items.length === 0) return null;
    return items[Math.floor(Math.random() * items.length)];
  };

  // 3세트 생성
  const generateOutfitSets = (clothes) => {
    const sets = [];
    for (let i = 0; i < 3; i++) {
      sets.push({
        id: i + 1,
        outerwear: getRandomItem(clothes.outerwear),
        top: getRandomItem(clothes.tops),
        bottom: getRandomItem(clothes.bottoms),
        shoes: getRandomItem(clothes.shoes),
      });
    }
    return sets;
  };

  useEffect(() => {
    const fetchClothesAndGenerate = async () => {
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
        const response = await fetch(`${backendUrl}/items?isAdmin=true`);
        
        if (response.ok) {
          const clothes = await response.json();
          const sets = generateOutfitSets(clothes);
          setOutfitSets(sets);
        }
      } catch (error) {
        console.error('Failed to fetch clothes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClothesAndGenerate();
  }, []);

  // 세트 새로고침
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/items?isAdmin=true`);
      
      if (response.ok) {
        const clothes = await response.json();
        const sets = generateOutfitSets(clothes);
        setOutfitSets(sets);
      }
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // URL에서 Blob 가져오기
  const urlToBlob = async (url) => {
    const response = await fetch(url);
    return await response.blob();
  };

  // 가상착장 API 호출
  const handleVirtualTryOn = async () => {
    if (!selectedModel || selectedSet === null) return;
    
    const outfit = outfitSets[selectedSet];
    if (!outfit) return;

    setIsVTOLoading(true);
    setVtoError(null);
    setShowModelPicker(false);

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      
      // FormData 생성
      const formData = new FormData();
      
      // 모델 사진 추가
      const personBlob = await urlToBlob(selectedModel.src);
      formData.append('person', personBlob, 'person.png');
      
      // 외투 추가
      if (outfit.outerwear?.image) {
        const outerBlob = await urlToBlob(outfit.outerwear.image);
        formData.append('outer', outerBlob, 'outer.png');
      }
      
      // 상의 추가
      if (outfit.top?.image) {
        const topBlob = await urlToBlob(outfit.top.image);
        formData.append('top', topBlob, 'top.png');
      }
      
      // 하의 추가
      if (outfit.bottom?.image) {
        const bottomBlob = await urlToBlob(outfit.bottom.image);
        formData.append('bottom', bottomBlob, 'bottom.png');
      }
      
      // 신발 추가
      if (outfit.shoes?.image) {
        const shoesBlob = await urlToBlob(outfit.shoes.image);
        formData.append('shoes', shoesBlob, 'shoes.png');
      }

      console.log('[VTO] Sending request to API...');
      
      const response = await fetch(`${backendUrl}/api/fitting/virtual-try-on`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || '가상착장 요청 실패');
      }

      const result = await response.json();
      console.log('[VTO] Result:', result);
      setVtoResult(result);
    } catch (error) {
      console.error('[VTO] Error:', error);
      setVtoError(error.message);
    } finally {
      setIsVTOLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">코디 생성 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans">
      {/* VTO Result Modal */}
      {showVtoResult && vtoResult && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setShowVtoResult(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">가상착장 결과</h3>
              <button 
                onClick={() => setShowVtoResult(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
              >
                <span className="material-symbols-rounded text-gray-500">close</span>
              </button>
            </div>
            
            {vtoResult.imageUrl ? (
              <div className="rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-700 mb-4 max-h-96">
                <img 
                  src={vtoResult.imageUrl} 
                  alt="가상착장 결과" 
                  className="w-full h-full object-contain max-h-96"
                />
              </div>
            ) : vtoResult.message ? (
              <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-4 mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">{vtoResult.message}</p>
              </div>
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-4 mb-4">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  결과를 생성하는 데 시간이 걸릴 수 있습니다.
                </p>
              </div>
            )}

            <button 
              onClick={() => { setShowVtoResult(false); setVtoResult(null); }}
              className="w-full py-3 bg-primary text-white font-bold rounded-xl"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* VTO Error Modal */}
      {vtoError && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setVtoError(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <span className="material-symbols-rounded text-3xl text-red-500">error</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">오류 발생</h3>
            <p className="text-sm text-gray-500 mb-4">{vtoError}</p>
            <button 
              onClick={() => setVtoError(null)}
              className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[95] flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedItem.label}</h3>
              <button 
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
              >
                <span className="material-symbols-rounded text-gray-500">close</span>
              </button>
            </div>
            
            <div className="rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-700 mb-4">
              {selectedItem.image ? (
                <img 
                  src={selectedItem.image} 
                  alt={selectedItem.name} 
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center">
                  <span className="material-symbols-rounded text-6xl text-gray-400">checkroom</span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">이름</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedItem.name || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">카테고리</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedItem.category || '-'}</span>
              </div>
              {selectedItem.sub_category && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">세부 카테고리</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedItem.sub_category}</span>
                </div>
              )}
              {selectedItem.season?.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">시즌</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedItem.season.join(', ')}</span>
                </div>
              )}
              {selectedItem.tpo?.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">TPO</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedItem.tpo.join(', ')}</span>
                </div>
              )}
            </div>
            
            {/* 이것만 입어보기 버튼 */}
            <button 
              onClick={() => {
                setSelectedItem(null);
                setShowSingleModelPicker(true);
              }}
              className="w-full mt-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <span className="material-symbols-rounded">view_in_ar</span>
              이것만 입어보기
            </button>
          </div>
        </div>
      )}

      {/* Single Item Try-On Loading */}
      {isSingleTryOnLoading && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-sm w-[90%] text-center shadow-2xl">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-purple-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div>
              <span className="absolute inset-0 flex items-center justify-center material-symbols-rounded text-4xl text-purple-500">checkroom</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white mb-2">가상착장 생성 중...</p>
            <p className="text-sm text-gray-500">AI가 옷을 입혀보는 중이에요</p>
          </div>
        </div>
      )}

      {/* Single Item Try-On Result */}
      {showSingleTryOnResult && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setShowSingleTryOnResult(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">가상착장 결과</h3>
              <button 
                onClick={() => setShowSingleTryOnResult(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
              >
                <span className="material-symbols-rounded text-gray-500">close</span>
              </button>
            </div>
            
            <div className="rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-700 mb-4 max-h-96">
              <img 
                src={fakeTryOnImage} 
                alt="가상착장 결과" 
                className="w-full h-full object-contain max-h-96"
              />
            </div>

            <button 
              onClick={() => setShowSingleTryOnResult(false)}
              className="w-full py-3 bg-primary text-white font-bold rounded-xl"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Single Item Model Picker Modal */}
      {showSingleModelPicker && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
          onClick={() => setShowSingleModelPicker(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">모델 선택</h3>
              <button 
                onClick={() => setShowSingleModelPicker(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
              >
                <span className="material-symbols-rounded text-gray-500">close</span>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              {modelPhotos.map((model) => (
                <div 
                  key={model.id}
                  onClick={() => {
                    setShowSingleModelPicker(false);
                    setIsSingleTryOnLoading(true);
                    setTimeout(() => {
                      setIsSingleTryOnLoading(false);
                      setShowSingleTryOnResult(true);
                    }, 5000);
                  }}
                  className="rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:ring-4 hover:ring-purple-400"
                >
                  <img 
                    src={model.src} 
                    alt={model.name} 
                    className="w-full aspect-[3/4] object-cover"
                  />
                  <div className="py-2 text-center text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {model.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Model Picker Modal */}
      {showModelPicker && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
          onClick={() => { setShowModelPicker(false); setSelectedModel(null); }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">모델 선택</h3>
              <button 
                onClick={() => { setShowModelPicker(false); setSelectedModel(null); }}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
              >
                <span className="material-symbols-rounded text-gray-500">close</span>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              {modelPhotos.map((model) => (
                <div 
                  key={model.id}
                  onClick={() => setSelectedModel(model)}
                  className={`rounded-2xl overflow-hidden cursor-pointer transition-all ${
                    selectedModel?.id === model.id 
                      ? 'ring-4 ring-primary scale-[1.02]' 
                      : 'hover:scale-[1.02]'
                  }`}
                >
                  <img 
                    src={model.src} 
                    alt={model.name} 
                    className="w-full aspect-[3/4] object-cover"
                  />
                  <div className={`py-2 text-center text-sm font-medium ${
                    selectedModel?.id === model.id 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>
                    {model.name}
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleVirtualTryOn}
              disabled={!selectedModel}
              className={`w-full py-4 font-bold rounded-xl transition-all ${
                selectedModel 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {selectedModel ? '가상착장 시작하기' : '모델을 선택해주세요'}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="material-symbols-rounded text-2xl text-gray-700 dark:text-gray-200">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white flex-1">추천 코디</h1>
        <button
          onClick={handleRefresh}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="material-symbols-rounded text-2xl text-gray-700 dark:text-gray-200">refresh</span>
        </button>
      </div>

      {/* Outfit Sets */}
      <div className="p-4 space-y-6 pb-44">
        {outfitSets.map((set, index) => (
          <div 
            key={set.id}
            onClick={() => setSelectedSet(selectedSet === index ? null : index)}
            className={`bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-lg transition-all cursor-pointer ${
              selectedSet === index ? 'ring-2 ring-primary scale-[1.02]' : 'hover:shadow-xl'
            }`}
          >
            {/* Set Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                코디 {index + 1}
              </h3>
              {selectedSet === index && (
                <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                  선택됨
                </span>
              )}
            </div>

            {/* Clothes Grid */}
            <div className="grid grid-cols-4 gap-3">
              {/* Outerwear */}
              <div 
                className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
                onClick={(e) => { e.stopPropagation(); set.outerwear && setSelectedItem({...set.outerwear, label: '외투'}); }}
              >
                <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden mb-1">
                  {set.outerwear?.image ? (
                    <img src={set.outerwear.image} alt="외투" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-rounded text-3xl text-gray-400">checkroom</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-500">외투</span>
              </div>

              {/* Top */}
              <div 
                className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
                onClick={(e) => { e.stopPropagation(); set.top && setSelectedItem({...set.top, label: '상의'}); }}
              >
                <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden mb-1">
                  {set.top?.image ? (
                    <img src={set.top.image} alt="상의" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-rounded text-3xl text-gray-400">checkroom</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-500">상의</span>
              </div>

              {/* Bottom */}
              <div 
                className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
                onClick={(e) => { e.stopPropagation(); set.bottom && setSelectedItem({...set.bottom, label: '하의'}); }}
              >
                <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden mb-1">
                  {set.bottom?.image ? (
                    <img src={set.bottom.image} alt="하의" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-rounded text-3xl text-gray-400">checkroom</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-500">하의</span>
              </div>

              {/* Shoes */}
              <div 
                className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
                onClick={(e) => { e.stopPropagation(); set.shoes && setSelectedItem({...set.shoes, label: '신발'}); }}
              >
                <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden mb-1">
                  {set.shoes?.image ? (
                    <img src={set.shoes.image} alt="신발" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-rounded text-3xl text-gray-400">steps</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-500">신발</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Action Buttons */}
      {selectedSet !== null && (
        <div className="fixed bottom-24 left-4 right-4 z-40 space-y-2">
          {/* 가상착장 버튼 - 상태에 따라 다르게 표시 */}
          {isVTOLoading ? (
            <button
              disabled
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-3"
            >
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              생성 중...
            </button>
          ) : vtoResult ? (
            <button
              onClick={() => setShowVtoResult(true)}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-rounded">check_circle</span>
              결과 확인하기
            </button>
          ) : (
            <button
              onClick={() => setShowModelPicker(true)}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-rounded">view_in_ar</span>
              이 코디로 가상착장해보기 (3크레딧)
            </button>
          )}
          
          {/* 결정하기 버튼 */}
          <button
            onClick={() => alert('이 코디를 선택했습니다!')}
            className="w-full py-4 bg-gradient-to-r from-primary to-indigo-500 text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all"
          >
            이 코디로 결정하기
          </button>
        </div>
      )}

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
            className="w-16 h-16 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-gray-900"
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

export default OutfitSetsPage;
