import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-rounded text-2xl text-gray-700 dark:text-gray-200">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {user?.name || user?.email || 'Profile'}
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg mb-6">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center text-white text-3xl font-bold">
              {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {user?.name || 'User'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-3">{user?.email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{posts.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Following</p>
            </div>
          </div>

          {/* Action Buttons */}
          {isOwnProfile ? (
            <button
              onClick={() => navigate('/mypage')}
              className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Edit Profile
            </button>
          ) : (
            <button
              onClick={handleFollowToggle}
              className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                isFollowing
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        {/* Posts Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Posts</h3>

          {posts.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => navigate(`/post/${post.id}`)}
                  className="relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <img
                    src={post.imageUrl}
                    alt="Post"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    {post.likesCount > 0 && (
                      <div className="bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                        <span className="material-symbols-rounded text-white text-xs">favorite</span>
                        <span className="text-white text-xs">{post.likesCount}</span>
                      </div>
                    )}
                    {post.commentsCount > 0 && (
                      <div className="bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                        <span className="material-symbols-rounded text-white text-xs">chat_bubble</span>
                        <span className="text-white text-xs">{post.commentsCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <span className="material-symbols-rounded text-6xl text-gray-300 dark:text-gray-700">photo_library</span>
              <p className="mt-4 text-gray-500 dark:text-gray-400">No posts yet</p>
              {isOwnProfile && (
                <button
                  onClick={() => navigate('/create-post')}
                  className="mt-6 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
                >
                  Create your first post
                </button>
              )}
            </div>
          )}
        </div>
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

        <button
          onClick={() => navigate('/feed')}
          className="flex flex-col items-center justify-center w-16 h-full text-gray-400 hover:text-primary transition-colors gap-1"
        >
          <span className="material-symbols-rounded text-2xl">grid_view</span>
          <span className="text-[10px] font-medium">SNS</span>
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
