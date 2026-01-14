// src/components/FollowerListModal.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const FollowerListModal = ({
    isOpen,
    followers = [],
    onClose,
    currentUserId
}) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleUserClick = (userId) => {
        // 본인 피드인 경우 이동하지 않음 (선택사항, 기획에 따라 다름)
        // 여기서는 클릭 시 해당 유저의 피드로 이동
        if (userId === currentUserId) {
            // 이미 본인이면 닫기만 함
            onClose();
            return;
        }
        navigate(`/feed/${userId}`);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center"
            onClick={onClose}
        >
            <div
                className="bg-warm-white dark:bg-charcoal rounded-3xl shadow-2xl w-[90%] max-w-sm overflow-hidden relative flex flex-col max-h-[60vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="p-5 border-b border-gold-light/20 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-charcoal dark:text-cream">
                        팔로워 <span className="text-gold">{followers.length}</span>
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full hover:bg-gold-light/10 flex items-center justify-center transition-colors"
                    >
                        <span className="material-symbols-rounded text-charcoal-light dark:text-cream-dark">close</span>
                    </button>
                </div>

                {/* 리스트 영역 */}
                <div className="overflow-y-auto flex-1 p-2">
                    {followers.length === 0 ? (
                        <div className="py-10 text-center text-charcoal-light dark:text-cream-dark">
                            <p>아직 팔로워가 없습니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {followers.map(follower => (
                                <div
                                    key={follower.id}
                                    onClick={() => handleUserClick(follower.id)}
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gold-light/10 dark:hover:bg-charcoal-light cursor-pointer transition-colors"
                                >
                                    {/* 프로필 이미지 */}
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-warm-white font-bold text-sm overflow-hidden flex-shrink-0">
                                        {follower.profileImage ? (
                                            <img
                                                src={(() => {
                                                    const cleanPath = follower.profileImage.trim();
                                                    if (cleanPath.startsWith('http')) return cleanPath;
                                                    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
                                                    const separator = !backendUrl.endsWith('/') && !cleanPath.startsWith('/') ? '/' : '';
                                                    return `${backendUrl}${separator}${cleanPath}`;
                                                })()}
                                                alt={follower.name}
                                                referrerPolicy="no-referrer"
                                                className="w-full h-full object-cover" // 이미지를 컨테이너에 꽉 차게 리사이징 (비율 유지)
                                                onError={(e) => {
                                                    const parent = e.target.parentElement;
                                                    e.target.style.display = 'none';
                                                    if (parent) {
                                                        parent.innerText = follower.name?.[0] || follower.email?.[0]?.toUpperCase();
                                                        parent.classList.remove('overflow-hidden');
                                                    }
                                                }}
                                            />
                                        ) : (
                                            follower.name?.[0] || follower.email?.[0]?.toUpperCase()
                                        )}
                                    </div>

                                    {/* 정보 */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-charcoal dark:text-cream truncate">
                                            {follower.name || '이름 없음'}
                                        </p>

                                    </div>

                                    {/* 화살표 아이콘 (선택) */}
                                    <span className="material-symbols-rounded text-gold-light/50 text-xl">
                                        chevron_right
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FollowerListModal;
