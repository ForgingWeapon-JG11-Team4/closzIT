import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const PostDetailPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
        </div>

        {/* Post Image */}
        <div className="relative w-full aspect-square bg-cream-dark dark:bg-charcoal-light">
          <img
            src={post.imageUrl}
            alt="Post"
            className="w-full h-full object-cover"
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
                    className="aspect-square rounded-lg overflow-hidden bg-cream-dark dark:bg-charcoal-light shadow-soft border border-gold-light/30"
                  >
                    <img
                      src={pc.clothing.imageUrl}
                      alt={pc.clothing.subCategory}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
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
    </div>
  );
};

export default PostDetailPage;
