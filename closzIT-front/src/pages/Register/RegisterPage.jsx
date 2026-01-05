import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// 등록 옵션 - 화이트 & 골드 테마로 변경
const registerOptions = [
  {
    id: 'album',
    name: '앨범',
    icon: 'collections',
    iconColor: 'text-[#D4AF37]',
    bgColor: 'bg-gradient-to-br from-[#FFF9E6] to-[#FFF5D6]',
    borderColor: 'border-[#E8D5A3]'
  },
  {
    id: 'camera',
    name: '카메라',
    icon: 'photo_camera',
    iconColor: 'text-[#B8860B]',
    bgColor: 'bg-gradient-to-br from-[#FAF8F5] to-[#F5F0E8]',
    borderColor: 'border-[#E8D5A3]'
  },
  {
    id: 'website',
    name: '웹 사이트',
    icon: 'language',
    iconColor: 'text-[#C9A962]',
    bgColor: 'bg-gradient-to-br from-[#FFFAF0] to-[#FFF8E7]',
    borderColor: 'border-[#E8D5A3]'
  },
  {
    id: 'barcode',
    name: '바코드',
    icon: 'qr_code_scanner',
    iconColor: 'text-[#D4AF37]',
    bgColor: 'bg-gradient-to-br from-[#FFF9E6] to-[#FFF5D6]',
    borderColor: 'border-[#E8D5A3]'
  },
];

const RegisterPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const handleOptionClick = (optionId) => {
    if (optionId === 'album') {
      fileInputRef.current?.click();
    } else {
      navigate('/labeling', { state: { source: optionId } });
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
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
    <div 
      className="min-h-screen font-sans flex flex-col"
      style={{ backgroundColor: '#FAF8F5' }}
    >
      {/* Hidden file input for album selection */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Header - Glass Morphism with Gold accent */}
      <div 
        className="px-4 py-4 flex items-center justify-between sticky top-0 z-40"
        style={{
          background: 'rgba(250, 248, 245, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(212, 175, 55, 0.15)'
        }}
      >
        <button
          onClick={() => navigate('/main')}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #F5F0E8 0%, #FAF8F5 100%)',
            border: '1px solid rgba(212, 175, 55, 0.2)'
          }}
        >
          <span 
            className="material-symbols-rounded text-2xl"
            style={{ color: '#6B6B6B' }}
          >
            arrow_back
          </span>
        </button>
        
        <h1 
          className="text-xl font-bold"
          style={{ color: '#2C2C2C' }}
        >
          등록하기
        </h1>
        
        <div className="w-10 h-10"></div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8 flex flex-col items-center justify-center pb-28">
        
        {/* Title Section */}
        <div className="text-center mb-8">
          <p 
            className="text-sm leading-relaxed"
            style={{ color: '#6B6B6B' }}
          >
            원하는 방법으로 옷을 등록해보세요
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-2 gap-5 w-full max-w-sm">
          {registerOptions.map((option, index) => (
            <button
              key={option.id}
              onClick={() => handleOptionClick(option.id)}
              className="group flex flex-col items-center justify-center aspect-square rounded-3xl transition-all duration-300 active:scale-95 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 248, 245, 0.98) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                animation: `fadeIn 0.4s ease-out ${index * 0.1}s forwards`,
                opacity: 0
              }}
            >
              {/* Icon Container */}
              <div 
                className={`w-16 h-16 mb-4 flex items-center justify-center rounded-2xl ${option.bgColor} transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}
                style={{
                  border: `1px solid ${option.borderColor.replace('border-', '').replace('[', '').replace(']', '')}`,
                  boxShadow: '0 2px 8px rgba(212, 175, 55, 0.1)'
                }}
              >
                <span className={`material-symbols-rounded text-4xl ${option.iconColor}`}>
                  {option.icon}
                </span>
              </div>
              
              {/* Label */}
              <span 
                className="text-base font-semibold transition-colors duration-300"
                style={{ color: '#2C2C2C' }}
              >
                {option.name}
              </span>
              
              {/* Hover indicator */}
              <div 
                className="mt-2 w-8 h-1 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:w-12"
                style={{
                  background: 'linear-gradient(90deg, #D4AF37 0%, #E8D5A3 100%)'
                }}
              />
            </button>
          ))}
        </div>

        {/* Bottom Text */}
        <div 
          className="mt-10 text-center px-6 py-4 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(250, 248, 245, 0.8) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.1)'
          }}
        >
          <p 
            className="text-sm leading-relaxed"
            style={{ color: '#6B6B6B' }}
          >
            옷을 등록하고<br />
            <span style={{ color: '#D4AF37', fontWeight: 600 }}>나만의 코디</span>를 추천받아보세요
          </p>
        </div>
      </main>

      {/* Bottom Navigation - Matching MainPage style */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around px-4 z-50"
        style={{
          background: 'rgba(250, 248, 245, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(212, 175, 55, 0.15)',
          paddingBottom: 'env(safe-area-inset-bottom, 0)'
        }}
      >
        <button
          onClick={() => navigate('/main')}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] transition-colors duration-300"
          style={{ color: '#6B6B6B' }}
        >
          <span className="material-symbols-rounded text-[22px]">checkroom</span>
          <span className="text-[10px] font-semibold">내 옷장</span>
        </button>

        <button 
          className="flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
            color: '#FFFAF0',
            boxShadow: '0 4px 14px rgba(184, 134, 11, 0.35)'
          }}
        >
          <span className="material-symbols-rounded text-lg">add</span>
          <span className="text-sm font-semibold">의류 등록</span>
        </button>

        <button 
          className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] transition-colors duration-300 hover:text-[#D4AF37]"
          style={{ color: '#6B6B6B' }}
        >
          <span className="material-symbols-rounded text-[22px]">grid_view</span>
          <span className="text-[10px] font-semibold">SNS</span>
        </button>
      </div>

      {/* Keyframe Animation */}
      <style>{`
        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
      `}</style>
    </div>
  );
};

export default RegisterPage;
