import React, { useState, useEffect } from 'react';

const BatchTryOnPage = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  const token = localStorage.getItem('token');

  const [clothingList, setClothingList] = useState([]);
  const [selectedClothingIds, setSelectedClothingIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [totalTime, setTotalTime] = useState(0);

  // 옷 목록 로드
  useEffect(() => {
    fetchClothingList();
  }, []);

  const fetchClothingList = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/clothing`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('옷 목록 로드 실패');

      const data = await response.json();
      setClothingList(data.clothes || []);
    } catch (error) {
      console.error('Error fetching clothing list:', error);
      alert('옷 목록을 불러오는데 실패했습니다.');
    }
  };

  const toggleSelection = (clothingId) => {
    setSelectedClothingIds(prev =>
      prev.includes(clothingId)
        ? prev.filter(id => id !== clothingId)
        : [...prev, clothingId]
    );
  };

  const selectAll = () => {
    setSelectedClothingIds(clothingList.map(c => c.id));
  };

  const deselectAll = () => {
    setSelectedClothingIds([]);
  };

  const handleBatchTryOn = async () => {
    if (selectedClothingIds.length === 0) {
      alert('옷을 선택해주세요.');
      return;
    }

    setLoading(true);
    setResults([]);
    setTotalTime(0);

    try {
      const startTime = Date.now();

      const response = await fetch(`${backendUrl}/api/fitting/batch-tryon`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clothingIds: selectedClothingIds,
          denoiseSteps: 10,
          seed: 42,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '배치 처리 실패');
      }

      const data = await response.json();
      const elapsedTime = (Date.now() - startTime) / 1000;

      setResults(data.results || []);
      setTotalTime(elapsedTime);

      alert(`✅ 배치 처리 완료!\n${data.results.length}개 옷 처리 시간: ${elapsedTime.toFixed(2)}초`);
    } catch (error) {
      console.error('Error during batch try-on:', error);
      alert(`배치 처리 실패: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🚀 배치 가상 피팅 테스트
          </h1>
          <p className="text-gray-600">
            여러 옷을 한 번에 입어보고 성능을 테스트하세요
          </p>
        </div>

        {/* 옷 선택 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              옷 선택 ({selectedClothingIds.length}/{clothingList.length})
            </h2>
            <div className="space-x-2">
              <button
                onClick={selectAll}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                전체 선택
              </button>
              <button
                onClick={deselectAll}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                선택 해제
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {clothingList.map(clothing => (
              <div
                key={clothing.id}
                onClick={() => toggleSelection(clothing.id)}
                className={`
                  cursor-pointer rounded-lg border-2 p-2 transition-all
                  ${selectedClothingIds.includes(clothing.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                  }
                `}
              >
                <img
                  src={clothing.flattenImageUrl || clothing.imageUrl}
                  alt={clothing.category}
                  className="w-full h-32 object-cover rounded"
                />
                <p className="text-sm text-center mt-2 truncate">
                  {clothing.category} {clothing.subCategory}
                </p>
                {selectedClothingIds.includes(clothing.id) && (
                  <div className="text-center text-blue-600 font-bold mt-1">
                    ✓ 선택됨
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 실행 버튼 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <button
            onClick={handleBatchTryOn}
            disabled={loading || selectedClothingIds.length === 0}
            className={`
              w-full py-4 text-xl font-bold rounded-lg transition-all
              ${loading || selectedClothingIds.length === 0
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
              }
            `}
          >
            {loading
              ? '⏳ 처리 중...'
              : `🚀 ${selectedClothingIds.length}개 옷 배치 입어보기`
            }
          </button>

          {loading && (
            <div className="mt-4 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              <p className="mt-2 text-gray-600">
                배치 처리 중... 잠시만 기다려주세요
              </p>
            </div>
          )}
        </div>

        {/* 결과 표시 */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">
              📊 배치 처리 결과
            </h2>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-lg">
                <strong>총 처리 시간:</strong> {totalTime.toFixed(2)}초
              </p>
              <p className="text-lg">
                <strong>처리된 옷:</strong> {results.length}개
              </p>
              <p className="text-lg">
                <strong>평균 처리 시간:</strong> {(totalTime / results.length).toFixed(2)}초/개
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((result, index) => (
                <div
                  key={result.clothingId}
                  className={`
                    border rounded-lg p-4
                    ${result.success ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}
                  `}
                >
                  <h3 className="font-semibold mb-2">
                    옷 #{index + 1}
                  </h3>

                  {result.success && result.imageUrl ? (
                    <>
                      <img
                        src={result.imageUrl}
                        alt={`Result ${index + 1}`}
                        className="w-full h-64 object-cover rounded mb-2"
                      />
                      <p className="text-sm text-gray-600">
                        ⏱️ {result.processingTime.toFixed(2)}초
                      </p>
                    </>
                  ) : (
                    <div className="text-red-600">
                      ❌ 실패: {result.error || '알 수 없는 오류'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchTryOnPage;
