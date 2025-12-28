import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OutfitRecommender from './OutfitRecommender';

// 카테고리 데이터
const categories = [
  { id: 'outerwear', name: '외투', nameEn: 'Outerwear' },
  { id: 'tops', name: '상의', nameEn: 'Tops' },
  { id: 'bottoms', name: '하의', nameEn: 'Bottoms' },
  { id: 'shoes', name: '신발', nameEn: 'Shoes' },
];

// 샘플 옷 데이터 (나중에 실제 데이터로 교체)
const sampleClothes = {
  outerwear: [
    { id: 1, name: 'Denim Jacket', category: 'Casual', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400' },
  ],
  tops: [
    { id: 1, name: 'Cotton Tee', category: 'Casual', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' },
    { id: 2, name: 'Striped Shirt', category: 'Smart Casual', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400' },
    { id: 3, name: 'Polo Shirt', category: 'Business', image: 'https://images.unsplash.com/photo-1625910513413-5fc45b628b65?w=400' },
  ],
  bottoms: [
    { id: 1, name: 'Blue Jeans', category: 'Casual', image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400' },
  ],
  shoes: [
    { id: 1, name: 'White Sneakers', category: 'Casual', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400' },
  ],
};

const MainPage = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('tops');
  const [currentClothIndex, setCurrentClothIndex] = useState(0);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [userName, setUserName] = useState('');

  // localStorage에서 유저 정보 불러오기
  useEffect(() => {
    const userProfile = localStorage.getItem('userProfile');
    if (userProfile) {
      const { name } = JSON.parse(userProfile);
      setUserName(name);
    }
  }, []);

  // ... (기존 변수 및 핸들러 유지) ...
  const currentCategoryData = categories.find(c => c.id === activeCategory);
  const currentClothes = sampleClothes[activeCategory] || [];
  const currentCloth = currentClothes[currentClothIndex];
  const prevCloth = currentClothes[currentClothIndex - 1];
  const nextCloth = currentClothes[currentClothIndex + 1];

  const handlePrevCloth = () => {
    if (currentClothIndex > 0) {
      setCurrentClothIndex(currentClothIndex - 1);
    }
  };

  const handleNextCloth = () => {
    if (currentClothIndex < currentClothes.length - 1) {
      setCurrentClothIndex(currentClothIndex + 1);
    }
  };

  const handleCategoryChange = (categoryId) => {
    setActiveCategory(categoryId);
    setCurrentClothIndex(0);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans flex flex-col">
      
      {/* Header with Search */}
      <div className="px-4 py-3 flex items-center justify-between gap-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-40 transition-all duration-300">
        {isSearchExpanded ? (
          <button 
            onClick={() => setIsSearchExpanded(false)}
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-rounded text-2xl text-gray-600 dark:text-gray-300">arrow_back</span>
          </button>
        ) : null}
        
        <div className={`relative flex-1 group transition-all duration-300 ${isSearchExpanded ? '' : ''}`}>
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
            <span className="material-symbols-rounded text-xl">search</span>
          </span>
          <input
            className="w-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 text-sm py-3 pl-11 pr-4 rounded-full border-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
            placeholder="오늘의 코디? (Today's Outfit?)"
            type="text"
            onFocus={() => setIsSearchExpanded(true)}
          />
        </div>
        
        {!isSearchExpanded && (
          <button className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border-2 border-transparent hover:border-primary transition-all flex-shrink-0 animate-fadeIn">
            <span className="material-symbols-rounded text-2xl text-gray-600 dark:text-gray-300">person</span>
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24 px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        
        {isSearchExpanded ? (
          /* Expanded AI Stylist UI */
          <div className="animate-slideDown">
            <OutfitRecommender />
          </div>
        ) : (
          /* Default Main UI */
          <div className="animate-fadeIn">
            {/* Greeting */}
            {userName && (
              <div className="text-center mt-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  반가워요, <span className="text-primary">{userName}</span>님! 👋
                </h1>
              </div>
            )}
            
            {/* Category Title */}
            <div className="flex items-center justify-center space-x-8 mt-4 mb-2">
              <button 
                onClick={handlePrevCloth}
                className="p-2 text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
              >
                <span className="material-symbols-rounded text-3xl">chevron_left</span>
              </button>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-wide">
                {currentCategoryData?.name} ({currentCategoryData?.nameEn})
              </h2>
              <button 
                onClick={handleNextCloth}
                className="p-2 text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
              >
                <span className="material-symbols-rounded text-3xl">chevron_right</span>
              </button>
            </div>

            {/* Clothes Hanger Display */}
            <div className="relative w-full h-72 flex flex-col items-center justify-start mt-2">
              {/* Hanger Rail */}
              <div className="w-11/12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mb-4 shadow-inner"></div>
              
              {/* Clothes Carousel */}
              <div className="relative w-full h-full flex justify-center items-start">
                
                {/* Left (Previous) Cloth */}
                {prevCloth && (
                  <div className="absolute left-4 top-4 w-32 h-48 opacity-50 transform -rotate-6 scale-90 blur-[1px]">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-4 h-8 border-t-2 border-l-2 border-gray-400 rounded-tl-full"></div>
                    <div className="w-full h-full bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                      <img alt={prevCloth.name} className="w-full h-full object-cover" src={prevCloth.image} />
                    </div>
                  </div>
                )}

                {/* Right (Next) Cloth */}
                {nextCloth && (
                  <div className="absolute right-4 top-4 w-32 h-48 opacity-50 transform rotate-6 scale-90 blur-[1px]">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-4 h-8 border-t-2 border-l-2 border-gray-400 rounded-tl-full"></div>
                    <div className="w-full h-full bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                      <img alt={nextCloth.name} className="w-full h-full object-cover" src={nextCloth.image} />
                    </div>
                  </div>
                )}

                {/* Center (Current) Cloth */}
                {currentCloth ? (
                  <div className="relative z-20 w-48 h-64 transform translate-y-2">
                    {/* Hanger Hook */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-1 h-10 bg-gray-400"></div>
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-6 h-6 border-t-[3px] border-r-[3px] border-gray-800 dark:border-gray-400 rounded-tr-full transform -rotate-45"></div>
                    
                    <div className="w-full h-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-none dark:border dark:border-gray-700 overflow-hidden relative group">
                      <img 
                        alt={currentCloth.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        src={currentCloth.image} 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60"></div>
                      <div className="absolute bottom-3 left-3 text-white">
                        <p className="text-xs opacity-80">{currentCloth.category}</p>
                        <p className="font-bold text-sm">{currentCloth.name}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-20 w-48 h-64 flex items-center justify-center text-gray-400 dark:text-gray-600">
                    <div className="text-center">
                      <span className="material-symbols-rounded text-6xl mb-2">checkroom</span>
                      <p className="text-sm">옷이 없어요</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Category Tabs */}
            <div className="px-6 grid grid-cols-4 gap-4 mt-6">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`flex flex-col items-center gap-2 group cursor-pointer`}
                >
                  <span className={`text-sm font-semibold transition-colors ${
                    activeCategory === category.id 
                      ? 'text-primary' 
                      : 'text-gray-700 dark:text-gray-300 group-hover:text-primary'
                  }`}>
                    {category.name}
                  </span>
                  <div className={`w-full aspect-square rounded-xl bg-gray-200 dark:bg-gray-800 overflow-hidden transition-all ${
                    activeCategory === category.id 
                      ? 'ring-2 ring-primary shadow-lg ring-offset-2 dark:ring-offset-gray-900' 
                      : 'ring-2 ring-transparent group-hover:ring-primary/50'
                  }`}>
                    <div className={`w-full h-full flex items-center justify-center ${
                      activeCategory === category.id ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'
                    }`}>
                      <span className="material-symbols-rounded text-3xl text-gray-500 dark:text-gray-400">
                        {category.id === 'outerwear' && 'diversity_1'}
                        {category.id === 'tops' && 'checkroom'}
                        {category.id === 'bottoms' && 'straighten'}
                        {category.id === 'shoes' && 'steps'}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Generate Button */}
            <div className="px-6 mt-6 mb-8">
              <button className="w-full h-14 rounded-2xl bg-gradient-to-r from-orange-300 via-pink-400 to-purple-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-rounded">auto_awesome</span>
                생성하기 (Generate)
              </button>
            </div>

            {/* Floating Tip */}
            <div className="px-6 flex justify-center mb-4 animate-bounce">
              <div className="bg-gray-800 dark:bg-gray-700 text-white text-xs py-2 px-4 rounded-lg shadow-lg relative">
                옷 등록을 시작해 볼까요? (Start adding clothes?)
                <div className="absolute w-3 h-3 bg-gray-800 dark:bg-gray-700 transform rotate-45 -bottom-1.5 left-1/2 -translate-x-1/2"></div>
              </div>
            </div>
          </div>
        )}
      </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 h-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 flex items-center justify-around pb-2 z-50 safe-area-pb">
          <button className="flex flex-col items-center justify-center w-16 h-full text-primary transition-colors gap-1">
            <span className="material-symbols-rounded text-2xl">home</span>
            <span className="text-[10px] font-medium">홈</span>
          </button>
          
          <div className="relative -top-5">
            <button 
              onClick={() => navigate('/register')}
              className="w-16 h-16 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform border-4 border-white dark:border-gray-900"
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

export default MainPage;

