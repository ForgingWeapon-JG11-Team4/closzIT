import React, { useRef, useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SharedHeader from '../../components/SharedHeader';
import BottomNav from '../../components/BottomNav';

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
  const location = useLocation();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // FeedPage에서 넘어온 경우 returnTo 정보 가져오기
  const returnTo = location.state?.returnTo;

  // 선택된 이미지들 관리
  const [selectedImages, setSelectedImages] = useState([]);



  // 카메라 존재 여부 확인 및 카메라 실행
  const handleCameraClick = useCallback(async () => {
    try {
      // 카메라 존재 여부 확인
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');

      if (!hasCamera) {
        alert('연동된 카메라가 없습니다');
        return;
      }

      // 카메라가 있으면 카메라 input 클릭
      cameraInputRef.current?.click();
    } catch (error) {
      // mediaDevices API를 지원하지 않거나 권한이 없는 경우
      // 일단 카메라 input을 시도
      if (navigator.mediaDevices) {
        try {
          // 카메라 접근 권한 요청
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          // 권한이 있으면 스트림 종료하고 카메라 input 클릭
          stream.getTracks().forEach(track => track.stop());
          cameraInputRef.current?.click();
        } catch (mediaError) {
          if (mediaError.name === 'NotFoundError' || mediaError.name === 'DevicesNotFoundError') {
            alert('연동된 카메라가 없습니다');
          } else if (mediaError.name === 'NotAllowedError' || mediaError.name === 'PermissionDeniedError') {
            alert('카메라 접근 권한이 필요합니다');
          } else {
            alert('연동된 카메라가 없습니다');
          }
        }
      } else {
        alert('연동된 카메라가 없습니다');
      }
    }
  }, []);



  const handleOptionClick = (optionId) => {
    if (optionId === 'album') {
      fileInputRef.current?.click();
    } else if (optionId === 'camera') {
      handleCameraClick();
    } else if (optionId === 'barcode') {
      navigate('/register/barcode');
    } else if (optionId === 'website') {
      navigate('/web-capture');
    } else {
      navigate('/labeling', { state: { source: optionId } });
    }
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      // 이미지가 1개만 선택된 경우 바로 labeling 페이지로 이동
      if (files.length === 1) {
        const file = files[0];
        const imageUrl = URL.createObjectURL(file);
        navigate('/labeling', {
          state: {
            source: 'album',
            imageUrl: imageUrl,
            imageFile: file
          }
        });
      } else {
        // 2개 이상 선택된 경우 미리보기 화면 표시
        const imageObjects = files.map(file => ({
          file,
          imageUrl: URL.createObjectURL(file),
          id: `${Date.now()}_${Math.random()}` // 고유 ID 생성
        }));

        setSelectedImages(imageObjects);
      }
    }
    // input 초기화 (같은 파일 다시 선택 가능하도록)
    event.target.value = '';
  };

  // 카메라로 촬영한 이미지 처리
  const handleCameraCapture = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      navigate('/labeling', {
        state: {
          source: 'camera',
          imageUrl: imageUrl,
          imageFile: file
        }
      });
    }
    // input 초기화
    event.target.value = '';
  };

  // 이미지 제거
  const removeImage = (id) => {
    setSelectedImages(prev => {
      const updated = prev.filter(img => img.id !== id);
      // 제거된 이미지의 URL 해제
      const removed = prev.find(img => img.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.imageUrl);
      }
      return updated;
    });
  };

  // 분석 시작
  const startAnalysis = () => {
    if (selectedImages.length === 0) return;

    navigate('/labeling', {
      state: {
        source: 'album',
        images: selectedImages.map(img => ({
          imageUrl: img.imageUrl,
          imageFile: img.file
        }))
      }
    });
  };

  // 이미지 선택 모드인지 확인
  const isSelectionMode = selectedImages.length > 0;

  return (
    <div
      className="min-h-screen font-sans flex flex-col"
      style={{ backgroundColor: '#FAF8F5' }}
    >
      {/* Hidden file input for album selection (파일/앨범만 선택 - capture 속성 없음) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
      />

      {/* Hidden file input for camera capture (직접 카메라 실행) */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleCameraCapture}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Shared Header */}
      <SharedHeader
        title={isSelectionMode ? "이미지 확인" : "등록하기"}
        showBackButton
        onBackClick={() => {
          if (isSelectionMode) {
            // 이미지 선택 모드에서는 선택 취소
            selectedImages.forEach(img => URL.revokeObjectURL(img.imageUrl));
            setSelectedImages([]);
          } else {
            // 일반 모드에서는 이전 페이지로
            navigate(returnTo || '/main');
          }
        }}
      />

      {/* Main Content */}
      <main className="flex-1 px-6 py-8 flex flex-col items-center justify-center pb-28">
        {!isSelectionMode ? (
          <>
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
          </>
        ) : (
          <>
            {/* 이미지 미리보기 섹션 */}
            <div className="w-full max-w-2xl">
              <div className="text-center mb-6">
                <p className="text-lg font-semibold" style={{ color: '#2C2C2C' }}>
                  선택한 이미지 {selectedImages.length}개
                </p>
                <p className="text-sm mt-2" style={{ color: '#6B6B6B' }}>
                  이미지를 확인하고 분석을 시작하세요
                </p>
              </div>

              {/* 이미지 그리드 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 max-h-[60vh] overflow-y-auto">
                {selectedImages.map((img, index) => (
                  <div
                    key={img.id}
                    className="relative aspect-square rounded-2xl overflow-hidden"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 248, 245, 0.98) 100%)',
                      border: '1px solid rgba(212, 175, 55, 0.2)',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    <img
                      src={img.imageUrl}
                      alt={`선택한 이미지 ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* 이미지 순서 번호 */}
                    <div
                      className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: '#D4AF37' }}
                    >
                      {index + 1}
                    </div>

                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                    >
                      <span className="material-symbols-rounded text-xl" style={{ color: '#dc2626' }}>
                        close
                      </span>
                    </button>
                  </div>
                ))}
              </div>

              {/* 액션 버튼들 */}
              <div className="flex gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-3 rounded-xl font-semibold transition-colors"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 248, 245, 0.98) 100%)',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    color: '#D4AF37'
                  }}
                >
                  이미지 추가
                </button>
                <button
                  onClick={startAnalysis}
                  className="flex-1 py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #D4AF37 0%, #C9A962 100%)',
                    boxShadow: '0 4px 20px rgba(212, 175, 55, 0.3)'
                  }}
                >
                  분석 시작
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Global Bottom Navigation */}
      <BottomNav />


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
