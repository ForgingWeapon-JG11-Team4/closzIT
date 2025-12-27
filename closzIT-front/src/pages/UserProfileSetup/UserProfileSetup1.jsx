import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const UserProfileSetup1 = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    birthday: '',
    location: ''
  });
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const { name, gender, birthday, location } = formData;
    setIsValid(name.trim() !== '' && gender !== '' && birthday !== '' && location !== '');
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNext = () => {
    if (isValid) {
      navigate('/setup/profile2');
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-sans text-text-light dark:text-text-dark antialiased transition-colors duration-200 min-h-screen">
      <div className="max-w-md mx-auto min-h-screen relative flex flex-col px-6 py-8">
        <header className="flex items-center justify-between mb-8">
          <button 
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-text-light dark:text-text-dark transition-colors" 
            type="button"
            onClick={() => navigate(-1)}
          >
            <span className="material-icons-round text-2xl">arrow_back</span>
          </button>
          <div className="flex space-x-2">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
          </div>
          <div className="w-8"></div> 
        </header>

        <main className="flex-grow flex flex-col space-y-8">
          <div>
            <h1 className="text-2xl font-bold mb-2">기본 정보를 입력해주세요</h1>
            <p className="text-text-muted-light dark:text-text-muted-dark text-sm">더 정확한 스타일 추천을 위해 필요해요.</p>
          </div>

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2 group">
              <label 
                className="block text-sm font-medium text-text-light dark:text-text-dark group-focus-within:text-primary transition-colors" 
                htmlFor="name"
              >
                너의... 이름은?
              </label>
              <div className="relative">
                <input 
                  className="block w-full px-4 py-3 rounded-xl border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent transition shadow-sm outline-none border" 
                  id="name" 
                  name="name" 
                  placeholder="닉네임을 입력해주세요" 
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                />
                <span className="absolute right-3 top-3 text-gray-400 dark:text-gray-500 material-icons-round">edit</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-light dark:text-text-dark">
                성별을 알려주세요
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="cursor-pointer relative">
                  <input 
                    className="peer sr-only" 
                    name="gender" 
                    type="radio" 
                    value="female"
                    checked={formData.gender === 'female'}
                    onChange={handleChange}
                  />
                  <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark text-center hover:bg-gray-50 dark:hover:bg-gray-800 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-all duration-200">
                    <span className="block text-sm font-medium">여성</span>
                  </div>
                </label>
                <label className="cursor-pointer relative">
                  <input 
                    className="peer sr-only" 
                    name="gender" 
                    type="radio" 
                    value="male"
                    checked={formData.gender === 'male'}
                    onChange={handleChange}
                  />
                  <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark text-center hover:bg-gray-50 dark:hover:bg-gray-800 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-all duration-200">
                    <span className="block text-sm font-medium">남성</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-2 group">
              <label 
                className="block text-sm font-medium text-text-light dark:text-text-dark group-focus-within:text-primary transition-colors" 
                htmlFor="birthday"
              >
                생일을 알려주세요
              </label>
              <div className="relative">
                <input 
                  className="block w-full px-4 py-3 rounded-xl border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent transition shadow-sm outline-none border appearance-none" 
                  id="birthday" 
                  name="birthday" 
                  type="date"
                  value={formData.birthday}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-light dark:text-text-dark">
                한국에 살고 있나요?
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex-1 cursor-pointer">
                  <input 
                    className="peer sr-only" 
                    name="location" 
                    type="radio" 
                    value="yes"
                    checked={formData.location === 'yes'}
                    onChange={handleChange}
                  />
                  <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark text-center hover:bg-gray-50 dark:hover:bg-gray-800 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-all duration-200 flex items-center justify-center space-x-2">
                    <span className="material-icons-round text-base">check_circle_outline</span>
                    <span className="text-sm font-medium">네</span>
                  </div>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input 
                    className="peer sr-only" 
                    name="location" 
                    type="radio" 
                    value="no"
                    checked={formData.location === 'no'}
                    onChange={handleChange}
                  />
                  <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark text-center hover:bg-gray-50 dark:hover:bg-gray-800 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-all duration-200 flex items-center justify-center space-x-2">
                    <span className="material-icons-round text-base">highlight_off</span>
                    <span className="text-sm font-medium">아니요</span>
                  </div>
                </label>
              </div>
            </div>
          </form>
        </main>

        <footer className="mt-8 mb-4 sticky bottom-4 z-10 w-full">
          <button 
            className={`w-full font-bold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center space-x-2 transition-all duration-200
              ${isValid 
                ? 'bg-primary hover:bg-green-600 text-white hover:shadow-xl transform active:scale-[0.98]' 
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'}`}
            disabled={!isValid}
            onClick={handleNext}
          >
            <span>다음</span>
            <span className="material-icons-round">arrow_forward</span>
          </button>
        </footer>
      </div>
    </div>
  );
};

export default UserProfileSetup1;
