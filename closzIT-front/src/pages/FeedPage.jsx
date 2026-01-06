import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import VtoResultModal from '../components/VtoResultModal';
import { getVtoResults, addVtoResult, getUnseenVtoCount, markAllVtoAsSeen } from '../utils/vtoStorage';

const FeedPage = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showVtoModal, setShowVtoModal] = useState(false);
  const [vtoResults, setVtoResults] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [vtoLoadingPosts, setVtoLoadingPosts] = useState(new Set());
  const [vtoCompletedPosts, setVtoCompletedPosts] = useState(new Set());
  const [toastMessage, setToastMessage] = useState('');
  const [flyAnimation, setFlyAnimation] = useState(null); // { from: {x, y}, to: {x, y} }

  const isAnyVtoLoading = vtoLoadingPosts.size > 0;

  useEffect(() => {
    fetchFeed();
  }, [page]);

  useEffect(() => {
    setVtoResults(getVtoResults());
    setUnseenCount(getUnseenVtoCount());
  }, [showVtoModal]);

  const refreshVtoResults = () => {
    setVtoResults(getVtoResults());
    setUnseenCount(getUnseenVtoCount());
  };

  const handleOpenVtoModal = () => {
    markAllVtoAsSeen();
    setUnseenCount(0);
    setShowVtoModal(true);
  };

  const handleTryOn = async (postId, event) => {
    if (vtoLoadingPosts.has(postId) || vtoCompletedPosts.has(postId)) return;

    // 플라이 애니메이션 트리거
    if (event?.currentTarget) {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      const headerButton = document.getElementById('vto-header-button');
      if (headerButton) {
        const headerRect = headerButton.getBoundingClientRect();
        setFlyAnimation({
          startX: buttonRect.left + buttonRect.width / 2,
          startY: buttonRect.top,
          endX: headerRect.left + headerRect.width / 2,
          endY: headerRect.top + headerRect.height / 2,
        });
        setTimeout(() => setFlyAnimation(null), 600);
      }
    }

    setVtoLoadingPosts(prev => new Set([...prev, postId]));

    try {
      const token = localStorage.getItem('accessToken');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

      const response = await fetch(`${backendUrl}/api/fitting/sns-virtual-try-on`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'NO_FULL_BODY_IMAGE') {
          const confirm = window.confirm(
            '피팅 모델 이미지가 없어서 착장서비스 이용이 불가합니다. 등록하시겠습니까?'
          );
          if (confirm) {
            alert('피팅 모델 이미지 등록 기능은 준비 중입니다.');
          }
          return;
        }
        throw new Error(data.message || '가상 착장에 실패했습니다.');
      }

      if (data.success) {
        addVtoResult({
          imageUrl: data.imageUrl,
          postId: data.postId,
          appliedClothing: data.appliedClothing,
        });
        setVtoCompletedPosts(prev => new Set([...prev, postId]));
        refreshVtoResults();
        // 토스트 메시지 표시
        setToastMessage('착장 완료!');
        setTimeout(() => setToastMessage(''), 3000);
      }
    } catch (error) {
      console.error('VTO Error:', error);
      alert(error.message || '가상 착장 처리 중 오류가 발생했습니다.');
    } finally {
      setVtoLoadingPosts(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  const fetchFeed = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigate('/login');
        return;
      }

      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/posts/feed?page=${page}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(prev => page === 1 ? data : [...prev, ...data]);
      }
    } catch (error) {
      console.error('Failed to fetch feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

      const response = await fetch(`${backendUrl}/likes/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postId }),
      });

      if (response.ok) {
        const { liked } = await response.json();
        setPosts(posts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              isLiked: liked,
              likesCount: liked ? post.likesCount + 1 : post.likesCount - 1,
            };
          }
          return post;
        }));
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  if (loading && page === 1) {
    return (
      <div className="min-h-screen bg-cream dark:bg-[#1A1918] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-[#1A1918]">
      {/* Header */}
      <div className="sticky top-0 z-50 glass-warm border-b border-gold-light/20 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1
            onClick={() => navigate('/main')}
            className="cursor-pointer text-2xl font-bold bg-gradient-to-r from-gold to-gold-dark bg-clip-text text-transparent"
          >
            CloszIT
          </h1>
          <div className="flex items-center gap-3">
            {/* 토스트 메시지 - 옷걸이 버튼 왼쪽 */}
            {toastMessage && (
              <div className="bg-green-500 text-white px-3 py-1.5 rounded-lg shadow-lg animate-bounce">
                <span className="text-sm font-bold">{toastMessage}</span>
              </div>
            )}
            {/* VTO 결과 알림 버튼 */}
            <div className="relative w-10 h-10" id="vto-header-button">
              {/* 회전하는 테두리 - 눈에 잘 띄는 색상 */}
              {isAnyVtoLoading && (
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'conic-gradient(from 0deg, #00D9FF, #0099FF, #00D9FF, #0099FF)',
                    animation: 'spin 1s linear infinite',
                  }}
                />
              )}
              <button
                onClick={handleOpenVtoModal}
                className={`absolute rounded-full btn-premium flex items-center justify-center ${isAnyVtoLoading
                  ? 'inset-[3px]'
                  : 'inset-0'
                  }`}
              >
                <span className="material-symbols-rounded text-xl">checkroom</span>
              </button>
              {unseenCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 z-10">
                  {unseenCount}
                </span>
              )}
            </div>
            <button
              onClick={() => navigate('/mypage')}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-dark text-warm-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
            >
              <span className="material-symbols-rounded text-xl">person</span>
            </button>
          </div>

          {/* Fly Animation */}
          {flyAnimation && (
            <div
              className="fixed z-[200] pointer-events-none"
              style={{
                left: flyAnimation.startX - 16,
                top: flyAnimation.startY - 16,
                '--fly-end-x': `${flyAnimation.endX - flyAnimation.startX}px`,
                '--fly-end-y': `${flyAnimation.endY - flyAnimation.startY}px`,
                animation: 'flyToHeader 0.6s ease-in-out forwards',
              }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg flex items-center justify-center">
                <span className="material-symbols-rounded text-white text-sm">checkroom</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VTO Result Modal */}
      <VtoResultModal
        isOpen={showVtoModal}
        onClose={() => setShowVtoModal(false)}
        results={vtoResults}
        onRefresh={refreshVtoResults}
      />

      {/* Feed */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-rounded text-6xl text-gold-light dark:text-charcoal-light">photo_library</span>
            <p className="mt-4 text-charcoal-light dark:text-cream-dark">아직 게시물이 없습니다</p>
            <button
              onClick={() => navigate('/create-post')}
              className="mt-6 px-6 py-3 btn-premium rounded-full"
            >
              첫 게시물 작성하기
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="bg-warm-white dark:bg-charcoal rounded-2xl overflow-hidden shadow-soft border border-gold-light/20">
                {/* Post Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-warm-white font-bold">
                      {post.user.name?.[0] || post.user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-charcoal dark:text-cream">{post.user.name || post.user.email}</p>
                      <p className="text-xs text-charcoal-light dark:text-cream-dark">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button className="w-8 h-8 rounded-full hover:bg-gold-light/20 flex items-center justify-center transition-colors">
                    <span className="material-symbols-rounded text-charcoal-light dark:text-cream-dark">more_vert</span>
                  </button>
                </div>

                {/* Post Image */}
                <div
                  className="relative w-full aspect-square bg-cream-dark dark:bg-charcoal-light cursor-pointer"
                  onClick={() => navigate(`/post/${post.id}`)}
                >
                  <img
                    src={post.imageUrl}
                    alt="Post"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Post Actions */}
                <div className="p-4">
                  <div className="flex items-center gap-4 mb-3">
                    <button
                      onClick={() => handleLike(post.id)}
                      className="flex items-center gap-1 group"
                    >
                      <span className={`material-symbols-rounded text-2xl transition-all ${post.isLiked
                        ? 'text-red-500 fill-1'
                        : 'text-charcoal dark:text-cream group-hover:text-red-500'
                        }`}>
                        {post.isLiked ? 'favorite' : 'favorite_border'}
                      </span>
                    </button>
                    <button
                      onClick={() => navigate(`/post/${post.id}`)}
                      className="flex items-center gap-1 group"
                    >
                      <span className="material-symbols-rounded text-2xl text-charcoal dark:text-cream group-hover:text-gold">
                        chat_bubble_outline
                      </span>
                    </button>
                    <button className="flex items-center gap-1 group ml-auto">
                      <span className="material-symbols-rounded text-2xl text-charcoal dark:text-cream group-hover:text-gold">
                        bookmark_border
                      </span>
                    </button>
                  </div>

                  {/* Likes Count */}
                  <p className="font-semibold text-sm text-charcoal dark:text-cream mb-2">
                    좋아요 {post.likesCount}개
                  </p>

                  {/* Caption */}
                  {post.caption && (
                    <p className="text-charcoal dark:text-cream mb-2">
                      <span className="font-semibold mr-2">{post.user.name || post.user.email}</span>
                      {post.caption}
                    </p>
                  )}

                  {/* Tagged Clothes */}
                  {post.postClothes && post.postClothes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gold-light/20">
                      <p className="text-xs text-charcoal-light dark:text-cream-dark mb-2">태그된 의상:</p>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {post.postClothes.map((pc) => (
                          <div
                            key={pc.id}
                            className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-cream-dark dark:bg-charcoal-light border border-gold-light/30"
                          >
                            <img
                              src={pc.clothing.imageUrl}
                              alt={pc.clothing.subCategory}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>

                      {/* 입어보기 버튼 */}
                      <button
                        onClick={(e) => handleTryOn(post.id, e)}
                        disabled={vtoLoadingPosts.has(post.id) || vtoCompletedPosts.has(post.id)}
                        className={`mt-2 w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${vtoCompletedPosts.has(post.id)
                          ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : vtoLoadingPosts.has(post.id)
                            ? 'bg-gold-light/50 text-charcoal cursor-wait'
                            : 'btn-premium hover:scale-[1.02]'
                          }`}
                      >
                        {vtoLoadingPosts.has(post.id) ? (
                          <>
                            <span className="material-symbols-rounded text-base animate-spin">progress_activity</span>
                            생성 중...
                          </>
                        ) : vtoCompletedPosts.has(post.id) ? (
                          <>
                            <span className="material-symbols-rounded text-base">check_circle</span>
                            생성 완료
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-rounded text-base">checkroom</span>
                            입어보기
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* View Comments */}
                  {post.commentsCount > 0 && (
                    <button
                      onClick={() => navigate(`/post/${post.id}`)}
                      className="text-sm text-charcoal-light dark:text-cream-dark hover:text-gold mt-2"
                    >
                      댓글 {post.commentsCount}개 모두 보기
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {posts.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setPage(page + 1)}
              disabled={loading}
              className="px-6 py-3 bg-warm-white dark:bg-charcoal text-charcoal dark:text-cream rounded-full shadow-soft border border-gold-light/30 hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? '로딩 중...' : '더 보기'}
            </button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-16 glass-warm border-t border-gold-light/20 flex items-center justify-around px-4 z-50 safe-area-pb">
        <button
          onClick={() => navigate('/main')}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] text-charcoal-light dark:text-cream-dark hover:text-gold transition-colors"
        >
          <span className="material-symbols-rounded text-[22px]">checkroom</span>
          <span className="text-[10px] font-semibold">내 옷장</span>
        </button>

        <button
          onClick={() => navigate('/create-post')}
          className="flex items-center gap-2 px-5 py-2.5 btn-premium rounded-full"
        >
          <span className="material-symbols-rounded text-lg">add</span>
          <span className="text-sm font-semibold">게시물 작성</span>
        </button>

        <button className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] text-gold">
          <span className="material-symbols-rounded text-[22px]">grid_view</span>
          <span className="text-[10px] font-semibold">SNS</span>
        </button>
      </div>
    </div>
  );
};

export default FeedPage;
