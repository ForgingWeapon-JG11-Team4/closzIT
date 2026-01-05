import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

const CreatePostPage = () => {
  const navigate = useNavigate();
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
  }, []);

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

      // 이미지 선택 시 자동 분석 시작
      analyzeImage(file);
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
      alert('Please select an image');
      return;
    }

    setUploading(true);

    try {
      const token = localStorage.getItem('accessToken');

      // Create post
      const response = await fetch(`${API_BASE_URL}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: imagePreview, // In real app, upload to S3 first
          caption,
          clothingIds: selectedClothes.map(c => c.id),
        }),
      });

      if (response.ok) {
        navigate('/feed');
      } else {
        alert('Failed to create post');
      }
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('Failed to create post');
    } finally {
      setUploading(false);
    }
  };

  const currentCategoryClothes = userClothes[activeCategory] || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-rounded text-2xl text-gray-700 dark:text-gray-200">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">New Post</h1>
          <button
            onClick={handleSubmit}
            disabled={!imagePreview || uploading}
            className="px-6 py-2 bg-primary text-white rounded-full font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Posting...' : 'Share'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Image Upload */}
        {!imagePreview ? (
          <label className="flex flex-col items-center justify-center w-full aspect-square bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:border-primary transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <span className="material-symbols-rounded text-6xl text-gray-400 dark:text-gray-500">add_photo_alternate</span>
            <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Tap to select a photo</p>
          </label>
        ) : (
          <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-2xl overflow-hidden">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => {
                setImage(null);
                setImagePreview(null);
                setAnalysisResults([]);
                setRecommendedClothes({});
              }}
              className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>
        )}

        {/* 의상 분석 중 표시 */}
        {isAnalyzing && (
          <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-600 dark:text-gray-300">의상을 분석하는 중...</span>
            </div>
          </div>
        )}

        {/* 추천 의상 섹션 */}
        {!isAnalyzing && Object.keys(recommendedClothes).length > 0 && (
          <div className="mt-4 p-4 bg-gradient-to-r from-primary/5 to-purple-500/5 dark:from-primary/10 dark:to-purple-500/10 rounded-xl border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-rounded text-primary">auto_awesome</span>
              <h3 className="font-semibold text-gray-900 dark:text-white">이 의상과 비슷한 내 옷</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
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
                    <div className={`relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                      <img
                        src={item.image}
                        alt={`추천 ${categoryLabel}`}
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                          <span className="material-symbols-rounded text-white text-xl">check</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-center text-gray-600 dark:text-gray-400 mt-1">{categoryLabel}</p>
                    <p className="text-[9px] text-center text-primary font-medium">{Math.round(item.similarity * 100)}% 유사</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Caption */}
        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Caption
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            rows={3}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Tag Clothes Button */}
        <button
          onClick={() => setShowClothesSelector(!showClothesSelector)}
          className="mt-6 w-full py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-between px-4 hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-rounded text-2xl text-primary">checkroom</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              Tag Clothes {selectedClothes.length > 0 && `(${selectedClothes.length})`}
            </span>
          </div>
          <span className={`material-symbols-rounded text-gray-600 dark:text-gray-400 transition-transform ${showClothesSelector ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>

        {/* Selected Clothes Preview */}
        {selectedClothes.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">TAGGED ITEMS</p>
            <div className="flex gap-3 flex-wrap">
              {selectedClothes.map((clothing) => (
                <div
                  key={clothing.id}
                  className="relative group"
                >
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-white dark:bg-gray-800 border-2 border-primary shadow-md">
                    <img
                      src={clothing.image}
                      alt={clothing.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => toggleClothingSelection(clothing)}
                      className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <span className="material-symbols-rounded text-base">close</span>
                    </button>
                  </div>
                  <div className="mt-1.5 max-w-[96px]">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{clothing.category}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{clothing.subCategory}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clothes Selector */}
        {showClothesSelector && (
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg">
            {/* Category Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${activeCategory === category.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
                      ? 'ring-4 ring-primary scale-95'
                      : 'hover:scale-105'
                      }`}
                  >
                    <img
                      src={clothing.image}
                      alt={clothing.name}
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                        <span className="material-symbols-rounded text-white text-3xl">check_circle</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {currentCategoryClothes.length === 0 && (
              <div className="text-center py-10">
                <span className="material-symbols-rounded text-4xl text-gray-300 dark:text-gray-600">checkroom</span>
                <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">No clothes in this category</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatePostPage;
