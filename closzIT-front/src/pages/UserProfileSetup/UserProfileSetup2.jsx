import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserStore } from '../../stores/userStore';

const UserProfileSetup2 = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';
  const { fetchUser } = useUserStore();
  
  // State 관리
  const [hairColor, setHairColor] = useState('');
  const [personalColor, setPersonalColor] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [preferredStyles, setPreferredStyles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 기존 사용자 데이터 불러오기
  useEffect(() => {
    const fetchExistingData = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      try {
        const userData = await fetchUser();
        if (userData) {
          if (userData.hairColor) setHairColor(userData.hairColor);
          if (userData.personalColor) setPersonalColor(userData.personalColor);
          if (userData.height) setHeight(String(userData.height));
          if (userData.weight) setWeight(String(userData.weight));
          if (userData.bodyType) setBodyType(userData.bodyType);
          if (userData.preferredStyles && userData.preferredStyles.length > 0) {
            setPreferredStyles(userData.preferredStyles);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };

    fetchExistingData();
  }, [fetchUser]);

  // 스타일 토글 핸들러
  const toggleStyle = (style) => {
    setPreferredStyles(prev => 
      prev.includes(style) 
        ? prev.filter(s => s !== style)
        : [...prev, style]
    );
  };

  // 폼 제출 핸들러 - Setup3로 이동
  const handleSubmit = () => {
    const setup2Data = {
      hairColor,
      personalColor,
      height: height ? parseFloat(height) : null,
      weight: weight ? parseFloat(weight) : null,
      bodyType,
      preferredStyles
    };
    localStorage.setItem('userProfileSetup2', JSON.stringify(setup2Data));
    
    if (isEditMode) {
      saveProfileToBackend();
    } else {
      navigate('/setup3');
    }
  };

  // 백엔드에 프로필 저장 (edit 모드용)
  const saveProfileToBackend = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const setup1Data = JSON.parse(localStorage.getItem('userProfile') || '{}');
      
      let birthday = null;
      if (setup1Data.birthday) {
        const { year, month, day } = setup1Data.birthday;
        birthday = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }

      const profileData = {
        name: setup1Data.name,
        gender: setup1Data.gender,
        birthday,
        province: setup1Data.province,
        city: setup1Data.city,
        hairColor,
        personalColor,
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        bodyType,
        preferredStyles
      };

      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        throw new Error('프로필 저장에 실패했습니다');
      }

      navigate('/mypage');
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.message || '오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-cream dark:bg-[#1A1918] font-sans text-charcoal dark:text-cream antialiased transition-colors duration-200 min-h-screen">
      <div className="max-w-md mx-auto min-h-screen relative flex flex-col px-6 py-8">
        <header className="flex items-center justify-between mb-8">
          <button 
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gold-light/20 transition-colors"
            onClick={() => navigate(-1)}
          >
            <span className="material-symbols-rounded text-2xl text-charcoal dark:text-cream">arrow_back</span>
          </button>
          <div className="flex gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-gold-light/40"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-gold"></div>
          </div>
          <div className="w-10"></div> 
        </header>

        <main className="flex-grow flex flex-col">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2 text-charcoal dark:text-cream">
              조금 더 <br/>
              자세히 알려주세요
            </h1>
            <p className="text-sm text-charcoal-light dark:text-cream-dark">
              더 정확한 스타일 추천을 위해 필요해요.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="flex-1 space-y-8 pb-24">
            <section className="space-y-3">
              <label className="block text-sm font-semibold text-charcoal dark:text-cream" htmlFor="hairColor">
                머리 색깔을 알려주세요
              </label>
              <div className="relative">
                <select 
                  className="w-full bg-warm-white dark:bg-charcoal/50 border border-gold-light/30 rounded-xl py-4 pl-4 pr-10 text-charcoal dark:text-cream focus:ring-2 focus:ring-gold appearance-none cursor-pointer" 
                  id="hairColor"
                  value={hairColor}
                  onChange={(e) => setHairColor(e.target.value)}
                >
                  <option disabled value="">선택해주세요</option>
                  <option value="black">검정색 (Black)</option>
                  <option value="darkbrown">진한 갈색 (Dark Brown)</option>
                  <option value="lightbrown">밝은 갈색 (Light Brown)</option>
                  <option value="blonde">금발 (Blonde)</option>
                  <option value="other">기타 (Other)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gold">
                  <span className="material-symbols-rounded">expand_more</span>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <label className="block text-sm font-semibold text-charcoal dark:text-cream">
                퍼스널 컬러를 선택해주세요
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* 봄 웜톤 */}
                <label className="cursor-pointer group">
                  <input 
                    className="peer sr-only" 
                    name="tone" 
                    type="radio" 
                    value="spring"
                    checked={personalColor === 'spring'}
                    onChange={(e) => setPersonalColor(e.target.value)}
                  />
                  <div className="p-4 rounded-xl border-2 border-transparent bg-warm-white dark:bg-charcoal/50 peer-checked:border-gold peer-checked:bg-gold/10 transition-all text-center">
                    <span className="text-2xl mb-1 block">🌸</span>
                    <span className="block text-sm font-medium mb-1">봄 웜톤</span>
                    <span className="block text-xs text-charcoal-light dark:text-cream-dark">따뜻함 · 밝음</span>
                    <div className="flex justify-center gap-1 mt-2">
                      <span className="w-3 h-3 rounded-full bg-orange-300"></span>
                      <span className="w-3 h-3 rounded-full bg-yellow-300"></span>
                      <span className="w-3 h-3 rounded-full" style={{backgroundColor: '#FF7F7F'}}></span>
                    </div>
                  </div>
                </label>
                
                {/* 여름 쿨톤 */}
                <label className="cursor-pointer group">
                  <input 
                    className="peer sr-only" 
                    name="tone" 
                    type="radio" 
                    value="summer"
                    checked={personalColor === 'summer'}
                    onChange={(e) => setPersonalColor(e.target.value)}
                  />
                  <div className="p-4 rounded-xl border-2 border-transparent bg-warm-white dark:bg-charcoal/50 peer-checked:border-gold peer-checked:bg-gold/10 transition-all text-center">
                    <span className="text-2xl mb-1 block">🌊</span>
                    <span className="block text-sm font-medium mb-1">여름 쿨톤</span>
                    <span className="block text-xs text-charcoal-light dark:text-cream-dark">시원함 · 부드러움</span>
                    <div className="flex justify-center gap-1 mt-2">
                      <span className="w-3 h-3 rounded-full bg-pink-300"></span>
                      <span className="w-3 h-3 rounded-full bg-blue-200"></span>
                      <span className="w-3 h-3 rounded-full bg-purple-200"></span>
                    </div>
                  </div>
                </label>
                
                {/* 가을 웜톤 */}
                <label className="cursor-pointer group">
                  <input 
                    className="peer sr-only" 
                    name="tone" 
                    type="radio" 
                    value="autumn"
                    checked={personalColor === 'autumn'}
                    onChange={(e) => setPersonalColor(e.target.value)}
                  />
                  <div className="p-4 rounded-xl border-2 border-transparent bg-warm-white dark:bg-charcoal/50 peer-checked:border-gold peer-checked:bg-gold/10 transition-all text-center">
                    <span className="text-2xl mb-1 block">🍂</span>
                    <span className="block text-sm font-medium mb-1">가을 웜톤</span>
                    <span className="block text-xs text-charcoal-light dark:text-cream-dark">따뜻함 · 깊음</span>
                    <div className="flex justify-center gap-1 mt-2">
                      <span className="w-3 h-3 rounded-full bg-amber-600"></span>
                      <span className="w-3 h-3 rounded-full bg-orange-700"></span>
                      <span className="w-3 h-3 rounded-full bg-yellow-700"></span>
                    </div>
                  </div>
                </label>
                
                {/* 겨울 쿨톤 */}
                <label className="cursor-pointer group">
                  <input 
                    className="peer sr-only" 
                    name="tone" 
                    type="radio" 
                    value="winter"
                    checked={personalColor === 'winter'}
                    onChange={(e) => setPersonalColor(e.target.value)}
                  />
                  <div className="p-4 rounded-xl border-2 border-transparent bg-warm-white dark:bg-charcoal/50 peer-checked:border-gold peer-checked:bg-gold/10 transition-all text-center">
                    <span className="text-2xl mb-1 block">❄️</span>
                    <span className="block text-sm font-medium mb-1">겨울 쿨톤</span>
                    <span className="block text-xs text-charcoal-light dark:text-cream-dark">선명함 · 차가움</span>
                    <div className="flex justify-center gap-1 mt-2">
                      <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                      <span className="w-3 h-3 rounded-full bg-fuchsia-500"></span>
                      <span className="w-3 h-3 rounded-full bg-gray-900"></span>
                    </div>
                  </div>
                </label>
              </div>
              
              {/* 퍼스널 컬러 진단 CTA */}
              <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-gold/10 to-gold-light/10 border border-gold/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💡</span>
                    <span className="text-sm text-charcoal dark:text-cream">내 퍼스널 컬러가 뭔지 모르겠다면?</span>
                  </div>
                  <button className="text-sm font-bold text-gold hover:text-gold-dark flex items-center gap-1">
                    진단받기
                    <span className="material-symbols-rounded text-base">arrow_forward</span>
                  </button>
                </div>
              </div>
            </section>

            {/* 키/몸무게 입력 (선택) */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="block text-sm font-semibold text-charcoal dark:text-cream">
                  키와 몸무게
                </label>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold font-medium">
                  선택
                </span>
              </div>
              <p className="text-sm text-charcoal-light dark:text-cream-dark -mt-1">
                더 정확한 스타일 추천을 위해 입력해주세요 (안 해도 괜찮아요!)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <input
                    type="number"
                    placeholder="키 (cm)"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-gold-light/30 bg-warm-white dark:bg-charcoal/50 text-charcoal dark:text-cream focus:outline-none focus:ring-2 focus:ring-gold transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-charcoal-light dark:text-cream-dark text-sm">cm</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="몸무게 (kg)"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-gold-light/30 bg-warm-white dark:bg-charcoal/50 text-charcoal dark:text-cream focus:outline-none focus:ring-2 focus:ring-gold transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-charcoal-light dark:text-cream-dark text-sm">kg</span>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <label className="block text-sm font-semibold text-charcoal dark:text-cream">
                체형을 알려주세요
              </label>
              
              {/* 가로 스크롤 캐러셀 */}
              <div 
                className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 hide-scrollbar"
                style={{ scrollSnapType: 'x mandatory' }}
              >
                {/* 잘 모르겠어요 */}
                <label className="flex-shrink-0 cursor-pointer" style={{ scrollSnapAlign: 'start' }}>
                  <input 
                    className="peer sr-only" 
                    name="bodyType" 
                    type="radio" 
                    value="unknown"
                    checked={bodyType === 'unknown'}
                    onChange={(e) => setBodyType(e.target.value)}
                  />
                  <div className="w-28 p-3 rounded-xl border-2 border-transparent bg-warm-white dark:bg-charcoal/50 peer-checked:border-gold peer-checked:bg-gold/10 transition-all text-center">
                    <img 
                      src={require('../../assets/bodyTypes/잘모르겠어요.png')} 
                      alt="잘 모르겠어요" 
                      className="w-full h-24 object-contain mb-2"
                    />
                    <span className="block text-xs font-medium text-charcoal dark:text-cream">잘 모르겠어요</span>
                  </div>
                </label>

                {/* 삼각형 */}
                <label className="flex-shrink-0 cursor-pointer" style={{ scrollSnapAlign: 'start' }}>
                  <input 
                    className="peer sr-only" 
                    name="bodyType" 
                    type="radio" 
                    value="triangle"
                    checked={bodyType === 'triangle'}
                    onChange={(e) => setBodyType(e.target.value)}
                  />
                  <div className="w-28 p-3 rounded-xl border-2 border-transparent bg-warm-white dark:bg-charcoal/50 peer-checked:border-gold peer-checked:bg-gold/10 transition-all text-center">
                    <img 
                      src={require('../../assets/bodyTypes/삼각형.png')} 
                      alt="삼각형" 
                      className="w-full h-24 object-contain mb-2"
                    />
                    <span className="block text-xs font-medium text-charcoal dark:text-cream">삼각형</span>
                  </div>
                </label>

                {/* 역삼각형 */}
                <label className="flex-shrink-0 cursor-pointer" style={{ scrollSnapAlign: 'start' }}>
                  <input 
                    className="peer sr-only" 
                    name="bodyType" 
                    type="radio" 
                    value="invertedTriangle"
                    checked={bodyType === 'invertedTriangle'}
                    onChange={(e) => setBodyType(e.target.value)}
                  />
                  <div className="w-28 p-3 rounded-xl border-2 border-transparent bg-warm-white dark:bg-charcoal/50 peer-checked:border-gold peer-checked:bg-gold/10 transition-all text-center">
                    <img 
                      src={require('../../assets/bodyTypes/역삼각형.png')} 
                      alt="역삼각형" 
                      className="w-full h-24 object-contain mb-2"
                    />
                    <span className="block text-xs font-medium text-charcoal dark:text-cream">역삼각형</span>
                  </div>
                </label>

                {/* 둥근형 */}
                <label className="flex-shrink-0 cursor-pointer" style={{ scrollSnapAlign: 'start' }}>
                  <input 
                    className="peer sr-only" 
                    name="bodyType" 
                    type="radio" 
                    value="oval"
                    checked={bodyType === 'oval'}
                    onChange={(e) => setBodyType(e.target.value)}
                  />
                  <div className="w-28 p-3 rounded-xl border-2 border-transparent bg-warm-white dark:bg-charcoal/50 peer-checked:border-gold peer-checked:bg-gold/10 transition-all text-center">
                    <img 
                      src={require('../../assets/bodyTypes/둥근형.png')} 
                      alt="둥근형" 
                      className="w-full h-24 object-contain mb-2"
                    />
                    <span className="block text-xs font-medium text-charcoal dark:text-cream">둥근형</span>
                  </div>
                </label>

                {/* 직사각형 */}
                <label className="flex-shrink-0 cursor-pointer" style={{ scrollSnapAlign: 'start' }}>
                  <input 
                    className="peer sr-only" 
                    name="bodyType" 
                    type="radio" 
                    value="rectangle"
                    checked={bodyType === 'rectangle'}
                    onChange={(e) => setBodyType(e.target.value)}
                  />
                  <div className="w-28 p-3 rounded-xl border-2 border-transparent bg-warm-white dark:bg-charcoal/50 peer-checked:border-gold peer-checked:bg-gold/10 transition-all text-center">
                    <img 
                      src={require('../../assets/bodyTypes/직사각형.png')} 
                      alt="직사각형" 
                      className="w-full h-24 object-contain mb-2"
                    />
                    <span className="block text-xs font-medium text-charcoal dark:text-cream">직사각형</span>
                  </div>
                </label>

                {/* 사다리꼴형 */}
                <label className="flex-shrink-0 cursor-pointer" style={{ scrollSnapAlign: 'start' }}>
                  <input 
                    className="peer sr-only" 
                    name="bodyType" 
                    type="radio" 
                    value="trapezoid"
                    checked={bodyType === 'trapezoid'}
                    onChange={(e) => setBodyType(e.target.value)}
                  />
                  <div className="w-28 p-3 rounded-xl border-2 border-transparent bg-warm-white dark:bg-charcoal/50 peer-checked:border-gold peer-checked:bg-gold/10 transition-all text-center">
                    <img 
                      src={require('../../assets/bodyTypes/사다리꼴형.png')} 
                      alt="사다리꼴형" 
                      className="w-full h-24 object-contain mb-2"
                    />
                    <span className="block text-xs font-medium text-charcoal dark:text-cream">사다리꼴형</span>
                  </div>
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <label className="block text-sm font-semibold text-charcoal dark:text-cream">
                선호하는 스타일을 알려주세요
              </label>
              <div className="flex flex-wrap gap-2">
                {['캐주얼', '미니멀', '스트릿', '아메카지', '포멀', '비즈니스', '빈티지'].map((style) => (
                  <label key={style} className="cursor-pointer">
                    <input 
                      className="peer sr-only" 
                      type="checkbox"
                      checked={preferredStyles.includes(style)}
                      onChange={() => toggleStyle(style)}
                    />
                    <div className="px-4 py-2.5 rounded-full border border-gold-light/30 bg-warm-white dark:bg-charcoal/50 text-charcoal dark:text-cream peer-checked:bg-gold peer-checked:text-warm-white peer-checked:border-gold transition-all text-sm font-medium">
                      {style}
                    </div>
                  </label>
                ))}
              </div>
            </section>
          </div>
        </main>

        <footer className="mt-8 mb-4 sticky bottom-4 z-10 w-full pointer-events-none">
          <div className="pointer-events-auto">
            <button 
              className={`w-full font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2
                ${isSubmitting 
                  ? 'bg-charcoal-light/30 cursor-not-allowed' 
                  : 'btn-premium hover:shadow-xl active:scale-[0.98]'
                }`}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  저장 중...
                </>
              ) : (
                <>
                  다음
                  <span className="material-symbols-rounded text-lg">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default UserProfileSetup2;
