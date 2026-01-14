import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserStore } from '../../stores/userStore';

const UserProfileSetup3 = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';
  const fileInputRef = useRef(null);
  const { fetchUser } = useUserStore();

  // State 관리
  const [fullBodyImage, setFullBodyImage] = useState(null);
  const [originalFile, setOriginalFile] = useState(null); // 원본 파일 객체
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Edit 모드일 때 기존 전신 사진 불러오기
  useEffect(() => {
    if (isEditMode) {
      const fetchExistingImage = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        try {
          const userData = await fetchUser();
          if (userData && userData.fullBodyImage) {
            setFullBodyImage(userData.fullBodyImage);
            setImagePreview(userData.fullBodyImage);
          }
        } catch (error) {
          console.error('Failed to fetch user data:', error);
        }
      };

      fetchExistingImage();
    }
  }, [isEditMode, fetchUser]);

  // 이미지 압축 함수 - 세로(height) 기준으로 리사이즈
  const compressImage = (file, maxHeight = 1200, quality = 0.8) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 세로 기준으로 리사이즈 (전신 사진은 세로가 더 길기 때문)
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

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

    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다');
      return;
    }

    try {
      // 미리보기용 base64 생성 (압축은 프리뷰용만)
      const compressedImage = await compressImage(file, 1200, 0.8);
      setFullBodyImage(compressedImage);
      setImagePreview(compressedImage);
      setOriginalFile(file); // 원본 파일 저장
      setError('');
    } catch (err) {
      console.error('Image compression error:', err);
      setError('이미지 처리 중 오류가 발생했습니다');
    }
  };

  const handleCameraCapture = () => {
    fileInputRef.current.click();
  };

  const handleRemoveImage = () => {
    setFullBodyImage(null);
    setImagePreview(null);
    setOriginalFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSkip = async () => {
    if (isEditMode) {
      navigate('/mypage');
    } else {
      await submitProfile(null);
    }
  };

  const submitProfile = async (imageData) => {
    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

      // Edit 모드일 때는 전신 사진만 업데이트 (FormData 직접 업로드)
      if (isEditMode) {
        if (originalFile) {
          // 새 파일이 있으면 FormData로 직접 업로드
          const formData = new FormData();
          formData.append('image', originalFile);

          const response = await fetch(`${backendUrl}/user/fullbody-image`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (!response.ok) {
            throw new Error('전신 사진 저장에 실패했습니다');
          }
        }
        // 기존 S3 URL이며 변경 없으면 아무 작업 필요 없음

        navigate('/mypage');
      } else {
        // 신규 등록 모드
        const setup1Data = JSON.parse(localStorage.getItem('userProfile') || '{}');
        const setup2Data = JSON.parse(localStorage.getItem('userProfileSetup2') || '{}');

        let birthday = null;
        if (setup1Data.birthday) {
          const { year, month, day } = setup1Data.birthday;
          birthday = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }

        // 전신 사진이 있으면 먼저 S3에 업로드
        if (originalFile) {
          const formData = new FormData();
          formData.append('image', originalFile);

          const uploadResponse = await fetch(`${backendUrl}/user/fullbody-image`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (!uploadResponse.ok) {
            console.warn('전신 사진 업로드 실패, 프로필만 저장합니다.');
          }
        }

        const profileData = {
          name: setup1Data.name,
          gender: setup1Data.gender,
          birthday,
          province: setup1Data.province,
          city: setup1Data.city,
          hairColor: setup2Data.hairColor,
          personalColor: setup2Data.personalColor,
          height: setup2Data.height,
          weight: setup2Data.weight,
          bodyType: setup2Data.bodyType,
          preferredStyles: setup2Data.preferredStyles || [],
          // fullBodyImage는 이미 S3 업로드 시 저장됨
        };

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

        localStorage.removeItem('userProfile');
        localStorage.removeItem('userProfileSetup2');

        navigate('/main');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.message || '오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    await submitProfile(fullBodyImage);
  };

  return (
    <div className="min-h-screen bg-cream dark:bg-[#1A1918]">
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-warm border-b border-gold-light/20">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => navigate(isEditMode ? '/mypage' : '/setup2')}
            className="w-10 h-10 flex items-center justify-center -ml-2 rounded-full hover:bg-gold-light/20 transition-colors"
          >
            <span className="material-symbols-rounded text-charcoal dark:text-cream">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold text-charcoal dark:text-cream">
            {isEditMode ? '전신 사진 수정' : '회원정보 입력'}
          </h1>
          <div className="w-10"></div>
        </div>

        {/* 프로그레스 바 - edit 모드에서는 숨김 */}
        {!isEditMode && (
          <div className="h-1 bg-gold-light/20">
            <div className="h-full bg-gold transition-all duration-300" style={{ width: '100%' }}></div>
          </div>
        )}
      </header>

      {/* 메인 컨텐츠 */}
      <main className="pt-16 pb-32 px-6">
        <div className="max-w-md mx-auto space-y-8 mt-6">
          {/* 안내 텍스트 */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-charcoal dark:text-cream">
              전신 사진을 등록해주세요
            </h2>
            <p className="text-sm text-charcoal-light dark:text-cream-dark">
              가상 피팅에 사용될 사진이에요
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-gold/10 text-gold font-medium">
                선택사항
              </span>
              <span className="text-xs text-charcoal-light/60 dark:text-cream-dark/60">
                나중에 등록해도 괜찮아요
              </span>
            </div>
          </div>

          {/* 이미지 업로드 영역 */}
          <section className="space-y-4">
            {!imagePreview ? (
              <div
                onClick={handleCameraCapture}
                className="w-full aspect-[3/4] max-w-xs mx-auto rounded-2xl border-2 border-dashed border-gold-light/40 bg-warm-white dark:bg-charcoal/30 flex flex-col items-center justify-center cursor-pointer hover:border-gold hover:bg-gold/5 transition-all"
              >
                <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-rounded text-4xl text-gold">person</span>
                </div>
                <span className="text-sm font-medium text-charcoal dark:text-cream">
                  사진을 선택해주세요
                </span>
                <span className="text-xs text-charcoal-light/60 dark:text-cream-dark/60 mt-1">
                  전신이 보이는 사진을 권장해요
                </span>
              </div>
            ) : (
              <div className="relative w-full aspect-[3/4] max-w-xs mx-auto rounded-2xl overflow-hidden shadow-lifted bg-charcoal/5 dark:bg-charcoal/30">
                <img
                  src={imagePreview}
                  alt="전신 사진 미리보기"
                  className="w-full h-full object-contain"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <span className="material-symbols-rounded text-white text-lg">close</span>
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
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-warm-white dark:bg-charcoal/50 border border-gold-light/30 text-charcoal dark:text-cream hover:bg-gold/10 hover:border-gold transition-colors"
                >
                  <span className="material-symbols-rounded text-lg text-gold">photo_library</span>
                  <span className="text-sm font-medium">앨범에서</span>
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current.setAttribute('capture', 'environment');
                    fileInputRef.current.click();
                  }}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-warm-white dark:bg-charcoal/50 border border-gold-light/30 text-charcoal dark:text-cream hover:bg-gold/10 hover:border-gold transition-colors"
                >
                  <span className="material-symbols-rounded text-lg text-gold">photo_camera</span>
                  <span className="text-sm font-medium">촬영하기</span>
                </button>
              </div>
            )}
          </section>

          {/* 안내 사항 */}
          <div className="bg-gold/10 border border-gold/20 rounded-xl p-4">
            <div className="flex gap-3">
              <span className="text-gold text-xl">💡</span>
              <div className="space-y-1">
                <p className="text-sm font-medium text-charcoal dark:text-cream">
                  좋은 결과를 위한 팁
                </p>
                <ul className="text-xs text-charcoal-light dark:text-cream-dark space-y-1 list-disc list-inside">
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
      <div className="fixed bottom-0 left-0 right-0 p-4 glass-warm border-t border-gold-light/20 safe-area-pb">
        <div className="max-w-md mx-auto flex gap-3">
          <button
            onClick={handleSkip}
            disabled={isSubmitting}
            className="flex-1 py-4 rounded-2xl font-bold text-charcoal dark:text-cream bg-warm-white dark:bg-charcoal/50 border border-gold-light/30 hover:bg-gold/10 transition-colors disabled:opacity-50"
          >
            건너뛰기
          </button>
          <button
            onClick={handleComplete}
            disabled={isSubmitting || !fullBodyImage}
            className={`flex-1 py-4 rounded-2xl font-bold text-warm-white transition-all ${fullBodyImage
              ? 'btn-premium hover:shadow-xl'
              : 'bg-charcoal-light/30 cursor-not-allowed'
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
