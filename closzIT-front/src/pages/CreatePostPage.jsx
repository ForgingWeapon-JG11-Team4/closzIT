import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SharedHeader from '../components/SharedHeader';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

const CreatePostPage = () => {
  const navigate = useNavigate();
  const { postId } = useParams(); // 수정 모드일 경우 postId가 존재
  const isEditMode = !!postId;
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [selectedClothes, setSelectedClothes] = useState([]);
  const [showClothesSelector, setShowClothesSelector] = useState(false);
  const [userClothes, setUserClothes] = useState({
    outerwear: [],
    tops: [],
    bottoms: [],
    shoes: [],
  });
  const [activeCategory, setActiveCategory] = useState('tops');
  const [uploading, setUploading] = useState(false);

  // 의상 분석 관련 state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [recommendedClothes, setRecommendedClothes] = useState({});

  const categories = [
    { id: 'outerwear', name: '외투', icon: 'diversity_1' },
    { id: 'tops', name: '상의', icon: 'checkroom' },
    { id: 'bottoms', name: '하의', icon: 'straighten' },
    { id: 'shoes', name: '신발', icon: 'steps' },
  ];

  // 카테고리 매핑 (백엔드 -> 프론트엔드)
  const categoryMapping = {
    'Outer': 'outerwear',
    'Top': 'tops',
    'Bottom': 'bottoms',
    'Shoes': 'shoes',
  };

  useEffect(() => {
    fetchUserClothes();
    if (isEditMode) {
      fetchPostData();
    }
  }, [postId]);

  // 수정 모드: 기존 게시글 데이터 불러오기
  const fetchPostData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const post = await response.json();
        setCaption(post.caption || '');
        setImagePreview(post.imageUrl);

        // 태그된 의상들 선택 상태로 설정
        if (post.postClothes && post.postClothes.length > 0) {
          const taggedClothes = post.postClothes.map(pc => ({
            id: pc.clothing.id,
            category: pc.clothing.category,
            subCategory: pc.clothing.subCategory,
            image: pc.clothing.imageUrl,
          }));
          setSelectedClothes(taggedClothes);
        }
      } else {
        alert('게시글을 불러오는데 실패했습니다.');
        navigate('/feed');
      }
    } catch (error) {
      console.error('Failed to fetch post:', error);
      alert('게시글을 불러오는데 실패했습니다.');
      navigate('/feed');
    }
  };

  const fetchUserClothes = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/items/by-category`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserClothes(data);
      }
    } catch (error) {
      console.error('Failed to fetch user clothes:', error);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      // 수정 모드에서는 의상 분석 스킵
      if (!isEditMode) {
        analyzeImage(file);
      }
    }
  };

  // 의상 분석 API 호출
  const analyzeImage = async (file) => {
    setIsAnalyzing(true);
    setAnalysisResults([]);
    setRecommendedClothes({});

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/analysis`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`분석 실패: ${response.status}`);
      }

      const data = await response.json();
      const results = data.results || [];

      if (results.length === 0) {
        console.log('탐지된 의상이 없습니다.');
        setIsAnalyzing(false);
        return;
      }

      setAnalysisResults(results);

      // 각 의상별 유사 의상 검색 후 카테고리별 최고 유사도 의상 선택
      await fetchAndSelectBestSimilarItems(results);
    } catch (error) {
      console.error('분석 오류:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 유사 의상 검색 후 카테고리별 최고 유사도 의상 선택
  const fetchAndSelectBestSimilarItems = async (results) => {
    const token = localStorage.getItem('accessToken');
    const categoryBest = {}; // 카테고리별 가장 유사한 의상

    const similarPromises = results.map(async (item) => {
      try {
        const response = await fetch(`${API_BASE_URL}/analysis/similar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            image_base64: item.image,
            embedding: item.embedding,
            category: item.label?.category,
            sub_category: item.label?.sub_category,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return data.similar_items || [];
        }
        return [];
      } catch (error) {
        console.error('유사 의상 검색 실패:', error);
        return [];
      }
    });

    const allSimilarResults = await Promise.all(similarPromises);

    // 모든 유사 의상 결과를 합쳐서 카테고리별 최고 유사도 의상 선택
    allSimilarResults.flat().forEach((item) => {
      const backendCategory = item.category;
      const frontendCategory = categoryMapping[backendCategory] || backendCategory?.toLowerCase();

      if (frontendCategory) {
        if (!categoryBest[frontendCategory] || item.similarity > categoryBest[frontendCategory].similarity) {
          categoryBest[frontendCategory] = {
            ...item,
            frontendCategory,
          };
        }
      }
    });

    setRecommendedClothes(categoryBest);
  };

  // 추천 의상을 클릭하면 태그에 추가
  const addRecommendedToSelection = (item) => {
    const clothing = {
      id: item.id,
      category: item.category,
      subCategory: item.subCategory,
      image: item.image,
    };

    setSelectedClothes(prev => {
      const isAlreadySelected = prev.find(c => c.id === clothing.id);
      if (isAlreadySelected) {
        return prev;
      }
      return [...prev, clothing];
    });
  };

  const toggleClothingSelection = (clothing) => {
    setSelectedClothes(prev => {
      const isSelected = prev.find(c => c.id === clothing.id);
      if (isSelected) {
        return prev.filter(c => c.id !== clothing.id);
      } else {
        return [...prev, clothing];
      }
    });
  };

  const handleSubmit = async () => {
    if (!imagePreview) {
      alert('이미지를 선택해주세요');
      return;
    }

    setUploading(true);

    try {
      const token = localStorage.getItem('accessToken');

      if (isEditMode) {
        // 수정 모드: PUT 요청
        const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            caption,
            clothingIds: selectedClothes.map(c => c.id),
          }),
        });

        if (response.ok) {
          navigate('/feed');
        } else {
          alert('게시물 수정에 실패했습니다');
        }
      } else {
        // 생성 모드: POST 요청
        const response = await fetch(`${API_BASE_URL}/posts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: imagePreview,
            caption,
            clothingIds: selectedClothes.map(c => c.id),
          }),
        });

        if (response.ok) {
          navigate('/feed');
        } else {
          alert('게시물 작성에 실패했습니다');
        }
      }
    } catch (error) {
      console.error('Failed to save post:', error);
      alert(isEditMode ? '게시물 수정에 실패했습니다' : '게시물 작성에 실패했습니다');
    } finally {
      setUploading(false);
    }
  };

  const currentCategoryClothes = userClothes[activeCategory] || [];

  return (
    <div className="min-h-screen bg-cream dark:bg-[#1A1918]">
      {/* Shared Header with Submit Button */}
      <SharedHeader
        title={isEditMode ? '게시글 수정' : '새 게시물'}
        showBackButton
        rightContent={
          <button
            onClick={handleSubmit}
            disabled={!imagePreview || uploading}
            className="px-6 py-2 btn-premium rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (isEditMode ? '수정 중...' : '게시 중...') : (isEditMode ? '수정' : '공유')}
          </button>
        }
      />

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Image Upload */}
        {!imagePreview ? (
          <label className="flex flex-col items-center justify-center w-full aspect-square bg-warm-white dark:bg-charcoal rounded-2xl border-2 border-dashed border-gold-light/50 cursor-pointer hover:border-gold transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <span className="material-symbols-rounded text-6xl text-gold-light dark:text-charcoal-light">add_photo_alternate</span>
            <p className="mt-4 text-charcoal-light dark:text-cream-dark font-medium">탭하여 사진 선택</p>
          </label>
        ) : (
          <div className="relative w-full aspect-square bg-cream-dark dark:bg-charcoal-light rounded-2xl overflow-hidden">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-full object-contain"
            />
            <button
              onClick={() => {
                setImage(null);
                setImagePreview(null);
                setAnalysisResults([]);
                setRecommendedClothes({});
              }}
              className="absolute top-4 right-4 w-10 h-10 bg-charcoal/50 backdrop-blur-sm rounded-full flex items-center justify-center text-warm-white hover:bg-charcoal/70 transition-colors"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>
        )}

        {/* 의상 분석 중 표시 */}
        {isAnalyzing && (
          <div className="mt-4 p-4 bg-warm-white dark:bg-charcoal rounded-xl shadow-soft border border-gold-light/20">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-charcoal-light dark:text-cream-dark">의상을 분석하는 중...</span>
            </div>
          </div>
        )}

        {/* 추천 의상 섹션 */}
        {!isAnalyzing && Object.keys(recommendedClothes).length > 0 && (
          <div className="mt-4 p-4 bg-gradient-to-r from-gold/5 to-gold-light/10 dark:from-gold/10 dark:to-gold-light/5 rounded-xl border border-gold/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-rounded text-gold">auto_awesome</span>
              <h3 className="font-semibold text-charcoal dark:text-cream">이 의상과 비슷한 내 옷</h3>
            </div>
            <p className="text-xs text-charcoal-light dark:text-cream-dark mb-3">
              탭하면 자동으로 태그됩니다
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {Object.entries(recommendedClothes).map(([category, item]) => {
                const isSelected = selectedClothes.find(c => c.id === item.id);
                const categoryLabel = categories.find(c => c.id === category)?.name || category;
                return (
                  <div
                    key={item.id}
                    onClick={() => addRecommendedToSelection(item)}
                    className={`flex-shrink-0 cursor-pointer transition-all ${isSelected ? 'opacity-50' : 'hover:scale-105'}`}
                  >
                    <div className={`relative w-20 h-20 rounded-lg overflow-hidden bg-cream-dark dark:bg-charcoal-light ${isSelected ? 'ring-2 ring-gold' : ''}`}>
                      <img
                        src={item.image}
                        alt={`추천 ${categoryLabel}`}
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-gold/30 flex items-center justify-center">
                          <span className="material-symbols-rounded text-warm-white text-xl">check</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-center text-charcoal-light dark:text-cream-dark mt-1">{categoryLabel}</p>
                    <p className="text-[9px] text-center text-gold font-medium">{Math.round(item.similarity * 100)}% 유사</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Caption */}
        <div className="mt-6">
          <label className="block text-sm font-semibold text-charcoal dark:text-cream mb-2">
            캡션
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="캡션을 입력하세요..."
            rows={3}
            className="w-full px-4 py-3 bg-warm-white dark:bg-charcoal border border-gold-light/30 rounded-xl text-charcoal dark:text-cream placeholder-charcoal-light/50 focus:outline-none focus:ring-2 focus:ring-gold resize-none"
          />
        </div>

        {/* Tag Clothes Button */}
        <button
          onClick={() => setShowClothesSelector(!showClothesSelector)}
          className="mt-6 w-full py-4 bg-warm-white dark:bg-charcoal border-2 border-gold-light/30 rounded-xl flex items-center justify-between px-4 hover:border-gold transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-rounded text-2xl text-gold">checkroom</span>
            <span className="font-semibold text-charcoal dark:text-cream">
              의상 태그하기 {selectedClothes.length > 0 && `(${selectedClothes.length})`}
            </span>
          </div>
          <span className={`material-symbols-rounded text-charcoal-light dark:text-cream-dark transition-transform ${showClothesSelector ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>

        {/* Selected Clothes Preview */}
        {selectedClothes.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-charcoal-light dark:text-cream-dark mb-2 px-1">태그된 의상</p>
            <div className="flex gap-3 flex-wrap">
              {selectedClothes.map((clothing) => (
                <div
                  key={clothing.id}
                  className="relative group"
                >
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-warm-white dark:bg-charcoal border-2 border-gold shadow-soft">
                    <img
                      src={clothing.image}
                      alt={clothing.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => toggleClothingSelection(clothing)}
                      className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-warm-white shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <span className="material-symbols-rounded text-base">close</span>
                    </button>
                  </div>
                  <div className="mt-1.5 max-w-[96px]">
                    <p className="text-xs font-semibold text-charcoal dark:text-cream truncate">{clothing.category}</p>
                    <p className="text-[10px] text-charcoal-light dark:text-cream-dark truncate">{clothing.subCategory}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clothes Selector */}
        {showClothesSelector && (
          <div className="mt-4 bg-warm-white dark:bg-charcoal rounded-2xl p-4 shadow-soft border border-gold-light/20">
            {/* Category Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${activeCategory === category.id
                    ? 'bg-charcoal dark:bg-cream text-cream dark:text-charcoal'
                    : 'bg-cream-dark dark:bg-charcoal-light/20 text-charcoal-light dark:text-cream-dark hover:bg-gold-light/30'
                    }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* Clothes Grid */}
            <div className="grid grid-cols-4 gap-3">
              {currentCategoryClothes.map((clothing) => {
                const isSelected = selectedClothes.find(c => c.id === clothing.id);
                return (
                  <div
                    key={clothing.id}
                    onClick={() => toggleClothingSelection(clothing)}
                    className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all ${isSelected
                      ? 'ring-4 ring-gold scale-95'
                      : 'hover:scale-105'
                      }`}
                  >
                    <img
                      src={clothing.image}
                      alt={clothing.name}
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-gold/30 flex items-center justify-center">
                        <span className="material-symbols-rounded text-warm-white text-3xl">check_circle</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {currentCategoryClothes.length === 0 && (
              <div className="text-center py-10">
                <span className="material-symbols-rounded text-4xl text-gold-light dark:text-charcoal-light">checkroom</span>
                <p className="mt-2 text-charcoal-light dark:text-cream-dark text-sm">이 카테고리에 의상이 없습니다</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatePostPage;
