import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      if (userId) {
        fetchUserProfile();
        fetchUserPosts();
        checkFollowStatus();
      } else {
        fetchMyProfile();
        fetchMyPosts();
      }
    }
  }, [userId, currentUserId]);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/user/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setCurrentUserId(userData.id);
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  const fetchMyProfile = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/user/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    // In a real app, you'd have a /user/:id endpoint
    // For now, we'll just show basic info from posts
    setLoading(false);
  };

  const fetchMyPosts = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/posts/user/${currentUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/posts/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data);
        if (data.length > 0) {
          setUser(data[0].user);
        }
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/follow/is-following/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const { following } = await response.json();
        setIsFollowing(following);
      }
    } catch (error) {
      console.error('Failed to check follow status:', error);
    }
  };

  const handleFollowToggle = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/follow/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const { following } = await response.json();
        setIsFollowing(following);
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    }
  };

  const isOwnProfile = !userId || userId === currentUserId;

  if (loading) {
    return (
      <div className="min-h-screen bg-cream dark:bg-[#1A1918] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-[#1A1918] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 glass-warm border-b border-gold-light/20 px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full hover:bg-gold-light/20 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-rounded text-2xl text-charcoal dark:text-cream">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-charcoal dark:text-cream">
            {user?.name || user?.email || '프로필'}
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="bg-warm-white dark:bg-charcoal rounded-2xl p-6 shadow-soft border border-gold-light/20 mb-6">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-warm-white text-3xl font-bold">
              {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-charcoal dark:text-cream mb-1">
                {user?.name || 'User'}
              </h2>
              <p className="text-charcoal-light dark:text-cream-dark">{user?.email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-charcoal dark:text-cream">{posts.length}</p>
              <p className="text-sm text-charcoal-light dark:text-cream-dark">게시물</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-charcoal dark:text-cream">0</p>
              <p className="text-sm text-charcoal-light dark:text-cream-dark">팔로워</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-charcoal dark:text-cream">0</p>
              <p className="text-sm text-charcoal-light dark:text-cream-dark">팔로잉</p>
            </div>
          </div>

          {/* Action Buttons */}
          {isOwnProfile ? (
            <button
              onClick={() => navigate('/mypage')}
              className="w-full py-3 bg-cream-dark dark:bg-charcoal-light/30 text-charcoal dark:text-cream rounded-xl font-semibold hover:bg-gold-light/30 transition-colors border border-gold-light/30"
            >
              프로필 수정
            </button>
          ) : (
            <button
              onClick={handleFollowToggle}
              className={`w-full py-3 rounded-xl font-semibold transition-colors ${isFollowing
                  ? 'bg-cream-dark dark:bg-charcoal-light/30 text-charcoal dark:text-cream hover:bg-gold-light/30 border border-gold-light/30'
                  : 'btn-premium'
                }`}
            >
              {isFollowing ? '팔로잉' : '팔로우'}
            </button>
          )}
        </div>

        {/* Posts Grid */}
        <div className="bg-warm-white dark:bg-charcoal rounded-2xl p-4 shadow-soft border border-gold-light/20">
          <h3 className="text-lg font-bold text-charcoal dark:text-cream mb-4">게시물</h3>

          {posts.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => navigate(`/post/${post.id}`)}
                  className="relative aspect-square bg-cream-dark dark:bg-charcoal-light rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <img
                    src={post.imageUrl}
                    alt="Post"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    {post.likesCount > 0 && (
                      <div className="bg-charcoal/50 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                        <span className="material-symbols-rounded text-warm-white text-xs">favorite</span>
                        <span className="text-warm-white text-xs">{post.likesCount}</span>
                      </div>
                    )}
                    {post.commentsCount > 0 && (
                      <div className="bg-charcoal/50 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                        <span className="material-symbols-rounded text-warm-white text-xs">chat_bubble</span>
                        <span className="text-warm-white text-xs">{post.commentsCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <span className="material-symbols-rounded text-6xl text-gold-light dark:text-charcoal-light">photo_library</span>
              <p className="mt-4 text-charcoal-light dark:text-cream-dark">아직 게시물이 없습니다</p>
              {isOwnProfile && (
                <button
                  onClick={() => navigate('/create-post')}
                  className="mt-6 px-6 py-3 btn-premium rounded-full"
                >
                  첫 게시물 작성하기
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Global Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
