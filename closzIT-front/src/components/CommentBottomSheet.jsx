import React, { useState, useEffect, useRef } from 'react';

const CommentBottomSheet = ({ isOpen, onClose, postId }) => {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    // 애니메이션 상태
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    const sheetRef = useRef(null);
    const startY = useRef(0);
    const inputRef = useRef(null);

    // 열기/닫기 애니메이션 처리
    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            // 약간의 딜레이 후 애니메이션 시작 (DOM이 렌더링된 후)
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsVisible(true);
                });
            });
        } else {
            setIsVisible(false);
            // 애니메이션 완료 후 언마운트
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // 댓글 목록 조회
    useEffect(() => {
        if (isOpen && postId) {
            fetchComments();
        }
    }, [isOpen, postId]);

    // 바텀시트 열릴 때 body 스크롤 방지
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const fetchComments = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

            const response = await fetch(`${backendUrl}/posts/${postId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setComments(data.comments || []);
            }
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!comment.trim()) return;

        setSubmitting(true);

        try {
            const token = localStorage.getItem('accessToken');
            const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

            const response = await fetch(`${backendUrl}/comments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    postId: postId,
                    content: comment,
                }),
            });

            if (response.ok) {
                const newComment = await response.json();
                setComments([newComment, ...comments]);
                setComment('');
            }
        } catch (error) {
            console.error('Failed to submit comment:', error);
        } finally {
            setSubmitting(false);
        }
    };

    // 닫기 핸들러 (애니메이션 포함)
    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    // 터치/마우스 드래그 핸들링
    const handleDragStart = (e) => {
        if (e.target.closest('.comment-input-area')) return;
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        startY.current = y;
        setIsDragging(true);
    };

    const handleDragMove = (e) => {
        if (!isDragging) return;
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        const diff = y - startY.current;
        if (diff > 0) {
            setDragY(diff);
        }
    };

    const handleDragEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);
        if (dragY > 150) {
            handleClose();
        }
        setDragY(0);
    };

    // 배경 클릭 시 닫기
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    if (!shouldRender) return null;

    return (
        <div
            className="fixed inset-0 z-[100] transition-colors duration-300 ease-out"
            style={{
                backgroundColor: isVisible ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0)',
            }}
            onClick={handleBackdropClick}
        >
            {/* 바텀시트 */}
            <div
                ref={sheetRef}
                className="absolute bottom-0 left-0 right-0 bg-warm-white dark:bg-charcoal rounded-t-3xl shadow-2xl overflow-hidden"
                style={{
                    maxHeight: '85vh',
                    transform: isVisible
                        ? `translateY(${dragY}px)`
                        : 'translateY(100%)',
                    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
                }}
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
            >
                {/* 드래그 핸들 */}
                <div className="flex justify-center pt-3 pb-2 cursor-grab">
                    <div className="w-10 h-1 rounded-full bg-charcoal-light/30 dark:bg-cream-dark/30" />
                </div>

                {/* 헤더 */}
                <div className="px-4 pb-3 border-b border-gold-light/20">
                    <div className="flex items-center justify-between">
                        <p className="font-semibold text-charcoal dark:text-cream text-lg">
                            댓글
                        </p>
                        <button
                            onClick={handleClose}
                            className="w-8 h-8 rounded-full hover:bg-gold-light/20 flex items-center justify-center transition-colors"
                        >
                            <span className="material-symbols-rounded text-charcoal-light dark:text-cream-dark">
                                close
                            </span>
                        </button>
                    </div>
                </div>

                {/* 댓글 목록 */}
                <div
                    className="overflow-y-auto"
                    style={{ maxHeight: 'calc(85vh - 140px)' }}
                >
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
                        </div>
                    ) : comments.length > 0 ? (
                        <div className="divide-y divide-gold-light/10">
                            {comments.map((c) => (
                                <div key={c.id} className="p-4 flex gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-warm-white font-bold text-sm flex-shrink-0">
                                        {c.user?.name?.[0] || 'U'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm">
                                            <span className="font-semibold text-charcoal dark:text-cream mr-2">
                                                {c.user?.name || 'User'}
                                            </span>
                                            <span className="text-charcoal dark:text-cream">{c.content}</span>
                                        </p>
                                        <p className="text-xs text-charcoal-light dark:text-cream-dark mt-1">
                                            {new Date(c.createdAt).toLocaleString('ko-KR')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <span className="material-symbols-rounded text-4xl text-charcoal-light/40 dark:text-cream-dark/40">
                                chat_bubble_outline
                            </span>
                            <p className="mt-2 text-charcoal-light dark:text-cream-dark">
                                아직 댓글이 없습니다
                            </p>
                            <p className="text-sm text-charcoal-light/70 dark:text-cream-dark/70 mt-1">
                                첫 번째 댓글을 작성해보세요!
                            </p>
                        </div>
                    )}
                </div>

                {/* 댓글 입력 */}
                <div className="comment-input-area sticky bottom-0 left-0 right-0 bg-warm-white dark:bg-charcoal border-t border-gold-light/20 p-3 safe-area-pb">
                    <form onSubmit={handleSubmitComment} className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="댓글을 입력하세요..."
                            className="flex-1 px-4 py-2.5 bg-cream-dark dark:bg-charcoal-light/30 rounded-full text-sm text-charcoal dark:text-cream placeholder-charcoal-light/50 focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                        <button
                            type="submit"
                            disabled={!comment.trim() || submitting}
                            className="px-5 py-2.5 btn-premium rounded-full text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <span className="material-symbols-rounded text-sm animate-spin">progress_activity</span>
                            ) : (
                                '게시'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CommentBottomSheet;

