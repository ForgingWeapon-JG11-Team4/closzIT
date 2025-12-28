import React from 'react';
import { useNavigate } from 'react-router-dom';

const UserProfileSetup2 = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-background-light dark:bg-background-dark font-sans text-text-light dark:text-text-dark antialiased transition-colors duration-200 min-h-screen">
      <div className="max-w-md mx-auto min-h-screen relative flex flex-col px-6 py-8">
        <header className="flex items-center justify-between mb-8">
            <button 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                onClick={() => navigate(-1)}
            >
                <span className="material-icons-round text-3xl">chevron_left</span>
            </button>
            <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-600"></div>
                <div className="w-8 h-2 rounded-full bg-brand-blue"></div>
                <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-600"></div>
            </div>
            <div className="w-8"></div> 
        </header>

        <main className="flex-grow flex flex-col">
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                    조금 더 <br/>
                    자세히 알려주세요
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    더 정확한 스타일 추천을 위해 필요해요.
                </p>
            </div>

            <div className="flex-1 space-y-8 pb-24">
                <section className="space-y-3">
                    <label className="block text-base font-semibold text-gray-800 dark:text-gray-200" htmlFor="hairColor">
                        머리 색깔을 알려주세요
                    </label>
                    <div className="relative">
                        <select className="w-full bg-input-bg-light dark:bg-input-bg-dark border-0 rounded-xl py-4 pl-4 pr-10 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-blue appearance-none cursor-pointer" id="hairColor">
                            <option disabled selected value="">선택해주세요</option>
                            <option value="black">검정색 (Black)</option>
                            <option value="darkbrown">진한 갈색 (Dark Brown)</option>
                            <option value="lightbrown">밝은 갈색 (Light Brown)</option>
                            <option value="blonde">금발 (Blonde)</option>
                            <option value="other">기타 (Other)</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                            <span className="material-icons-round">expand_more</span>
                        </div>
                    </div>
                </section>

                <section className="space-y-3">
                    <label className="block text-base font-semibold text-gray-800 dark:text-gray-200">
                        퍼스널 컬러를 선택해주세요
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {/* 봄 웜톤 */}
                        <label className="cursor-pointer group">
                            <input className="peer sr-only" name="tone" type="radio" value="spring"/>
                            <div className="p-4 rounded-xl border-2 border-transparent bg-input-bg-light dark:bg-input-bg-dark peer-checked:border-orange-400 peer-checked:bg-orange-50 dark:peer-checked:bg-orange-900/20 transition-all text-center">
                                <span className="text-2xl mb-1 block">🌸</span>
                                <span className="block text-sm font-medium mb-1">봄 웜톤</span>
                                <span className="block text-xs text-gray-500">따뜻함 · 밝음</span>
                                <div className="flex justify-center gap-1 mt-2">
                                    <span className="w-3 h-3 rounded-full bg-orange-300"></span>
                                    <span className="w-3 h-3 rounded-full bg-yellow-300"></span>
                                    <span className="w-3 h-3 rounded-full bg-coral-300" style={{backgroundColor: '#FF7F7F'}}></span>
                                </div>
                            </div>
                        </label>
                        
                        {/* 여름 쿨톤 */}
                        <label className="cursor-pointer group">
                            <input className="peer sr-only" name="tone" type="radio" value="summer"/>
                            <div className="p-4 rounded-xl border-2 border-transparent bg-input-bg-light dark:bg-input-bg-dark peer-checked:border-pink-400 peer-checked:bg-pink-50 dark:peer-checked:bg-pink-900/20 transition-all text-center">
                                <span className="text-2xl mb-1 block">🌊</span>
                                <span className="block text-sm font-medium mb-1">여름 쿨톤</span>
                                <span className="block text-xs text-gray-500">시원함 · 부드러움</span>
                                <div className="flex justify-center gap-1 mt-2">
                                    <span className="w-3 h-3 rounded-full bg-pink-300"></span>
                                    <span className="w-3 h-3 rounded-full bg-blue-200"></span>
                                    <span className="w-3 h-3 rounded-full bg-purple-200"></span>
                                </div>
                            </div>
                        </label>
                        
                        {/* 가을 웜톤 */}
                        <label className="cursor-pointer group">
                            <input className="peer sr-only" name="tone" type="radio" value="autumn"/>
                            <div className="p-4 rounded-xl border-2 border-transparent bg-input-bg-light dark:bg-input-bg-dark peer-checked:border-amber-600 peer-checked:bg-amber-50 dark:peer-checked:bg-amber-900/20 transition-all text-center">
                                <span className="text-2xl mb-1 block">🍂</span>
                                <span className="block text-sm font-medium mb-1">가을 웜톤</span>
                                <span className="block text-xs text-gray-500">따뜻함 · 깊음</span>
                                <div className="flex justify-center gap-1 mt-2">
                                    <span className="w-3 h-3 rounded-full bg-amber-600"></span>
                                    <span className="w-3 h-3 rounded-full bg-orange-700"></span>
                                    <span className="w-3 h-3 rounded-full bg-yellow-700"></span>
                                </div>
                            </div>
                        </label>
                        
                        {/* 겨울 쿨톤 */}
                        <label className="cursor-pointer group">
                            <input className="peer sr-only" name="tone" type="radio" value="winter"/>
                            <div className="p-4 rounded-xl border-2 border-transparent bg-input-bg-light dark:bg-input-bg-dark peer-checked:border-blue-600 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20 transition-all text-center">
                                <span className="text-2xl mb-1 block">❄️</span>
                                <span className="block text-sm font-medium mb-1">겨울 쿨톤</span>
                                <span className="block text-xs text-gray-500">선명함 · 차가움</span>
                                <div className="flex justify-center gap-1 mt-2">
                                    <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                                    <span className="w-3 h-3 rounded-full bg-fuchsia-500"></span>
                                    <span className="w-3 h-3 rounded-full bg-gray-900"></span>
                                </div>
                            </div>
                        </label>
                    </div>
                    
                    {/* 퍼스널 컬러 진단 CTA */}
                    <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 border border-pink-100 dark:border-pink-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">💡</span>
                                <span className="text-sm text-gray-700 dark:text-gray-300">내 퍼스널 컬러가 뭔지 모르겠다면?</span>
                            </div>
                            <button className="text-sm font-bold text-pink-500 hover:text-pink-600 flex items-center gap-1">
                                진단받기
                                <span className="material-icons-round text-base">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </section>

                <section className="space-y-3">
                    <label className="block text-base font-semibold text-gray-800 dark:text-gray-200">
                        체형을 알려주세요
                    </label>
                    
                    {/* 가로 스크롤 캐러셀 */}
                    <div 
                        className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 hide-scrollbar"
                        style={{ scrollSnapType: 'x mandatory' }}
                    >
                        {/* 잘 모르겠어요 */}
                        <label className="flex-shrink-0 cursor-pointer" style={{ scrollSnapAlign: 'start' }}>
                            <input className="peer sr-only" name="bodyType" type="radio" value="unknown"/>
                            <div className="w-28 p-3 rounded-xl border-2 border-transparent bg-input-bg-light dark:bg-input-bg-dark peer-checked:border-brand-blue peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20 transition-all text-center">
                                <img 
                                    src={require('../../assets/bodyTypes/잘모르겠어요.png')} 
                                    alt="잘 모르겠어요" 
                                    className="w-full h-24 object-contain mb-2"
                                />
                                <span className="block text-xs font-medium text-gray-700 dark:text-gray-300">잘 모르겠어요</span>
                            </div>
                        </label>

                        {/* 삼각형 */}
                        <label className="flex-shrink-0 cursor-pointer" style={{ scrollSnapAlign: 'start' }}>
                            <input className="peer sr-only" name="bodyType" type="radio" value="triangle"/>
                            <div className="w-28 p-3 rounded-xl border-2 border-transparent bg-input-bg-light dark:bg-input-bg-dark peer-checked:border-brand-blue peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20 transition-all text-center">
                                <img 
                                    src={require('../../assets/bodyTypes/삼각형.png')} 
                                    alt="삼각형" 
                                    className="w-full h-24 object-contain mb-2"
                                />
                                <span className="block text-xs font-medium text-gray-700 dark:text-gray-300">삼각형</span>
                            </div>
                        </label>

                        {/* 역삼각형 */}
                        <label className="flex-shrink-0 cursor-pointer" style={{ scrollSnapAlign: 'start' }}>
                            <input className="peer sr-only" name="bodyType" type="radio" value="invertedTriangle"/>
                            <div className="w-28 p-3 rounded-xl border-2 border-transparent bg-input-bg-light dark:bg-input-bg-dark peer-checked:border-brand-blue peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20 transition-all text-center">
                                <img 
                                    src={require('../../assets/bodyTypes/역삼각형.png')} 
                                    alt="역삼각형" 
                                    className="w-full h-24 object-contain mb-2"
                                />
                                <span className="block text-xs font-medium text-gray-700 dark:text-gray-300">역삼각형</span>
                            </div>
                        </label>

                        {/* 둥근형 */}
                        <label className="flex-shrink-0 cursor-pointer" style={{ scrollSnapAlign: 'start' }}>
                            <input className="peer sr-only" name="bodyType" type="radio" value="oval"/>
                            <div className="w-28 p-3 rounded-xl border-2 border-transparent bg-input-bg-light dark:bg-input-bg-dark peer-checked:border-brand-blue peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20 transition-all text-center">
                                <img 
                                    src={require('../../assets/bodyTypes/둥근형.png')} 
                                    alt="둥근형" 
                                    className="w-full h-24 object-contain mb-2"
                                />
                                <span className="block text-xs font-medium text-gray-700 dark:text-gray-300">둥근형</span>
                            </div>
                        </label>

                        {/* 직사각형 */}
                        <label className="flex-shrink-0 cursor-pointer" style={{ scrollSnapAlign: 'start' }}>
                            <input className="peer sr-only" name="bodyType" type="radio" value="rectangle"/>
                            <div className="w-28 p-3 rounded-xl border-2 border-transparent bg-input-bg-light dark:bg-input-bg-dark peer-checked:border-brand-blue peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20 transition-all text-center">
                                <img 
                                    src={require('../../assets/bodyTypes/직사각형.png')} 
                                    alt="직사각형" 
                                    className="w-full h-24 object-contain mb-2"
                                />
                                <span className="block text-xs font-medium text-gray-700 dark:text-gray-300">직사각형</span>
                            </div>
                        </label>

                        {/* 사다리꼴형 */}
                        <label className="flex-shrink-0 cursor-pointer" style={{ scrollSnapAlign: 'start' }}>
                            <input className="peer sr-only" name="bodyType" type="radio" value="trapezoid"/>
                            <div className="w-28 p-3 rounded-xl border-2 border-transparent bg-input-bg-light dark:bg-input-bg-dark peer-checked:border-brand-blue peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20 transition-all text-center">
                                <img 
                                    src={require('../../assets/bodyTypes/사다리꼴형.png')} 
                                    alt="사다리꼴형" 
                                    className="w-full h-24 object-contain mb-2"
                                />
                                <span className="block text-xs font-medium text-gray-700 dark:text-gray-300">사다리꼴형</span>
                            </div>
                        </label>
                    </div>
                </section>

                <section className="space-y-3">
                    <label className="block text-base font-semibold text-gray-800 dark:text-gray-200">
                        선호하는 스타일을 알려주세요
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {['캐주얼', '미니멀', '스트릿', '아메카지', '포멀', '비즈니스', '빈티지'].map((style) => (
                            <label key={style} className="cursor-pointer">
                                <input className="peer sr-only" type="checkbox"/>
                                <div className="px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 peer-checked:bg-brand-blue peer-checked:text-white peer-checked:border-brand-blue transition-all text-sm font-medium">
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
                  className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  onClick={() => navigate('/main')}
                >
                    다음
                    <span className="material-icons-round text-lg">arrow_forward</span>
                </button>
             </div>
        </footer>
      </div>
    </div>
  );
};

export default UserProfileSetup2;
