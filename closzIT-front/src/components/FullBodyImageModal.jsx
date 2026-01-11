import React, { useState, useRef, useEffect } from 'react';

const FullBodyImageModal = ({ isOpen, onClose, onSave, initialImage }) => {
  const fileInputRef = useRef(null);
  const [fullBodyImage, setFullBodyImage] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);  // ✅ 추가! 
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 파일 선택 수정
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다');
      return;
    }

    try {
      const compressedImage = await compressImage(file, 1200, 0.8);
      setFullBodyImage(compressedImage);
      setImagePreview(compressedImage);
      setOriginalFile(file);  // ✅ 원본 파일 저장! 
      setError('');
    } catch (err) {
      setError('이미지 처리 중 오류가 발생했습니다');
    }
  };

  // 저장 로직 수정
  const handleSave = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const backendUrl = process. env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

      // ✅ UserProfileSetup3와 동일하게 수정
      if (originalFile) {
        const formData = new FormData();
        formData.append('image', originalFile);

        const response = await fetch(`${backendUrl}/user/fullbody-image`, {  // ✅ 올바른 엔드포인트
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
            // Content-Type은 자동으로 multipart/form-data로 설정됨
          },
          body: formData  // ✅ FormData로 전송
        });

        if (!response.ok) {
          throw new Error('전신 사진 저장에 실패했습니다');
        }
      }

      onSave && onSave();
      onClose();
    } catch (err) {
      setError(err. message || '오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 이미지 삭제도 수정
  const handleRemoveImage = () => {
    setFullBodyImage(null);
    setImagePreview(null);
    setOriginalFile(null);  // ✅ 추가
    if (fileInputRef.current) {
      fileInputRef. current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 animate-fadeIn"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] bg-cream dark:bg-[#1A1918] rounded-t-3xl shadow-2xl animate-slideUp overflow-hidden flex flex-col">
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1.5 rounded-full bg-charcoal-light/30 dark:bg-cream-dark/30" />
        </div>
        
        {/* Header */}
        <div className="px-6 pb-4 flex items-center justify-between border-b border-gold-light/20">
          <h2 className="text-xl font-bold text-charcoal dark:text-cream">전신 사진 수정</h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gold-light/20 transition-colors"
          >
            <span className="material-symbols-rounded text-2xl text-charcoal dark:text-cream">close</span>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {imagePreview ? (
            <div className="flex flex-col items-center">
              <div className="w-48 h-64 rounded-2xl overflow-hidden border-2 border-gold-light/30 bg-charcoal/5 dark:bg-charcoal/30 mb-4">
                <img 
                  src={imagePreview} 
                  alt="전신 사진 미리보기" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-gold/10 text-gold rounded-xl text-sm font-medium border border-gold/20 hover:bg-gold/20 transition-colors"
                >
                  <span className="material-symbols-rounded text-base">photo_camera</span>
                  다시 선택
                </button>
                <button
                  onClick={handleRemoveImage}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <span className="material-symbols-rounded text-base">delete</span>
                  삭제
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-12 rounded-2xl border-2 border-dashed border-gold/30 bg-gold/5 hover:bg-gold/10 transition-colors flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center">
                <span className="material-symbols-rounded text-3xl text-gold">add_a_photo</span>
              </div>
              <div className="text-center">
                <p className="text-charcoal dark:text-cream font-medium">전신 사진 업로드</p>
                <p className="text-sm text-charcoal-light dark:text-cream-dark mt-1">탭하여 사진을 선택하세요</p>
              </div>
            </button>
          )}

          {/* Tips */}
          <div className="mt-6 p-4 bg-warm-white dark:bg-charcoal/30 rounded-xl">
            <p className="text-sm font-medium text-charcoal dark:text-cream mb-2">💡 좋은 전신 사진 팁</p>
            <ul className="text-xs text-charcoal-light dark:text-cream-dark space-y-1">
              <li>• 밝은 조명에서 촬영하세요</li>
              <li>• 전신이 다 보이도록 찍어주세요</li>
              <li>• 심플한 배경을 권장합니다</li>
            </ul>
          </div>
        </div>

        {/* Save Button */}
        <div className="p-6 border-t border-gold-light/20">
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="w-full py-4 btn-premium rounded-xl font-bold text-warm-white disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-warm-white/30 border-t-warm-white rounded-full animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <span className="material-symbols-rounded">check</span>
                저장하기
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default FullBodyImageModal;
