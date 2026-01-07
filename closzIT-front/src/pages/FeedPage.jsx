import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SharedHeader from '../components/SharedHeader';
import { useVto } from '../context/VtoContext';

const FeedPage = () => {
  const navigate = useNavigate();
  const {
    vtoLoadingPosts,
    vtoCompletedPosts,
    requestVto
  } = useVto();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchFeed();
  }, [page]);

  const handleTryOn = (postId, event) => {
    if (vtoLoadingPosts.has(postId) || vtoCompletedPosts.has(postId)) return;

    // 버튼 위치 저장 (모달 닫힌 후 플라이 애니메이션용)
    let buttonPosition = null;
    if (event?.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      buttonPosition = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }

    // requestVto에 버튼 위치 전달 (모달 닫힌 후 애니메이션 실행됨)
    requestVto(postId, buttonPosition);
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
      {/* Shared Header - Fly Animation은 SharedHeader에서 통합 렌더링 */}
      <SharedHeader />

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
