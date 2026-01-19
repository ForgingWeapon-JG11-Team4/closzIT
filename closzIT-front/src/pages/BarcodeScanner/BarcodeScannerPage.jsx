import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import SharedHeader from '../../components/SharedHeader';

const BarcodeScannerPage = () => {
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const html5QrcodeRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [scannedCode, setScannedCode] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);

  // 바코드 스캔 성공 시 처리
  const onScanSuccess = useCallback(async (decodedText) => {
    // 스캔 중복 방지
    if (scannedCode) return;

    setScannedCode(decodedText);
    setIsSearching(true);

    // 스캐너 일시 정지
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.pause();
      } catch (e) {
        console.log('Scanner pause error:', e);
      }
    }

    // Google 이미지 검색 수행
    try {
      await searchGoogleImages(decodedText);
    } catch (err) {
      console.error('Image search error:', err);
      setError('이미지 검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  }, [scannedCode]);

  // Google 이미지 검색
  const searchGoogleImages = async (barcode) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${backendUrl}/api/barcode/search-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ barcode }),
      });

      if (!response.ok) {
        throw new Error('이미지 검색 실패');
      }

      const data = await response.json();
      console.log('Barcode search response:', data);
      console.log('Images with base64:', data.images?.map(img => ({
        url: img.url?.substring(0, 50),
        hasBase64: !!img.base64,
        base64Length: img.base64?.length
      })));

      if (data.success && data.images && data.images.length > 0) {
        setSearchResults(data.images);
      } else {
        setError('해당 바코드로 옷 이미지를 찾지 못했습니다.');
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('이미지 검색 중 오류가 발생했습니다.');
      setSearchResults([]);
    }
  };

  // 이미지 선택 후 labeling 페이지로 이동 (base64 이미지 사용)
  const handleImageSelect = async (image) => {
    console.log('Selected image:', {
      url: image.url?.substring(0, 50),
      title: image.title,
      hasBase64: !!image.base64,
      base64Length: image.base64?.length,
      base64Preview: image.base64?.substring(0, 50)
    });

    let base64Data = image.base64;

    // base64가 없으면 프록시를 통해 실시간으로 가져오기 시도
    if (!base64Data && image.url) {
      console.log('Attempting to fetch image via proxy...');
      setError(null);
      setIsSearching(true);

      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
        const token = localStorage.getItem('accessToken');

        const response = await fetch(`${backendUrl}/api/barcode/fetch-base64`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: JSON.stringify({ imageUrl: image.url }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.base64) {
            base64Data = data.base64;
          }
        }
      } catch (err) {
        console.error('Proxy fetch error:', err);
      } finally {
        setIsSearching(false);
      }
    }

    if (!base64Data) {
      console.error('Image base64 is missing:', image);
      setError('이미지 데이터를 가져올 수 없습니다. 다른 이미지를 선택해주세요.');
      return;
    }

    setSelectedImage(image.url);

    // base64 데이터를 직접 전달 (File 객체는 navigate로 전달 불가)
    navigate('/labeling', {
      state: {
        source: 'barcode',
        imageBase64: base64Data, // base64 데이터 전달
        barcodeData: scannedCode,
      }
    });
  };

  // 다시 스캔하기
  const handleRescan = async () => {
    setScannedCode(null);
    setSearchResults([]);
    setError(null);
    setSelectedImage(null);

    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.resume();
      } catch (e) {
        // 재시작 필요
        startScanner();
      }
    }
  };

  // [TEST] 이미지 파일에서 바코드 스캔
  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const html5Qrcode = new Html5Qrcode('barcode-file-scanner');
      const result = await html5Qrcode.scanFile(file, true);

      // 스캔 성공
      setScannedCode(result);
      setIsSearching(true);
      setError(null);

      try {
        await searchGoogleImages(result);
      } catch (err) {
        console.error('Image search error:', err);
        setError('이미지 검색 중 오류가 발생했습니다.');
      } finally {
        setIsSearching(false);
      }
    } catch (err) {
      console.error('File scan error:', err);
      setError('이미지에서 바코드를 찾을 수 없습니다.');
    }

    // input 초기화
    event.target.value = '';
  };

  // 스캐너 시작
  const startScanner = useCallback(async () => {
    if (!scannerRef.current || html5QrcodeRef.current) return;

    try {
      const html5Qrcode = new Html5Qrcode('barcode-scanner');
      html5QrcodeRef.current = html5Qrcode;

      const config = {
        fps: 10,
        qrbox: { width: 280, height: 150 },
        aspectRatio: 1.777,
        formatsToSupport: [
          0,  // QR_CODE
          1,  // AZTEC
          2,  // CODABAR
          3,  // CODE_39
          4,  // CODE_93
          5,  // CODE_128
          6,  // DATA_MATRIX
          7,  // MAXICODE
          8,  // ITF
          9,  // EAN_13
          10, // EAN_8
          11, // PDF_417
          12, // RSS_14
          13, // RSS_EXPANDED
          14, // UPC_A
          15, // UPC_E
          16, // UPC_EAN_EXTENSION
        ],
      };

      await html5Qrcode.start(
        { facingMode: 'environment' },
        config,
        onScanSuccess,
        () => {} // 스캔 실패 시 무시 (계속 스캔)
      );

      setIsScanning(true);
      setError(null);
    } catch (err) {
      console.error('Scanner start error:', err);
      if (err.name === 'NotAllowedError') {
        setError('카메라 접근 권한이 필요합니다. 이미지로 바코드를 스캔해주세요.');
      } else if (err.name === 'NotFoundError') {
        setError('카메라를 찾을 수 없습니다. 이미지로 바코드를 스캔해주세요.');
      } else {
        setError('카메라를 시작할 수 없습니다. 이미지로 바코드를 스캔해주세요.');
      }
    }
  }, [onScanSuccess]);

  // 스캐너 정리
  const stopScanner = useCallback(async () => {
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current = null;
      } catch (e) {
        console.log('Scanner stop error:', e);
      }
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    // 컴포넌트 마운트 시 스캐너 시작
    const timer = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ backgroundColor: '#FAF8F5' }}>
      <SharedHeader
        title="바코드 스캔"
        showBackButton
        onBackClick={() => navigate('/register')}
      />

      {/* [TEST] 이미지 파일 스캔용 hidden input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />
      {/* [TEST] 파일 스캔용 hidden div */}
      <div id="barcode-file-scanner" style={{ display: 'none' }} />

      <main className="flex-1 flex flex-col items-center px-4 py-6">
        {/* 스캔 영역 */}
        {!scannedCode && (
          <>
            <div className="text-center mb-4">
              <p className="text-sm" style={{ color: '#6B6B6B' }}>
                옷의 바코드를 스캔해주세요
              </p>
            </div>

            <div
              className="relative w-full max-w-md rounded-2xl overflow-hidden"
              style={{
                aspectRatio: '16/9',
                background: '#000',
                border: '2px solid rgba(212, 175, 55, 0.3)',
              }}
            >
              <div
                id="barcode-scanner"
                ref={scannerRef}
                className="w-full h-full"
              />

              {/* 스캔 가이드 오버레이 */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className="w-[280px] h-[150px] border-2 rounded-lg"
                    style={{
                      borderColor: '#D4AF37',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    {/* 스캔 라인 애니메이션 */}
                    <div
                      className="absolute w-full h-0.5"
                      style={{
                        background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)',
                        animation: 'scanLine 2s linear infinite',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* [TEST] 이미지로 바코드 스캔 버튼 */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 w-full max-w-md py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #C9A962 100%)',
                color: 'white',
                boxShadow: '0 4px 20px rgba(212, 175, 55, 0.3)',
              }}
            >
              <span className="material-symbols-rounded text-xl">image</span>
              이미지에서 바코드 스캔 (테스트용)
            </button>

            {error && !scannedCode && (
              <div className="mt-4 w-full max-w-md p-4 rounded-xl bg-red-50 border border-red-200">
                <p className="text-sm text-red-600 text-center">{error}</p>
                <button
                  onClick={startScanner}
                  className="mt-2 w-full py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: '#D4AF37', color: 'white' }}
                >
                  카메라 다시 시도
                </button>
              </div>
            )}
          </>
        )}

        {/* 검색 중 */}
        {isSearching && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div
              className="w-12 h-12 border-4 rounded-full animate-spin"
              style={{ borderColor: '#E8D5A3', borderTopColor: '#D4AF37' }}
            />
            <p className="mt-4 text-sm" style={{ color: '#6B6B6B' }}>
              바코드 <span style={{ color: '#D4AF37', fontWeight: 600 }}>{scannedCode}</span> 검색 중...
            </p>
          </div>
        )}

        {/* 검색 결과 */}
        {scannedCode && !isSearching && (
          <div className="w-full max-w-md">
            <div className="text-center mb-4">
              <p className="text-sm" style={{ color: '#6B6B6B' }}>
                스캔된 바코드: <span style={{ color: '#D4AF37', fontWeight: 600 }}>{scannedCode}</span>
              </p>
            </div>

            {error && (
              <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}

            {searchResults.length > 0 && (
              <>
                <p className="text-center text-sm mb-4" style={{ color: '#6B6B6B' }}>
                  등록할 이미지를 선택해주세요
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {searchResults.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => handleImageSelect(image)}
                      className={`relative aspect-square rounded-xl overflow-hidden transition-all ${
                        selectedImage === image.url ? 'ring-2 ring-[#D4AF37] scale-95' : ''
                      }`}
                      style={{
                        border: '1px solid rgba(212, 175, 55, 0.2)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                      }}
                    >
                      <img
                        src={image.base64 || image.url}
                        alt={image.title || `검색 결과 ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.parentElement.style.display = 'none';
                        }}
                      />
                      {selectedImage === image.url && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <span className="material-symbols-rounded text-white text-3xl">
                            check_circle
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={handleRescan}
              className="mt-6 w-full py-3 rounded-xl font-semibold transition-colors"
              style={{
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 248, 245, 0.98) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                color: '#D4AF37',
              }}
            >
              다시 스캔하기
            </button>
          </div>
        )}
      </main>

      <style>{`
        @keyframes scanLine {
          0% { top: 0; }
          50% { top: calc(100% - 2px); }
          100% { top: 0; }
        }

        #barcode-scanner video {
          object-fit: cover !important;
        }
      `}</style>
    </div>
  );
};

export default BarcodeScannerPage;
