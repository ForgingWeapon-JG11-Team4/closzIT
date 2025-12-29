import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const VirtualFittingTest = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const imageTypes = [
    { key: 'person', label: '👤 사람 이미지', icon: 'person' },
    { key: 'outer', label: '🧥 아우터', icon: 'diversity_1' },
    { key: 'top', label: '👕 상의', icon: 'checkroom' },
    { key: 'bottom', label: '👖 하의', icon: 'straighten' },
    { key: 'shoes', label: '👟 신발', icon: 'steps' },
  ];

  const handleFileChange = (type, file) => {
    if (file) {
      setFiles(prev => ({ ...prev, [type]: file }));

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews(prev => ({ ...prev, [type]: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const allFilesUploaded = imageTypes.every(({ key }) => files[key]);

  const handleSubmit = async () => {
    if (!allFilesUploaded) {
      setError('모든 이미지를 업로드해주세요.');
      return;
    }

    const formData = new FormData();
    imageTypes.forEach(({ key }) => {
      formData.append(key, files[key]);
    });

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('http://localhost:3000/api/fitting/virtual-try-on', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.message || '가상 피팅에 실패했습니다.');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('서버와의 통신 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between gap-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-40">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="material-symbols-rounded text-2xl text-gray-600 dark:text-gray-300">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">가상 피팅 테스트</h1>
        <div className="w-10"></div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-6 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>사용 방법:</strong> 각 항목에 맞는 이미지를 업로드하고 "가상 피팅 시작" 버튼을 클릭하세요.
          </p>
        </div>

        {/* Upload Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {imageTypes.map(({ key, label, icon }) => (
            <div key={key} className="relative">
              <input
                type="file"
                id={`upload-${key}`}
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(key, e.target.files[0])}
              />
              <label
                htmlFor={`upload-${key}`}
                className={`block aspect-square rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                  files[key]
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary'
                }`}
              >
                {previews[key] ? (
                  <div className="w-full h-full p-2">
                    <img
                      src={previews[key]}
                      alt={label}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                    <span className="material-symbols-rounded text-4xl mb-2">{icon}</span>
                    <span className="text-xs text-center px-2">{label}</span>
                  </div>
                )}
              </label>
              {files[key] && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="material-symbols-rounded text-white text-sm">check</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!allFilesUploaded || loading}
          className={`w-full h-14 rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
            !allFilesUploaded || loading
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-orange-300 via-pink-400 to-purple-500 text-white hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0'
          }`}
        >
          {loading ? (
            <>
              <span className="material-symbols-rounded animate-spin">progress_activity</span>
              처리 중...
            </>
          ) : (
            <>
              <span className="material-symbols-rounded">checkroom</span>
              가상 피팅 시작
            </>
          )}
        </button>

        {/* Loading Indicator */}
        {loading && (
          <div className="mt-6 text-center">
            <div className="inline-block w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-primary rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              가상 피팅 처리 중... 잠시만 기다려주세요.
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
              ✨ 결과
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              {result.imageUrl ? (
                <>
                  <img
                    src={result.imageUrl}
                    alt="Fitting Result"
                    className="w-full rounded-xl"
                  />
                  <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
                    처리 시간: {result.processingTime.total.toFixed(2)}초
                    (API 호출: {result.processingTime.apiCall.toFixed(2)}초)
                  </p>
                </>
              ) : (
                <>
                  {result.note && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded-lg mb-4">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        {result.note}
                      </p>
                    </div>
                  )}
                  <div className="prose dark:prose-invert max-w-none">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      AI 분석 결과:
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {result.description}
                    </p>
                  </div>
                  <p className="mt-6 text-sm text-gray-600 dark:text-gray-400 text-center border-t border-gray-200 dark:border-gray-700 pt-4">
                    처리 시간: {result.processingTime.total.toFixed(2)}초
                    (API 호출: {result.processingTime.apiCall.toFixed(2)}초)
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default VirtualFittingTest;
