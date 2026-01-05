import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const UserProfileSetup3 = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // State 관리
  const [fullBodyImage, setFullBodyImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 이미지 압축 함수
  const compressImage = (file, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 비율 유지하면서 리사이즈
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Base64로 변환
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // 파일 선택 핸들러
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다');
      return;
    }

    try {
      // 이미지 압축 (최대 800px, 품질 70%)
      const compressedImage = await compressImage(file, 800, 0.7);
      setFullBodyImage(compressedImage);
      setImagePreview(compressedImage);
      setError('');
    } catch (err) {
      console.error('Image compression error:', err);
      setError('이미지 처리 중 오류가 발생했습니다');
    }
  };

  // 카메라 촬영 핸들러
  const handleCameraCapture = () => {
    fileInputRef.current.click();
  };

  // 이미지 삭제
  const handleRemoveImage = () => {
    setFullBodyImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 건너뛰기
  const handleSkip = async () => {
    await submitProfile(null);
  };

  // 프로필 제출
  const submitProfile = async (imageData) => {
    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const setup1Data = JSON.parse(localStorage.getItem('userProfile') || '{}');
      const setup2Data = JSON.parse(localStorage.getItem('userProfileSetup2') || '{}');

      // 생년월일 포맷 변환
      let birthday = null;
      if (setup1Data.birthday) {
        const { year, month, day } = setup1Data.birthday;
        birthday = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }

      const profileData = {
        // Setup 1 데이터
        name: setup1Data.name,
        gender: setup1Data.gender,
        birthday,
        province: setup1Data.province,
        city: setup1Data.city,
        // Setup 2 데이터
        hairColor: setup2Data.hairColor,
        personalColor: setup2Data.personalColor,
        height: setup2Data.height,
        weight: setup2Data.weight,
        bodyType: setup2Data.bodyType,
        preferredStyles: setup2Data.preferredStyles || [],
        // Setup 3 데이터
        fullBodyImage: imageData
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

      // localStorage 정리
      localStorage.removeItem('userProfile');
      localStorage.removeItem('userProfileSetup2');

      // 메인 페이지로 이동
      navigate('/main');
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.message || '오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 완료 버튼 클릭
  const handleComplete = async () => {
    await submitProfile(fullBodyImage);
  };

  return (
    <div className="min-h-screen bg-page-bg-light dark:bg-page-bg-dark">
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface-light dark:bg-surface-dark border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => navigate('/setup2')}
            className="w-10 h-10 flex items-center justify-center -ml-2"
          >
            <span className="material-icons-round text-gray-600 dark:text-gray-300">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">회원정보 입력</h1>
          <div className="w-10"></div>
        </div>

        {/* 프로그레스 바 */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div className="h-full bg-brand-blue transition-all duration-300" style={{ width: '100%' }}></div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="pt-16 pb-32 px-6">
        <div className="max-w-md mx-auto space-y-8 mt-6">
          {/* 안내 텍스트 */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              전신 사진을 등록해주세요
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              가상 피팅에 사용될 사진이에요
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                선택사항
              </span>
              <span className="text-xs text-gray-400">
                나중에 등록해도 괜찮아요
              </span>
            </div>
          </div>

          {/* 이미지 업로드 영역 */}
          <section className="space-y-4">
            {!imagePreview ? (
              <div
                onClick={handleCameraCapture}
                className="w-full aspect-[3/4] max-w-xs mx-auto rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center cursor-pointer hover:border-brand-blue hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all"
              >
                <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
                  <span className="material-icons-round text-4xl text-gray-400">person</span>
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  사진을 선택해주세요
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  전신이 보이는 사진을 권장해요
                </span>
              </div>
            ) : (
              <div className="relative w-full aspect-[3/4] max-w-xs mx-auto rounded-2xl overflow-hidden shadow-lg">
                <img
                  src={imagePreview}
                  alt="전신 사진 미리보기"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <span className="material-icons-round text-white text-lg">close</span>
                </button>
              </div>
            )}

            {/* 파일 입력 (숨김) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* 업로드 버튼들 */}
            {!imagePreview && (
              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                <button
                  onClick={() => {
                    fileInputRef.current.removeAttribute('capture');
                    fileInputRef.current.click();
                  }}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="material-icons-round text-lg">photo_library</span>
                  <span className="text-sm font-medium">앨범에서</span>
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current.setAttribute('capture', 'environment');
                    fileInputRef.current.click();
                  }}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="material-icons-round text-lg">photo_camera</span>
                  <span className="text-sm font-medium">촬영하기</span>
                </button>
              </div>
            )}
          </section>

          {/* 안내 사항 */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
            <div className="flex gap-3">
              <span className="text-amber-500 text-xl">💡</span>
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  좋은 결과를 위한 팁
                </p>
                <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
                  <li>전신이 모두 나오도록 촬영해주세요</li>
                  <li>정면을 바라보고 자연스러운 자세로</li>
                  <li>밝은 조명에서 촬영하면 더 좋아요</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm text-center">
              {error}
            </div>
          )}
        </div>
      </main>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface-light dark:bg-surface-dark border-t border-gray-100 dark:border-gray-800 safe-area-bottom">
        <div className="max-w-md mx-auto flex gap-3">
          <button
            onClick={handleSkip}
            disabled={isSubmitting}
            className="flex-1 py-4 rounded-xl font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            건너뛰기
          </button>
          <button
            onClick={handleComplete}
            disabled={isSubmitting || !fullBodyImage}
            className={`flex-1 py-4 rounded-xl font-bold text-white transition-all ${fullBodyImage
              ? 'bg-brand-blue hover:bg-blue-600'
              : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
              } disabled:opacity-50`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                저장 중...
              </span>
            ) : '완료'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileSetup3;
