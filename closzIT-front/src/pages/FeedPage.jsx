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

  const [vtoResultImage, setVtoResultImage] = useState(null); // VTO 결과 이미지
  const [selectedClothDetail, setSelectedClothDetail] = useState(null); // 의류 상세정보 모달 상태
  // 드롭다운 메뉴 상태
  const [openMenuPostId, setOpenMenuPostId] = useState(null);
  const menuRef = useRef(null);

  const handleOpenComments = (postId) => {
    setCommentPostId(postId);
    setIsCommentSheetOpen(true);
  };

  const [userClothes, setUserClothes] = useState({
    outerwear: [],
    tops: [],
    bottoms: [],
    shoes: [],
  });

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
                            className="group/cloth-card relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-cream-dark dark:bg-charcoal-light border border-gold-light/30 hover:border-gold transition-all"
                          >
                            <img
                              src={pc.clothing.imageUrl}
                              alt={pc.clothing.subCategory}
                              className="w-full h-full object-cover"
                            />

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClothDetail({ ...pc.clothing, postId: post.id });
                              }}
                              className="absolute bottom-1 right-1 w-6 h-6 bg-white/90 dark:bg-charcoal/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/cloth-card:opacity-100 transition-all duration-200 hover:scale-110 hover:bg-white dark:hover:bg-charcoal"
                            >
                              <span className="material-symbols-rounded text-gold text-xs">info</span>
                            </button>
                          </div>

                        ))}

                      </div>

                      {/* 입어보기 버튼 */}
                      < button
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
                            전부 입어보기
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

      {/* 댓글 바텀시트 */}
      <CommentBottomSheet
        isOpen={isCommentSheetOpen}
        onClose={handleCloseComments}
        postId={commentPostId}
      />

      {selectedClothDetail && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedClothDetail(null)}
        >
          <div
            className="bg-warm-white dark:bg-charcoal rounded-3xl shadow-2xl max-w-sm w-full max-h-[80vh] overflow-hidden animate-slideDown"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="relative">
              <img
                src={selectedClothDetail.image || selectedClothDetail.imageUrl}
                alt={selectedClothDetail.name}
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button
                onClick={() => setSelectedClothDetail(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/40 transition-colors"
              >
                <span className="material-symbols-rounded text-white text-lg">close</span>
              </button>
              <div className="absolute bottom-3 left-4 right-4">
                <h3 className="text-white text-lg font-bold">{selectedClothDetail.name || '의류'}</h3>
              </div>
            </div>

            {/* Modal Content - Labeling Info */}
            <div className="p-5 space-y-4 max-h-[40vh] overflow-y-auto">
              {/* Category */}
              <div className="bg-cream-dark dark:bg-charcoal-light/20 rounded-xl p-3">
                <p className="text-[10px] text-charcoal-light dark:text-cream-dark uppercase font-semibold mb-1">카테고리</p>
                <p className="text-sm font-medium text-charcoal dark:text-cream">
                  {selectedClothDetail.category === 'outerwear' && '외투'}
                  {selectedClothDetail.category === 'tops' && '상의'}
                  {selectedClothDetail.category === 'bottoms' && '하의'}
                  {selectedClothDetail.category === 'shoes' && '신발'}
                  {selectedClothDetail.subCategory && ` (${selectedClothDetail.subCategory})`}
                </p>
              </div>

              {/* Seasons, Colors, etc can be added here if available in data */}

              {/* Wear Count */}
              {selectedClothDetail.wearCount !== undefined && (
                <div className="bg-cream-dark dark:bg-charcoal-light/20 rounded-xl p-3">
                  <p className="text-[10px] text-charcoal-light dark:text-cream-dark uppercase font-semibold mb-1">착용 횟수</p>
                  <p className="text-sm font-medium text-charcoal dark:text-cream">{selectedClothDetail.wearCount}회</p>
                </div>
              )}
            </div>

            {/* Modal Footer - 수정/삭제 버튼 */}
            {/* 하나만 입어보기 버튼 (IDM-VTON) */}
            <button
              onClick={async () => {

                try {
                  const token = localStorage.getItem('accessToken');
                  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

                  // 모달 닫기 전에 필요한 정보 저장
                  const postId = selectedClothDetail.postId;
                  const clothingId = selectedClothDetail.id;

                  console.log(`[SNS VTO] Starting try-on for post: ${postId}, clothing: ${clothingId}`);

                  setSelectedClothDetail(null); // 모달 닫기

                  // 로딩 표시
                  alert('SNS 옷 가상 피팅을 생성 중입니다... (약 4-5초 소요)');

                  const response = await fetch(`${backendUrl}/api/fitting/sns-virtual-try-on`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      postId: postId,
                      clothingId: clothingId,
                    }),
                  });

                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || '가상 피팅 실패');
                  }

                  const result = await response.json();
                  console.log('[SNS VTO] Response:', result);

                  // 결과 이미지 표시 (모달로)
                  if (result.success && result.imageUrl) {
                    console.log('[SNS VTO] Success! Opening modal with image');
                    // 팝업 차단 문제 방지: 모달로 표시
                    setSelectedClothDetail(null); // 기존 모달 닫기
                    setVtoResultImage(result.imageUrl); // 결과 이미지 표시
                  } else {
                    console.error('[SNS VTO] Invalid response:', result);
                    throw new Error('결과 이미지를 받지 못했습니다.');
                  }
                } catch (error) {
                  console.error('SNS virtual try-on error:', error);
                  alert(`가상 피팅 실패: ${error.message}`);
                }
              }}
              className="w-64 mx-auto py-3.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-bold hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <span className="material-symbols-rounded text-lg">auto_awesome</span>
              하나만 입어보기 (AI)
            </button>

            <div className="p-4 border-t border-gold-light/20 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => alert('수정 기능은 추후 업데이트 예정입니다.')}
                  className="flex-1 py-3 bg-gold/20 text-gold rounded-xl font-semibold hover:bg-gold/30 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-rounded text-lg">edit</span>
                  수정
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('정말 이 옷을 삭제하시겠습니까?')) {
                      try {
                        const token = localStorage.getItem('accessToken');
                        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000'}/items/${selectedClothDetail.id}`, {
                          method: 'DELETE',
                          headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (response.ok) {
                          // 성공 시 목록에서 제거
                          setUserClothes((prev) => {
                            const newClothes = { ...prev };
                            const category = selectedClothDetail.category; // category is required for this
                            if (newClothes[category]) {
                              newClothes[category] = newClothes[category].filter(item => item.id !== selectedClothDetail.id);
                            }
                            return newClothes;
                          });
                          setSelectedClothDetail(null);
                        }
                      } catch (e) {
                        console.error(e);
                        alert('삭제 실패');
                      }
                    }
                  }}
                  className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors"
                >
                  <span className="material-symbols-rounded">delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VTO 결과 이미지 모달 */}
      {vtoResultImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setVtoResultImage(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-warm-white dark:bg-charcoal rounded-2xl overflow-hidden shadow-2xl animate-slideDown"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img
                src={vtoResultImage}
                alt="VTO Result"
                className="w-full h-auto"
              />
              <button
                onClick={() => setVtoResultImage(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <span className="material-symbols-rounded text-white">close</span>
              </button>
            </div>
            <div className="p-4 text-center">
              <p className="text-sm text-charcoal-light dark:text-cream-dark">가상 피팅 결과</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FeedPage;
