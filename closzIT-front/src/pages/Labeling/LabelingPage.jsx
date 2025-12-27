import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 계절 옵션
const seasonOptions = ['봄', '여름', '가을', '겨울'];

// TPO 옵션
const tpoOptions = ['데일리', '출근', '데이트', '운동', '여행', '파티'];

// 카테고리 옵션
const categoryOptions = {
  '아우터': ['가디건', '자켓', '코트', '패딩', '점퍼'],
  '상의': ['티셔츠', '셔츠', '블라우스', '니트', '맨투맨'],
  '하의': ['청바지', '슬랙스', '스커트', '반바지'],
  '원피스': ['미니', '미디', '롱'],
};

// 색상 옵션
const colorOptions = [
  { name: '네이비', hex: '#000080' },
  { name: '블랙', hex: '#000000' },
  { name: '화이트', hex: '#ffffff' },
  { name: '그레이', hex: '#808080' },
  { name: '베이지', hex: '#f5f5dc' },
  { name: '브라운', hex: '#8b4513' },
  { name: '레드', hex: '#dc2626' },
  { name: '블루', hex: '#3b82f6' },
];

// 소재 옵션
const materialOptions = ['울', '면', '폴리에스터', '린넨', '실크', '데님', '가죽'];

// 패턴 옵션
const patternOptions = ['무지', '스트라이프', '체크', '도트', '플로럴', '프린트'];

const LabelingPage = () => {
  const navigate = useNavigate();
  const [selectedSeasons, setSelectedSeasons] = useState(['봄', '가을', '겨울']);
  const [selectedTpo, setSelectedTpo] = useState('데일리');
  const [selectedCategory, setSelectedCategory] = useState('아우터 > 가디건');
  const [selectedColor, setSelectedColor] = useState('#000080');
  const [selectedMaterial, setSelectedMaterial] = useState('울');
  const [selectedPattern, setSelectedPattern] = useState('무지');
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');

  const toggleSeason = (season) => {
    setSelectedSeasons(prev => 
      prev.includes(season) 
        ? prev.filter(s => s !== season)
        : [...prev, season]
    );
  };

  const handleSave = () => {
    // TODO: 저장 로직 구현
    console.log('Saving clothing item...');
    navigate('/main');
  };

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
        
        {/* Image Preview */}
        <div className="flex justify-center py-6">
          <div className="relative w-48 h-48 bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden flex items-center justify-center">
            <span className="material-symbols-rounded text-6xl text-gray-300 dark:text-gray-600">checkroom</span>
            <div className="absolute bottom-2 right-2">
              <button className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md">
                <span className="material-symbols-rounded text-white text-lg">edit</span>
              </button>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-1">
          
          {/* 계절 */}
          <div className="py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-900 dark:text-white font-medium">계절</span>
              <span className="text-primary text-sm font-medium">
                {selectedSeasons.join(', ') || '선택해주세요'}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {seasonOptions.map((season) => (
                <button
                  key={season}
                  onClick={() => toggleSeason(season)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedSeasons.includes(season)
                      ? 'bg-primary text-white'
                      : 'border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {season}
                </button>
              ))}
            </div>
          </div>

          {/* TPO */}
          <div className="flex justify-between items-center py-4 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-900 dark:text-white font-medium">TPO</span>
            <button className="flex items-center text-primary text-sm font-medium">
              {selectedTpo}
              <span className="material-symbols-rounded text-gray-400 text-lg ml-1">expand_more</span>
            </button>
          </div>

          {/* 카테고리 */}
          <div className="flex justify-between items-center py-4 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-900 dark:text-white font-medium">카테고리</span>
            <button className="flex items-center text-primary text-sm font-medium">
              {selectedCategory}
              <span className="material-symbols-rounded text-gray-400 text-lg ml-1">expand_more</span>
            </button>
          </div>

          {/* 색상 */}
          <div className="flex justify-between items-center py-4 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-900 dark:text-white font-medium">색상</span>
            <button className="flex items-center">
              <span 
                className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-600 mr-2 shadow-sm" 
                style={{ backgroundColor: selectedColor }}
              ></span>
              <span className="material-symbols-rounded text-gray-400 text-lg">expand_more</span>
            </button>
          </div>

          {/* 브랜드 */}
          <div className="flex justify-between items-center py-4 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-900 dark:text-white font-medium">브랜드</span>
            <button className="flex items-center text-gray-400 dark:text-gray-500 text-sm">
              {brand || '브랜드를 선택해주세요'}
              <span className="material-symbols-rounded text-gray-400 text-lg ml-1">expand_more</span>
            </button>
          </div>

          {/* 소재 */}
          <div className="flex justify-between items-center py-4 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-900 dark:text-white font-medium">소재</span>
            <button className="flex items-center text-primary text-sm font-medium">
              {selectedMaterial}
              <span className="material-symbols-rounded text-gray-400 text-lg ml-1">expand_more</span>
            </button>
          </div>

          {/* 패턴 */}
          <div className="flex justify-between items-center py-4 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-900 dark:text-white font-medium">패턴</span>
            <button className="flex items-center text-primary text-sm font-medium">
              {selectedPattern}
              <span className="material-symbols-rounded text-gray-400 text-lg ml-1">expand_more</span>
            </button>
          </div>

          {/* 사이즈 */}
          <div className="flex justify-between items-center py-4 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-900 dark:text-white font-medium">사이즈</span>
            <button className="flex items-center text-gray-400 dark:text-gray-500 text-sm">
              {size || '사이즈를 입력해주세요'}
              <span className="material-symbols-rounded text-gray-400 text-lg ml-1">expand_more</span>
            </button>
          </div>

          {/* 세부 정보 */}
          <div className="flex justify-between items-start py-4">
            <span className="text-gray-900 dark:text-white font-medium mt-1">세부 정보</span>
            <button className="flex items-center text-right">
              <div className="flex flex-col items-end">
                <span className="text-primary text-sm font-medium">클래식 / 레귤러 / 긴소매</span>
                <span className="text-primary text-sm font-medium">+ 더보기</span>
              </div>
              <span className="material-symbols-rounded text-gray-400 text-lg ml-2">chevron_right</span>
            </button>
          </div>

          {/* 저장 버튼 */}
          <div className="pt-6 pb-4">
            <button 
              onClick={handleSave}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
            >
              저장
            </button>
          </div>
        </div>
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
