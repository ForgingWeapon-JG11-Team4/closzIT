import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { addVtoResult } from '../utils/vtoStorage';

const PostDetailPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tryOnLoading, setTryOnLoading] = useState(false);
  const [tryOnCompleted, setTryOnCompleted] = useState(false);
  const [selectedClothDetail, setSelectedClothDetail] = useState(null); // 의류 상세정보 모달
  const [vtoResultImage, setVtoResultImage] = useState(null); // VTO 결과 이미지

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigate('/login');
        return;
      }

      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/posts/${postId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPost(data);
      } else {
        navigate('/feed');
      }
    } catch (error) {
      console.error('Failed to fetch post:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

      const response = await fetch(`${backendUrl}/likes/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postId: post.id }),
      });

      if (response.ok) {
        const { liked } = await response.json();
        setPost({
          ...post,
          isLiked: liked,
          likesCount: liked ? post.likesCount + 1 : post.likesCount - 1,
        });
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
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
          postId: post.id,
          content: comment,
        }),
      });

      if (response.ok) {
        const newComment = await response.json();
        setPost({
          ...post,
          comments: [newComment, ...post.comments],
          commentsCount: post.commentsCount + 1,
        });
        setComment('');
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTryOn = async () => {
    if (tryOnLoading || tryOnCompleted) return;

    setTryOnLoading(true);

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
          // 현재 등록 기능 미구현으로 안내만 표시
          if (confirm) {
            alert('피팅 모델 이미지 등록 기능은 준비 중입니다.');
          }
          return;
        }
        throw new Error(data.message || '가상 착장에 실패했습니다.');
      }

      if (data.success) {
        // 결과를 localStorage에 저장
        addVtoResult({
          imageUrl: data.imageUrl,
          postId: data.postId,
          appliedClothing: data.appliedClothing,
        });
        setTryOnCompleted(true);
        alert('가상 착장이 완료되었습니다! SNS 피드에서 결과를 확인하세요.');
      }
    } catch (error) {
      console.error('VTO Error:', error);
      alert(error.message || '가상 착장 처리 중 오류가 발생했습니다.');
    } finally {
      setTryOnLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream dark:bg-[#1A1918] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-cream dark:bg-[#1A1918] flex items-center justify-center">
        <div className="text-charcoal-light dark:text-cream-dark">게시물을 찾을 수 없습니다</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-[#1A1918] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 glass-warm border-b border-gold-light/20 px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full hover:bg-gold-light/20 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-rounded text-2xl text-charcoal dark:text-cream">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-charcoal dark:text-cream">게시물</h1>
        </div>
      </div>

      {/* Post Content */}
      <div className="max-w-2xl mx-auto">
        {/* Post Header */}
        <div className="bg-warm-white dark:bg-charcoal p-4 flex items-center justify-between border-b border-gold-light/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-warm-white font-bold overflow-hidden">
              {post.user.profileImage ? (
                <img
                  src={post.user.profileImage}
                  alt={`${post.user.name || post.user.email} 프로필`}
                  className="w-full h-full object-cover"
                />
              ) : (
                post.user.name?.[0] || post.user.email[0].toUpperCase()
              )}
            </div>
            <div>
              <p className="font-semibold text-charcoal dark:text-cream">{post.user.name || post.user.email}</p>
              <p className="text-xs text-charcoal-light dark:text-cream-dark">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Post Image */}
        <div className="relative w-full aspect-square bg-cream-dark dark:bg-charcoal-light">
          <img
            src={post.imageUrl}
            alt="Post"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Post Actions */}
        <div className="bg-warm-white dark:bg-charcoal p-4 border-b border-gold-light/20">
          <div className="flex items-center gap-4 mb-3">
            <button onClick={handleLike} className="flex items-center gap-1 group">
              <span className={`material-symbols-rounded text-2xl transition-all ${post.isLiked
                ? 'text-red-500 fill-1'
                : 'text-charcoal dark:text-cream group-hover:text-red-500'
                }`}>
                {post.isLiked ? 'favorite' : 'favorite_border'}
              </span>
            </button>
          </div>

          <p className="font-semibold text-sm text-charcoal dark:text-cream mb-2">
            좋아요 {post.likesCount}개
          </p>

          {post.caption && (
            <p className="text-charcoal dark:text-cream mb-2">
              <span className="font-semibold mr-2">{post.user.name || post.user.email}</span>
              {post.caption}
            </p>
          )}

          {/* Tagged Clothes */}
          {post.postClothes && post.postClothes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gold-light/20">
              <p className="text-sm font-semibold text-charcoal dark:text-cream mb-3">태그된 의상</p>
              <div className="grid grid-cols-4 gap-3">
                {post.postClothes.map((pc) => (
                  <div
                    key={pc.id}
                    className="group/cloth-card relative aspect-square rounded-lg overflow-hidden bg-cream-dark dark:bg-charcoal-light shadow-soft border border-gold-light/30 hover:border-gold transition-all"
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
                      className="absolute bottom-2 right-2 w-8 h-8 bg-white/90 dark:bg-charcoal/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/cloth-card:opacity-100 transition-all duration-200 hover:scale-110 hover:bg-white dark:hover:bg-charcoal"
                    >
                      <span className="material-symbols-rounded text-gold text-sm">info</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* 입어보기 버튼 */}
              <button
                onClick={handleTryOn}
                disabled={tryOnLoading || tryOnCompleted}
                className={`mt-4 w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${tryOnCompleted
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : tryOnLoading
                    ? 'bg-gold-light/50 text-charcoal cursor-wait'
                    : 'btn-premium hover:scale-[1.02]'
                  }`}
              >
                {tryOnLoading ? (
                  <>
                    <span className="material-symbols-rounded animate-spin">progress_activity</span>
                    생성 중...
                  </>
                ) : tryOnCompleted ? (
                  <>
                    <span className="material-symbols-rounded">check_circle</span>
                    생성 완료
                  </>
                ) : (
                  <>
                    <span className="material-symbols-rounded">checkroom</span>
                    입어보기
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="bg-warm-white dark:bg-charcoal">
          <div className="p-4 border-b border-gold-light/20">
            <p className="font-semibold text-charcoal dark:text-cream">댓글 ({post.commentsCount})</p>
          </div>

          <div className="divide-y divide-gold-light/20">
            {post.comments && post.comments.length > 0 ? (
              post.comments.map((c) => (
                <div key={c.id} className="p-4 flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-warm-white font-bold text-sm flex-shrink-0">
                    {c.user.name?.[0] || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-semibold text-charcoal dark:text-cream mr-2">
                        {c.user.name || 'User'}
                      </span>
                      <span className="text-charcoal dark:text-cream">{c.content}</span>
                    </p>
                    <p className="text-xs text-charcoal-light dark:text-cream-dark mt-1">
                      {new Date(c.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-charcoal-light dark:text-cream-dark">
                아직 댓글이 없습니다
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comment Input */}
      <div className="fixed bottom-0 left-0 right-0 glass-warm border-t border-gold-light/20 p-4 z-50">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmitComment} className="flex gap-3">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="댓글을 입력하세요..."
              className="flex-1 px-4 py-3 bg-cream-dark dark:bg-charcoal-light/30 rounded-full text-charcoal dark:text-cream placeholder-charcoal-light/50 focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <button
              type="submit"
              disabled={!comment.trim() || submitting}
              className="px-6 py-3 btn-premium rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '게시 중...' : '게시'}
            </button>
          </form>
        </div>
      </div>

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

      {/* 옷 상세 정보 모달 */}
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

            {/* Modal Content */}
            <div className="p-5 space-y-4 max-h-[40vh] overflow-y-auto">
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

              {selectedClothDetail.wearCount !== undefined && (
                <div className="bg-cream-dark dark:bg-charcoal-light/20 rounded-xl p-3">
                  <p className="text-[10px] text-charcoal-light dark:text-cream-dark uppercase font-semibold mb-1">착용 횟수</p>
                  <p className="text-sm font-medium text-charcoal dark:text-cream">{selectedClothDetail.wearCount}회</p>
                </div>
              )}
            </div>

            {/* VTO 버튼 */}
            <button
              onClick={async () => {
                try {
                  const token = localStorage.getItem('accessToken');
                  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

                  // 모달 닫기 전에 필요한 정보 저장
                  const postId = selectedClothDetail.postId;
                  const clothingId = selectedClothDetail.id;

                  console.log(`[SNS VTO] Starting try-on for post: ${postId}, clothing: ${clothingId}`);

                  setSelectedClothDetail(null);
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

                  if (result.success && result.imageUrl) {
                    console.log('[SNS VTO] Success! Opening modal with image');
                    setSelectedClothDetail(null);
                    setVtoResultImage(result.imageUrl);
                  } else {
                    console.error('[SNS VTO] Invalid response:', result);
                    throw new Error('결과 이미지를 받지 못했습니다.');
                  }
                } catch (error) {
                  console.error('SNS virtual try-on error:', error);
                  alert(`가상 피팅 실패: ${error.message}`);
                }
              }}
              className="w-64 mx-auto mb-4 py-3.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-bold hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <span className="material-symbols-rounded text-lg">auto_awesome</span>
              하나만 입어보기 (AI)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostDetailPage;
