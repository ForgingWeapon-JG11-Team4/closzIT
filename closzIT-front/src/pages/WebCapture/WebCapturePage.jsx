import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SharedHeader from '../../components/SharedHeader';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

const WebCapturePage = () => {
    const navigate = useNavigate();

    // 상태 관리
    const [url, setUrl] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [scannedImages, setScannedImages] = useState([]);
    const [selectedImages, setSelectedImages] = useState(new Set());
    const [showResults, setShowResults] = useState(false);
    const [error, setError] = useState('');

    // URL 유효성 검사
    const isValidUrl = (urlString) => {
        try {
            new URL(urlString);
            return true;
        } catch {
            return false;
        }
    };

    // 자동스캔 실행
    const handleAutoScan = async () => {
        if (!url.trim()) {
            setError('URL을 입력해주세요.');
            return;
        }

        if (!isValidUrl(url)) {
            setError('올바른 URL 형식이 아닙니다. (예: https://www.musinsa.com/...)');
            return;
        }

        setError('');
        setIsScanning(true);

        try {
            const response = await axios.post(`${API_BASE_URL}/crawl/images`, {
                url: url.trim(),
            });

            const images = response.data.images || [];
            setScannedImages(images);
            setSelectedImages(new Set());

            if (images.length === 0) {
                setError('이 페이지에서 의상 이미지를 찾지 못했습니다.');
            } else {
                setShowResults(true);
            }
        } catch (err) {
            console.error('스캔 오류:', err);
            setError('이미지 스캔에 실패했습니다. URL을 확인하고 다시 시도해주세요.');
        } finally {
            setIsScanning(false);
        }
    };

    // 이미지 선택 토글
    const toggleImageSelection = (index) => {
        const newSelected = new Set(selectedImages);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedImages(newSelected);
    };

    // 선택된 이미지들로 분석 시작
    const handleAnalyzeSelected = async () => {
        if (selectedImages.size === 0) {
            setError('분석할 이미지를 선택해주세요.');
            return;
        }

        setIsScanning(true); // 로딩 표시

        try {
            const selectedImageUrls = Array.from(selectedImages).map(
                (index) => scannedImages[index].src
            );

            // 백엔드 프록시를 통해 이미지 다운로드 (CORS 우회)
            const imageFiles = await Promise.all(
                selectedImageUrls.map(async (imgUrl, idx) => {
                    try {
                        // 백엔드에서 이미지 다운로드
                        const response = await axios.post(`${API_BASE_URL}/crawl/download-image`, {
                            url: imgUrl,
                        });

                        const { base64, mimeType } = response.data;

                        // Base64를 Blob으로 변환
                        const byteCharacters = atob(base64);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const blob = new Blob([byteArray], { type: mimeType });

                        // File 객체 생성
                        const extension = mimeType.split('/')[1] || 'jpg';
                        const fileName = `clothing_${idx + 1}.${extension}`;
                        return new File([blob], fileName, { type: mimeType });
                    } catch (err) {
                        console.warn(`Failed to download image ${idx}:`, err);
                        return null;
                    }
                })
            );

            // 유효한 파일만 필터링
            const validFiles = imageFiles.filter(f => f !== null);

            if (validFiles.length === 0) {
                setError('이미지를 불러올 수 없습니다. 다시 시도해주세요.');
                setIsScanning(false);
                return;
            }

            if (validFiles.length === 1) {
                navigate('/labeling', {
                    state: {
                        source: 'website',
                        imageUrl: URL.createObjectURL(validFiles[0]),
                        imageFile: validFiles[0],
                    },
                });
            } else {
                navigate('/labeling', {
                    state: {
                        source: 'website',
                        images: validFiles.map((file) => ({
                            imageUrl: URL.createObjectURL(file),
                            imageFile: file,
                        })),
                    },
                });
            }
        } catch (err) {
            console.error('이미지 처리 오류:', err);
            setError('이미지 처리 중 오류가 발생했습니다.');
        } finally {
            setIsScanning(false);
        }
    };

    // 뒤로가기
    const handleBack = () => {
        if (showResults) {
            setShowResults(false);
            setError('');
        } else {
            navigate('/register');
        }
    };

    // 스캔 결과 화면
    if (showResults) {
        return (
            <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAF8F5' }}>
                <SharedHeader title="의상 선택" showBackButton onBackClick={() => setShowResults(false)} />

                {/* 안내 */}
                <div className="px-4 py-3 text-center" style={{ background: 'rgba(212, 175, 55, 0.1)' }}>
                    <p className="text-sm" style={{ color: '#4A4A4A' }}>
                        분석할 의상 이미지를 선택하세요 ({selectedImages.size}개 선택됨)
                    </p>
                </div>

                {/* 이미지 그리드 */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-2 gap-3">
                        {scannedImages.map((img, index) => (
                            <div
                                key={index}
                                onClick={() => toggleImageSelection(index)}
                                className={`relative rounded-xl overflow-hidden cursor-pointer transition-all ${selectedImages.has(index) ? 'ring-3 ring-[#D4AF37] scale-[0.98]' : ''
                                    }`}
                                style={{
                                    aspectRatio: '3/4',
                                    background: 'white',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                }}
                            >
                                <img src={img.src} alt={img.alt || '의상 이미지'} className="w-full h-full object-cover" />
                                {/* 체크박스 */}
                                <div
                                    className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${selectedImages.has(index) ? 'bg-[#D4AF37]' : 'bg-white/80'
                                        }`}
                                    style={{ border: selectedImages.has(index) ? 'none' : '2px solid #D4AF37' }}
                                >
                                    {selectedImages.has(index) && (
                                        <span className="material-symbols-rounded text-white text-sm">check</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 하단 버튼 - 항상 화면 하단에 고정 */}
                <div className="sticky bottom-0 px-4 py-4 flex gap-3" style={{ background: 'white', borderTop: '1px solid rgba(212, 175, 55, 0.2)', boxShadow: '0 -4px 12px rgba(0,0,0,0.05)' }}>
                    <button
                        onClick={() => setShowResults(false)}
                        className="flex-1 py-3 rounded-xl font-semibold"
                        style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)', color: '#D4AF37' }}
                    >
                        다시 스캔
                    </button>
                    <button
                        onClick={handleAnalyzeSelected}
                        disabled={selectedImages.size === 0}
                        className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #C9A962 100%)' }}
                    >
                        분석하기 ({selectedImages.size})
                    </button>
                </div>
            </div>
        );
    }

    // 메인 화면 (URL 입력)
    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAF8F5' }}>
            <SharedHeader title="웹에서 가져오기" showBackButton onBackClick={handleBack} />

            {/* 로딩 오버레이 */}
            {isScanning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 flex flex-col items-center">
                        <div className="animate-spin w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full mb-3" />
                        <p className="text-sm font-medium" style={{ color: '#4A4A4A' }}>
                            이미지 스캔 중...
                        </p>
                        <p className="text-xs text-gray-400 mt-1">잠시만 기다려주세요</p>
                    </div>
                </div>
            )}

            {/* 메인 콘텐츠 */}
            <div className="flex-1 flex flex-col p-4">
                {/* 가이드 카드 */}
                <div
                    className="rounded-2xl p-5 mb-4"
                    style={{
                        background: 'white',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    }}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #C9A962 100%)' }}
                        >
                            <span className="material-symbols-rounded text-white text-2xl">language</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-lg" style={{ color: '#4A4A4A' }}>
                                쇼핑몰 URL로 가져오기
                            </h2>
                            <p className="text-xs text-gray-500">무신사, 29CM, 지그재그 등</p>
                        </div>
                    </div>

                    {/* 안내 단계 */}
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <div
                                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                                style={{ background: '#D4AF37' }}
                            >
                                1
                            </div>
                            <p className="text-sm" style={{ color: '#666' }}>
                                원하는 쇼핑몰에서 <span className="font-semibold">상품 페이지</span>로 이동하세요
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div
                                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                                style={{ background: '#D4AF37' }}
                            >
                                2
                            </div>
                            <p className="text-sm" style={{ color: '#666' }}>
                                주소창의 <span className="font-semibold">URL을 복사</span>하여 아래에 붙여넣기
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div
                                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                                style={{ background: '#D4AF37' }}
                            >
                                3
                            </div>
                            <p className="text-sm" style={{ color: '#666' }}>
                                <span className="font-semibold">스캔하기</span>를 눌러 의상 이미지를 가져오세요
                            </p>
                        </div>
                    </div>
                </div>

                {/* URL 입력 영역 */}
                <div
                    className="rounded-2xl p-4 mb-4"
                    style={{
                        background: 'white',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    }}
                >
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#4A4A4A' }}>
                        상품 페이지 URL
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => {
                                setUrl(e.target.value);
                                setError('');
                            }}
                            placeholder="https://www.musinsa.com/app/goods/..."
                            className="flex-1 px-4 py-3 rounded-xl border text-sm"
                            style={{
                                borderColor: error ? '#ef4444' : 'rgba(212, 175, 55, 0.3)',
                                outline: 'none',
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#D4AF37';
                                e.target.style.boxShadow = '0 0 0 2px rgba(212, 175, 55, 0.2)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = error ? '#ef4444' : 'rgba(212, 175, 55, 0.3)';
                                e.target.style.boxShadow = 'none';
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleAutoScan();
                                }
                            }}
                        />
                        <button
                            onClick={async () => {
                                try {
                                    const text = await navigator.clipboard.readText();
                                    setUrl(text);
                                    setError('');
                                } catch {
                                    alert('클립보드 접근이 허용되지 않았습니다.');
                                }
                            }}
                            className="px-4 py-3 rounded-xl flex items-center justify-center"
                            style={{
                                background: 'rgba(212, 175, 55, 0.1)',
                                border: '1px solid rgba(212, 175, 55, 0.3)',
                                color: '#D4AF37',
                            }}
                            title="붙여넣기"
                        >
                            <span className="material-symbols-rounded text-lg">content_paste</span>
                        </button>
                    </div>

                    {/* 에러 메시지 */}
                    {error && (
                        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                            <span className="material-symbols-rounded text-sm">error</span>
                            {error}
                        </p>
                    )}
                </div>

                {/* 스페이서 */}
                <div className="flex-1" />
            </div>

            {/* 하단 스캔 버튼 */}
            <div
                className="px-4 py-4"
                style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(250,248,245,1) 100%)',
                    borderTop: '1px solid rgba(212, 175, 55, 0.2)',
                }}
            >
                <button
                    onClick={handleAutoScan}
                    disabled={isScanning || !url.trim()}
                    className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                    style={{
                        background: 'linear-gradient(135deg, #D4AF37 0%, #C9A962 100%)',
                        color: 'white',
                        boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)',
                    }}
                >
                    <span className="material-symbols-rounded text-xl">image_search</span>
                    스캔하기
                </button>
            </div>
        </div>
    );
};

export default WebCapturePage;
