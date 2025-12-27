import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 샘플 코디 데이터 (5개의 코디 세트)
const outfitSets = [
  {
    id: 1,
    items: [
      { name: 'Brown Hoodie', position: 'top-[10%] left-[5%]', size: 'w-[40%] h-[30%]', rotate: '-rotate-3', zIndex: 'z-10', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400' },
      { name: 'Black Puffer Jacket', position: 'top-[12%] right-[10%]', size: 'w-[50%] h-[35%]', rotate: 'rotate-2', zIndex: 'z-20', image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400' },
      { name: 'Navy Vest', position: 'top-[35%] right-[5%]', size: 'w-[35%] h-[30%]', rotate: '-rotate-6', zIndex: 'z-30', image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400' },
      { name: 'Blue Jeans', position: 'bottom-[5%] left-[15%]', size: 'w-[30%] h-[45%]', rotate: 'rotate-1', zIndex: 'z-10', image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400' },
    ]
  },
  {
    id: 2,
    items: [
      { name: 'White T-Shirt', position: 'top-[8%] left-[10%]', size: 'w-[45%] h-[32%]', rotate: 'rotate-2', zIndex: 'z-10', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' },
      { name: 'Denim Jacket', position: 'top-[15%] right-[8%]', size: 'w-[48%] h-[38%]', rotate: '-rotate-3', zIndex: 'z-20', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400' },
      { name: 'Chino Pants', position: 'bottom-[8%] left-[20%]', size: 'w-[32%] h-[42%]', rotate: '-rotate-2', zIndex: 'z-15', image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400' },
    ]
  },
  {
    id: 3,
    items: [
      { name: 'Striped Shirt', position: 'top-[10%] left-[8%]', size: 'w-[42%] h-[35%]', rotate: '-rotate-1', zIndex: 'z-10', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400' },
      { name: 'Navy Blazer', position: 'top-[5%] right-[5%]', size: 'w-[52%] h-[40%]', rotate: 'rotate-3', zIndex: 'z-20', image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400' },
      { name: 'Dress Pants', position: 'bottom-[10%] left-[25%]', size: 'w-[28%] h-[40%]', rotate: 'rotate-1', zIndex: 'z-10', image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400' },
    ]
  },
  {
    id: 4,
    items: [
      { name: 'Graphic Tee', position: 'top-[12%] left-[12%]', size: 'w-[38%] h-[30%]', rotate: 'rotate-4', zIndex: 'z-10', image: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400' },
      { name: 'Bomber Jacket', position: 'top-[8%] right-[8%]', size: 'w-[50%] h-[38%]', rotate: '-rotate-2', zIndex: 'z-20', image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400' },
      { name: 'Jogger Pants', position: 'bottom-[5%] left-[18%]', size: 'w-[35%] h-[45%]', rotate: '-rotate-3', zIndex: 'z-15', image: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400' },
      { name: 'Sneakers', position: 'bottom-[2%] right-[15%]', size: 'w-[25%] h-[20%]', rotate: 'rotate-6', zIndex: 'z-25', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400' },
    ]
  },
  {
    id: 5,
    items: [
      { name: 'Polo Shirt', position: 'top-[10%] left-[10%]', size: 'w-[40%] h-[32%]', rotate: '-rotate-2', zIndex: 'z-10', image: 'https://images.unsplash.com/photo-1625910513413-5fc45b628b65?w=400' },
      { name: 'Cardigan', position: 'top-[8%] right-[6%]', size: 'w-[48%] h-[36%]', rotate: 'rotate-1', zIndex: 'z-20', image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400' },
      { name: 'Slim Jeans', position: 'bottom-[8%] left-[22%]', size: 'w-[30%] h-[42%]', rotate: 'rotate-2', zIndex: 'z-15', image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400' },
    ]
  },
];

const FittingPage = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const totalOutfits = outfitSets.length;

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalOutfits - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const currentOutfit = outfitSets[currentIndex];

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between gap-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-40">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="material-symbols-rounded text-2xl text-gray-600 dark:text-gray-300">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">코디 피팅</h1>
        <div className="w-10"></div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-between py-6 px-4">
        {/* Outfit Counter */}
        <div className="text-center mt-2 mb-4">
          <h2 className="text-3xl font-light text-gray-800 dark:text-gray-100 tracking-widest">
            {currentIndex + 1}/{totalOutfits}
          </h2>
        </div>

        {/* Outfit Carousel */}
        <div className="flex-1 w-full flex items-center justify-between">
          {/* Left Arrow */}
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`p-2 rounded-full transition-all ${
              currentIndex === 0 
                ? 'opacity-30 cursor-not-allowed' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95'
            }`}
          >
            <span className="material-symbols-rounded text-4xl text-gray-700 dark:text-gray-200">chevron_left</span>
          </button>

          {/* Outfit Items Display */}
          <div className="flex-1 h-[420px] relative mx-2">
            {currentOutfit.items.map((item, index) => (
              <div 
                key={`${currentOutfit.id}-${index}`}
                className={`absolute ${item.position} ${item.size} bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-none dark:border dark:border-gray-700 flex items-center justify-center p-3 transform ${item.rotate} transition-all duration-300 hover:scale-105 ${item.zIndex}`}
              >
                <img 
                  alt={item.name} 
                  className="w-full h-full object-cover rounded-xl" 
                  src={item.image}
                />
              </div>
            ))}
          </div>

          {/* Right Arrow */}
          <button 
            onClick={handleNext}
            disabled={currentIndex === totalOutfits - 1}
            className={`p-2 rounded-full transition-all ${
              currentIndex === totalOutfits - 1 
                ? 'opacity-30 cursor-not-allowed' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95'
            }`}
          >
            <span className="material-symbols-rounded text-4xl text-gray-700 dark:text-gray-200">chevron_right</span>
          </button>
        </div>

        {/* Fitting Button */}
        <div className="w-full px-4 mt-6 mb-4">
          <button className="w-full h-14 rounded-2xl bg-gradient-to-r from-orange-300 via-pink-400 to-purple-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-rounded">checkroom</span>
            피팅하기
          </button>
        </div>
      </main>

      {/* Bottom Navigation */}
      <div className="h-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 flex items-center justify-around pb-2 z-50 safe-area-pb">
        <button 
          onClick={() => navigate('/main')}
          className="flex flex-col items-center justify-center w-16 h-full text-gray-400 hover:text-primary transition-colors gap-1"
        >
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

export default FittingPage;
