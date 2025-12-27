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
                        어울리는 톤을 골라주세요
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="cursor-pointer group">
                            <input className="peer sr-only" name="tone" type="radio"/>
                            <div className="p-4 rounded-xl border-2 border-transparent bg-input-bg-light dark:bg-input-bg-dark peer-checked:border-brand-blue peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20 transition-all text-center">
                                <span className="block text-sm font-medium mb-1">웜톤 (Warm)</span>
                                <div className="flex justify-center gap-1">
                                    <span className="w-3 h-3 rounded-full bg-orange-200"></span>
                                    <span className="w-3 h-3 rounded-full bg-yellow-200"></span>
                                </div>
                            </div>
                        </label>
                        <label className="cursor-pointer group">
                            <input className="peer sr-only" name="tone" type="radio"/>
                            <div className="p-4 rounded-xl border-2 border-transparent bg-input-bg-light dark:bg-input-bg-dark peer-checked:border-brand-blue peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20 transition-all text-center">
                                <span className="block text-sm font-medium mb-1">쿨톤 (Cool)</span>
                                <div className="flex justify-center gap-1">
                                    <span className="w-3 h-3 rounded-full bg-pink-200"></span>
                                    <span className="w-3 h-3 rounded-full bg-blue-200"></span>
                                </div>
                            </div>
                        </label>
                    </div>
                    <p className="text-xs text-brand-blue hover:text-blue-600 cursor-pointer mt-1 text-right">
                        <u>잘 모르겠어요</u>
                    </p>
                </section>

                <section className="space-y-3">
                    <label className="block text-base font-semibold text-gray-800 dark:text-gray-200" htmlFor="bodyType">
                        체형을 알려주세요
                    </label>
                    <div className="relative">
                        <select className="w-full bg-input-bg-light dark:bg-input-bg-dark border-0 rounded-xl py-4 pl-4 pr-10 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-blue appearance-none cursor-pointer" id="bodyType">
                            <option disabled selected value="">선택해주세요</option>
                            <option value="invertedTriangle">역삼각형 (Inverted Triangle)</option>
                            <option value="triangle">삼각형 (Triangle)</option>
                            <option value="rectangle">직사각형 (Rectangle)</option>
                            <option value="hourglass">모래시계 (Hourglass)</option>
                            <option value="oval">타원형 (Oval)</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                            <span className="material-icons-round">expand_more</span>
                        </div>
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
