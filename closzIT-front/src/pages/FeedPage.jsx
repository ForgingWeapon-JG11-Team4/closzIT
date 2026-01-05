import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const FeedPage = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchFeed();
  }, [page]);

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1
            onClick={() => window.location.href = '/'}
            className="cursor-pointer text-2xl font-bold bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent"
          >
            CloszIT
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/create-post')}
              className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-rounded text-xl">add</span>
            </button>
            <button
              onClick={() => navigate('/mypage')}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-indigo-500 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              <span className="material-symbols-rounded text-xl">person</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-rounded text-6xl text-gray-300 dark:text-gray-700">photo_library</span>
            <p className="mt-4 text-gray-500 dark:text-gray-400">No posts yet</p>
            <button
              onClick={() => navigate('/create-post')}
              className="mt-6 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
            >
              Create your first post
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg">
                {/* Post Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center text-white font-bold">
                      {post.user.name?.[0] || post.user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{post.user.name || post.user.email}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors">
                    <span className="material-symbols-rounded text-gray-600 dark:text-gray-400">more_vert</span>
                  </button>
                </div>

                {/* Post Image */}
                <div
                  className="relative w-full aspect-square bg-gray-100 dark:bg-gray-700 cursor-pointer"
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
                        : 'text-gray-700 dark:text-gray-300 group-hover:text-red-500'
                        }`}>
                        {post.isLiked ? 'favorite' : 'favorite_border'}
                      </span>
                    </button>
                    <button
                      onClick={() => navigate(`/post/${post.id}`)}
                      className="flex items-center gap-1 group"
                    >
                      <span className="material-symbols-rounded text-2xl text-gray-700 dark:text-gray-300 group-hover:text-primary">
                        chat_bubble_outline
                      </span>
                    </button>
                    <button className="flex items-center gap-1 group ml-auto">
                      <span className="material-symbols-rounded text-2xl text-gray-700 dark:text-gray-300 group-hover:text-primary">
                        bookmark_border
                      </span>
                    </button>
                  </div>

                  {/* Likes Count */}
                  <p className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                    {post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}
                  </p>

                  {/* Caption */}
                  {post.caption && (
                    <p className="text-gray-900 dark:text-white mb-2">
                      <span className="font-semibold mr-2">{post.user.name || post.user.email}</span>
                      {post.caption}
                    </p>
                  )}

                  {/* Tagged Clothes */}
                  {post.postClothes && post.postClothes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Tagged items:</p>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {post.postClothes.map((pc) => (
                          <div
                            key={pc.id}
                            className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700"
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

                  {/* View Comments */}
                  {post.commentsCount > 0 && (
                    <button
                      onClick={() => navigate(`/post/${post.id}`)}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mt-2"
                    >
                      View all {post.commentsCount} comments
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
              className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-full shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 flex items-center justify-around pb-2 z-50">
        <button
          onClick={() => navigate('/')}
          className="flex flex-col items-center justify-center w-16 h-full text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors gap-1"
        >
          <span className="material-symbols-rounded text-2xl">home</span>
          <span className="text-[10px] font-medium">Home</span>
        </button>

        <div className="relative -top-5">
          <button
            onClick={() => navigate('/create-post')}
            className="w-16 h-16 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform border-4 border-white dark:border-gray-900"
          >
            <span className="material-symbols-rounded text-4xl">add</span>
          </button>
        </div>

        <button className="flex flex-col items-center justify-center w-16 h-full text-primary transition-colors gap-1">
          <span className="material-symbols-rounded text-2xl">grid_view</span>
          <span className="text-[10px] font-medium">SNS</span>
        </button>
      </div>
    </div>
  );
};

export default FeedPage;
