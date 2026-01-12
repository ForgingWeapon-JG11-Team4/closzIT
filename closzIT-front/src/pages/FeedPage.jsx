import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SharedHeader from '../components/SharedHeader';
import CommentBottomSheet from '../components/CommentBottomSheet';
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

  // 현재 로그인한 사용자 정보
  const [currentUser, setCurrentUser] = useState(null);

  // 댓글 바텀시트 상태
  const [commentPostId, setCommentPostId] = useState(null);
  const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false);

  // 드롭다운 메뉴 상태
  const [openMenuPostId, setOpenMenuPostId] = useState(null);
  const menuRef = useRef(null);

  const handleOpenComments = (postId) => {
    setCommentPostId(postId);
    setIsCommentSheetOpen(true);
  };

  const handleCloseComments = () => {
    setIsCommentSheetOpen(false);
    setCommentPostId(null);
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [page]);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuPostId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/user/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

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

  // 게시글 삭제
  const handleDeletePost = async (postId) => {
    if (!window.confirm('정말 이 게시글을 삭제하시겠습니까?')) {
      setOpenMenuPostId(null);
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

      const response = await fetch(`${backendUrl}/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // UI에서 게시글 제거
        setPosts(posts.filter(post => post.id !== postId));
        setOpenMenuPostId(null);
      } else {
        alert('게시글 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('게시글 삭제 중 오류가 발생했습니다.');
    }
  };

  // 게시글 수정 페이지로 이동
  const handleEditPost = (postId) => {
    setOpenMenuPostId(null);
    navigate(`/edit-post/${postId}`);
  };

  // 메뉴 토글
  const toggleMenu = (postId) => {
    setOpenMenuPostId(openMenuPostId === postId ? null : postId);
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
                  <div className="relative" ref={openMenuPostId === post.id ? menuRef : null}>
                    <button
                      onClick={() => toggleMenu(post.id)}
                      className="w-8 h-8 rounded-full hover:bg-gold-light/20 flex items-center justify-center transition-colors"
                    >
                      <span className="material-symbols-rounded text-charcoal-light dark:text-cream-dark">more_vert</span>
                    </button>

                    {/* 드롭다운 메뉴 - 본인 글일 경우만 */}
                    {openMenuPostId === post.id && currentUser && post.user.id === currentUser.id && (
                      <div className="absolute right-0 top-10 w-32 bg-warm-white dark:bg-charcoal rounded-xl shadow-lg border border-gold-light/20 overflow-hidden z-20">
                        <button
                          onClick={() => handleEditPost(post.id)}
                          className="w-full px-4 py-3 text-left text-sm text-charcoal dark:text-cream hover:bg-gold-light/10 flex items-center gap-2 transition-colors"
                        >
                          <span className="material-symbols-rounded text-lg">edit</span>
                          수정
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                        >
                          <span className="material-symbols-rounded text-lg">delete</span>
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Post Image */}
                <div
                  className="relative w-full aspect-square bg-cream-dark dark:bg-charcoal-light cursor-pointer"
                  onClick={() => navigate(`/post/${post.id}`)}
                >
                  <img
                    src={post.imageUrl}
                    alt="Post"
                    className="w-full h-full object-contain"
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
                        ? 'text-red-500'
                        : 'text-charcoal dark:text-cream group-hover:text-red-500'
                        }`}
                        style={{ fontVariationSettings: post.isLiked ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        favorite
                      </span>
                    </button>
                    <button
                      onClick={() => handleOpenComments(post.id)}
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
                      onClick={() => handleOpenComments(post.id)}
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

      {/* Floating Action Button - 게시물 작성 */}
      <button
        onClick={() => navigate('/create-post')}
        className="fixed bottom-20 right-4 w-14 h-14 btn-premium rounded-full shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center"
      >
        <span className="material-symbols-rounded text-2xl">add</span>
      </button>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-16 glass-warm border-t border-gold-light/20 flex items-center justify-around px-4 z-50 safe-area-pb">
        <button
          onClick={() => navigate('/main')}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] text-charcoal-light dark:text-cream-dark hover:text-gold transition-colors"
        >
          <span className="material-symbols-rounded text-[22px]">checkroom</span>
          <span className="text-[10px] font-semibold">내 옷장</span>
        </button>
        <button className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] text-gold">
          <span className="material-symbols-rounded text-[22px]">grid_view</span>
          <span className="text-[10px] font-semibold">SNS</span>
        </button>
      </div>

      {/* 댓글 바텀시트 */}
      <CommentBottomSheet
        isOpen={isCommentSheetOpen}
        onClose={handleCloseComments}
        postId={commentPostId}
      />
    </div>
  );
};

export default FeedPage;
