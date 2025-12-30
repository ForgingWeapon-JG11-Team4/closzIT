import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// 등록 옵션
const registerOptions = [
  {
    id: 'album',
    name: '앨범',
    icon: 'collections',
    iconColor: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20'
  },
  {
    id: 'camera',
    name: '카메라',
    icon: 'photo_camera',
    iconColor: 'text-gray-600 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-700'
  },
  {
    id: 'website',
    name: '웹 사이트',
    icon: 'language',
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20'
  },
  {
    id: 'barcode',
    name: '바코드',
    icon: 'qr_code_scanner',
    iconColor: 'text-primary dark:text-primary',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20'
  },
];

const RegisterPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const handleOptionClick = (optionId) => {
    if (optionId === 'album') {
      // 앨범 선택 시 파일 입력 트리거
      fileInputRef.current?.click();
    } else {
      // 다른 옵션은 기존 로직 유지
      navigate('/labeling', { state: { source: optionId } });
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      // 이미지 미리보기용 URL 생성
      const imageUrl = URL.createObjectURL(file);
      // 라벨링 페이지로 이동하며 이미지 정보 전달
      navigate('/labeling', {
        state: {
          source: 'album',
          imageUrl: imageUrl,
          imageFile: file
        }
      });
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans flex flex-col">
      {/* Hidden file input for album selection */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-40">
        <button
          onClick={() => navigate('/main')}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="material-symbols-rounded text-2xl text-gray-600 dark:text-gray-300">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">등록하기</h1>
        <div className="w-10 h-10"></div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8 flex flex-col items-center justify-center pb-28">
        <div className="grid grid-cols-2 gap-5 w-full max-w-sm">
          {registerOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleOptionClick(option.id)}
              className="group flex flex-col items-center justify-center aspect-square bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-lg transition-all active:scale-95 border border-gray-100 dark:border-gray-700 hover:border-primary/30 dark:hover:border-primary/30"
            >
              <div className={`w-16 h-16 mb-4 flex items-center justify-center rounded-full ${option.bgColor} shadow-sm group-hover:scale-110 transition-transform`}>
                <span className={`material-symbols-rounded text-4xl ${option.iconColor}`}>
                  {option.icon}
                </span>
              </div>
              <span className="text-base font-medium text-gray-700 dark:text-gray-200 group-hover:text-primary transition-colors">
                {option.name}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-10 text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed">
          옷을 등록하고<br />나만의 코디를 추천받아보세요 ✨
        </p>
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
          <button className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-gray-900">
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

export default RegisterPage;
