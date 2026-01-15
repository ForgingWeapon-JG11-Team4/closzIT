import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SharedHeader from '../components/SharedHeader';
import CommentBottomSheet from '../components/CommentBottomSheet';
import ClothDetailModal from '../components/ClothDetailModal';
import FollowerListModal from '../components/FollowerListModal';
import { useVtoStore } from '../stores/vtoStore';
import { useUserStore } from '../stores/userStore';
import { useTabStore, TAB_KEYS } from '../stores/tabStore';

const FeedPage = ({ hideHeader = false }) => {
  const navigate = useNavigate();
  const { userId: targetUserId } = useParams(); // URL에서 userId 파라미터 받기
  const {
    vtoLoadingPosts,
    vtoCompletedPosts,
    requestVto
  } = useVtoStore();
  const { user: currentUser, fetchUser } = useUserStore();
  const {
    activeTab: globalActiveTab,
    shouldRefreshFeed,
    setShouldRefreshFeed
  } = useTabStore();

  // 다른 유저 피드를 보고 있는지 여부
  const isViewingOtherUser = !!targetUserId;

  // 탭 상태 ('홈' 또는 '유저피드')
  const [activeTab, setActiveTab] = useState(isViewingOtherUser ? '유저피드' : '홈');

  // 유저 피드 내 서브 탭 ('피드' 또는 '옷장')
  const [userFeedSubTab, setUserFeedSubTab] = useState('피드');

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef(null);

  // 보고 있는 유저 정보 (다른 유저 피드일 때)
  const [targetUser, setTargetUser] = useState(null);

  // 팔로우 상태 관리
  const [isFollowing, setIsFollowing] = useState(false);
  const [displayFollowersCount, setDisplayFollowersCount] = useState(0);

  // 팔로워 리스트 모달 상태
  const [followerList, setFollowerList] = useState([]);
  const [isFollowerModalOpen, setIsFollowerModalOpen] = useState(false);

  useEffect(() => {
    // 타겟 유저가 있거나(타인 피드), 현재 유저가 있을 때(내 피드) 팔로우 정보 가져오기
    if (targetUser || (!isViewingOtherUser && currentUser)) {
      fetchFollowInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUser, currentUser, isViewingOtherUser]);

  const fetchFollowInfo = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const token = localStorage.getItem('accessToken');

      const userIdToCheck = isViewingOtherUser ? targetUser?.id : currentUser?.id;
      if (!userIdToCheck) return;

      // 1. 팔로우 여부 확인 (타인 피드일 때만)
      if (isViewingOtherUser && token) {
        const resStatus = await fetch(`${backendUrl}/follow/is-following/${userIdToCheck}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resStatus.ok) {
          const { following } = await resStatus.json();
          setIsFollowing(following);
        }
      }

      // 2. 정확한 팔로워 수 확인 (내 피드, 타인 피드 모두)
      // 토큰이 있으면 헤더에 포함 (백엔드 Guard 통과 위해)
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const resFollowers = await fetch(`${backendUrl}/follow/followers/${userIdToCheck}`, {
        headers
      });

      if (resFollowers.ok) {
        const followers = await resFollowers.json();
        setDisplayFollowersCount(followers.length);
        setFollowerList(followers);
      }
    } catch (error) {
      console.error("Failed to fetch follow info:", error);
    }
  };

  // 유저 자신의 게시물 (유저 피드용)
  const [userPosts, setUserPosts] = useState([]);
  const [userPostsLoading, setUserPostsLoading] = useState(false);

  // ... (중략) ...

  const handleFollow = async () => {
    // Optimistic UI Update (즉각 반응)
    const previousIsFollowing = isFollowing;
    const previousCount = displayFollowersCount;

    const newIsFollowing = !isFollowing;
    setIsFollowing(newIsFollowing);
    // 0 미만으로 내려가지 않도록 방지
    setDisplayFollowersCount(prev => {
      const newCount = newIsFollowing ? prev + 1 : prev - 1;
      return newCount < 0 ? 0 : newCount;
    });

    // 백엔드 API 호출
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${backendUrl}/follow/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: targetUser.id })
      });

      if (response.ok) {
        const { following } = await response.json();
        // 실제 서버 응답과 로컬 상태가 다르면 보정
        if (following !== newIsFollowing) {
          setIsFollowing(following);
          if (following) {
            // 팔로우 성공인데 UI가 언팔로우 상태였다면 +1
            if (!previousIsFollowing) setDisplayFollowersCount(previousCount + 1);
          } else {
            // 언팔로우 성공인데 UI가 팔로우 상태였다면 -1
            if (previousIsFollowing) setDisplayFollowersCount(Math.max(0, previousCount - 1));
          }
        }
      } else {
        throw new Error("Failed to toggle follow");
      }
    } catch (error) {
      console.error("Follow toggle failed:", error);
      // 에러 시 롤백
      setIsFollowing(previousIsFollowing);
      setDisplayFollowersCount(previousCount);
      alert("팔로우 요청 처리에 실패했습니다.");
    }
  };

  // 유저 옷장 (카테고리별 의류)
  const [userClothes, setUserClothes] = useState({
    outerwear: [],
    tops: [],
    bottoms: [],
    shoes: [],
  });
  const [clothesLoading, setClothesLoading] = useState(false);

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

  const handleCloseComments = () => {
    setIsCommentSheetOpen(false);
    setCommentPostId(null);
  };

  useEffect(() => {
    fetchUser();

    // URL 파라미터가 변경될 때마다 상태 초기화
    if (targetUserId) {
      setUserPosts([]); // 기존 게시물 초기화
      setUserClothes({ // 기존 옷장 데이터 초기화
        outerwear: [],
        tops: [],
        bottoms: [],
        shoes: [],
      });
      setTargetUser(null); // 타겟 유저 정보 초기화
      fetchTargetUser();
      setActiveTab('유저피드'); // 다른 유저 피드로 이동하면 자동으로 유저피드 탭으로 전환
    } else {
      setActiveTab('홈'); // 자기 피드로 돌아가면 홈 탭으로
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId, fetchUser]);

  const fetchTargetUser = async () => {
    if (!targetUserId) return;

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/user/${targetUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTargetUser(data);
      }
    } catch (error) {
      console.error('Failed to fetch target user:', error);
    }
  };

  useEffect(() => {
    if (!isViewingOtherUser) {
      fetchFeed();
    } else {
      // 다른 유저 피드를 볼 때는 홈 피드를 가져오지 않으므로 loading false
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, isViewingOtherUser]);

  // Feed 탭으로 돌아올 때 데이터 새로고침 (게시물 작성 후 등)
  useEffect(() => {
    if (globalActiveTab === TAB_KEYS.FEED && shouldRefreshFeed) {
      // 피드 데이터 새로고침
      setPage(1);
      setLoading(true);
      fetchFeed();

      // 유저 피드 탭이 활성화되어 있으면 유저 게시물도 새로고침
      if (activeTab === '유저피드' && currentUser) {
        fetchUserPosts();
      }

      // 새로고침 플래그 초기화
      setShouldRefreshFeed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalActiveTab, shouldRefreshFeed]);

  // 탭 변경 시 유저 게시물 가져오기
  useEffect(() => {
    if (activeTab === '유저피드') {
      if (isViewingOtherUser && targetUser && userPosts.length === 0) {
        fetchUserPosts();
      } else if (!isViewingOtherUser && currentUser && userPosts.length === 0) {
        fetchUserPosts();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentUser, targetUser, isViewingOtherUser]);

  // 옷장 탭 변경 시 옷 데이터 가져오기
  useEffect(() => {
    if (userFeedSubTab === '옷장' && Object.values(userClothes).every(arr => arr.length === 0)) {
      if (isViewingOtherUser && targetUser) {
        fetchUserClothes();
      } else if (!isViewingOtherUser && currentUser) {
        fetchUserClothes();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userFeedSubTab, currentUser, targetUser, isViewingOtherUser]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    // 홈 피드 탭이 아니면 무시
    if (activeTab !== '홈') return;
    if (!sentinelRef.current) return;
    if (loading || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(prevPage => prevPage + 1);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [activeTab, loading, hasMore]);

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
      const response = await fetch(`${backendUrl}/posts/feed?page=${page}&limit=5`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(prev => page === 1 ? data : [...prev, ...data]);
        // 받아온 데이터가 5개 미만이면 더 이상 로드할 게시물이 없음
        setHasMore(data.length === 5);
      }
    } catch (error) {
      console.error('Failed to fetch feed:', error);
    } finally {
      setLoading(false);
    }
  };

  // 유저 게시물 가져오기 (본인 또는 다른 유저)
  const fetchUserPosts = async () => {
    const userId = isViewingOtherUser ? targetUserId : currentUser?.id;
    if (!userId) return;

    setUserPostsLoading(true);
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
        setUserPosts(data);
      }
    } catch (error) {
      console.error('Failed to fetch user posts:', error);
    } finally {
      setUserPostsLoading(false);
    }
  };

  // 유저 옷장 데이터 가져오기 (본인 또는 다른 유저)
  const fetchUserClothes = async () => {
    const userId = isViewingOtherUser ? targetUserId : currentUser?.id;
    if (!userId) {
      console.log('[fetchUserClothes] userId가 없어서 리턴');
      return;
    }

    console.log('[fetchUserClothes] 시작:', {
      isViewingOtherUser,
      targetUserId,
      currentUserId: currentUser?.id,
      userId
    });

    setClothesLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

      // 다른 유저의 옷장을 보는 경우 공개 아이템만 가져오기
      const endpoint = isViewingOtherUser
        ? `${backendUrl}/items/by-category/${userId}`
        : `${backendUrl}/items/by-category`;

      console.log('[fetchUserClothes] API 호출:', endpoint);

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('[fetchUserClothes] 응답 상태:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('[fetchUserClothes] 받아온 옷장 데이터:', data);
        console.log('[fetchUserClothes] 각 카테고리 길이:', {
          outerwear: data.outerwear?.length || 0,
          tops: data.tops?.length || 0,
          bottoms: data.bottoms?.length || 0,
          shoes: data.shoes?.length || 0
        });

        // FittingRoomPage와 동일한 방식으로 데이터 설정
        const processedData = {
          outerwear: (data.outerwear || []).map(item => ({ ...item, category: 'outerwear', isPublic: item.isPublic ?? true })),
          tops: (data.tops || []).map(item => ({ ...item, category: 'tops', isPublic: item.isPublic ?? true })),
          bottoms: (data.bottoms || []).map(item => ({ ...item, category: 'bottoms', isPublic: item.isPublic ?? true })),
          shoes: (data.shoes || []).map(item => ({ ...item, category: 'shoes', isPublic: item.isPublic ?? true })),
        };
        console.log('[fetchUserClothes] 처리된 옷장 데이터:', processedData);
        setUserClothes(processedData);
      } else {
        const errorText = await response.text();
        console.error('[fetchUserClothes] API 호출 실패:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
      }
    } catch (error) {
      console.error('[fetchUserClothes] 에러 발생:', error);
    } finally {
      setClothesLoading(false);
      console.log('[fetchUserClothes] 완료');
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
      {!hideHeader && <SharedHeader />}

      {/* 탭 네비게이션 또는 뒤로가기 헤더 */}
      {isViewingOtherUser ? (
        <div className={`sticky ${hideHeader ? 'top-0' : 'top-16'} z-30 bg-cream dark:bg-[#1A1918] border-b border-gold-light/20`}>
          <div className="max-w-2xl mx-auto flex items-center gap-4 py-4 px-4">
            <button
              onClick={() => navigate('/feed')}
              className="w-10 h-10 rounded-full hover:bg-gold-light/20 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-rounded text-charcoal dark:text-cream">arrow_back</span>
            </button>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-warm-white font-bold text-sm overflow-hidden">
                {targetUser?.profileImage ? (
                  <img
                    src={targetUser.profileImage}
                    alt={`${targetUser.name || targetUser.email} 프로필`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  targetUser?.name?.[0] || targetUser?.email?.[0]?.toUpperCase() || '?'
                )}
              </div>
              <div>
                <h2 className="font-bold text-charcoal dark:text-cream">
                  {targetUser?.name || targetUser?.email || '로딩 중...'}
                </h2>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`sticky ${hideHeader ? 'top-0' : 'top-16'} z-30 bg-cream dark:bg-[#1A1918] border-b border-gold-light/20`}>
          <div className="max-w-2xl mx-auto flex">
            <button
              onClick={() => setActiveTab('홈')}
              className={`flex-1 py-4 flex flex-col items-center justify-center gap-1 transition-all relative ${activeTab === '홈'
                ? 'text-gold dark:text-gold'
                : 'text-charcoal-light dark:text-cream-dark'
                }`}
            >
              <span
                className="material-symbols-rounded text-3xl"
                style={{ fontVariationSettings: activeTab === '홈' ? "'FILL' 1" : "'FILL' 0" }}
              >
                home
              </span>
              {activeTab === '홈' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('유저피드')}
              className={`flex-1 py-4 flex flex-col items-center justify-center gap-1 transition-all relative ${activeTab === '유저피드'
                ? 'text-gold dark:text-gold'
                : 'text-charcoal-light dark:text-cream-dark'
                }`}
            >
              <span
                className="material-symbols-rounded text-3xl"
                style={{ fontVariationSettings: activeTab === '유저피드' ? "'FILL' 1" : "'FILL' 0" }}
              >
                account_circle
              </span>
              {activeTab === '유저피드' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
        {/* 홈 탭 */}
        {activeTab === '홈' && (
          <>
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
                      <div
                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentUser?.id === post.user.id) {
                            setActiveTab('유저피드');
                          } else {
                            navigate(`/feed/${post.user.id}`);
                          }
                        }}
                      >
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
                                  src={pc.clothing.flattenImageUrl || pc.clothing.imageUrl}
                                  alt={pc.clothing.subCategory}
                                  className="w-full h-full object-cover"
                                />

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedClothDetail({ ...pc.clothing, postId: post.id, ownerId: post.user.id });
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

            {/* Infinite Scroll Sentinel */}
            {posts.length > 0 && (
              <div ref={sentinelRef} className="mt-6 text-center py-4">
                {loading && hasMore && (
                  <div className="flex items-center justify-center gap-2 text-charcoal-light dark:text-cream-dark">
                    <span className="material-symbols-rounded animate-spin">progress_activity</span>
                    <span>로딩 중...</span>
                  </div>
                )}
                {!hasMore && (
                  <p className="text-charcoal-light dark:text-cream-dark text-sm">
                    모든 게시물을 불러왔습니다.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* 유저 피드 탭 */}
        {activeTab === '유저피드' && (
          <>
            {/* 프로필 헤더 */}
            {(isViewingOtherUser ? targetUser : currentUser) && (
              <div className="mb-8">
                <div className="flex items-center gap-6 mb-6">
                  {/* 프로필 사진 */}
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-warm-white font-bold text-2xl overflow-hidden">
                    {(isViewingOtherUser ? targetUser : currentUser).profileImage ? (
                      <img
                        src={(isViewingOtherUser ? targetUser : currentUser).profileImage}
                        alt="프로필 사진"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (isViewingOtherUser ? targetUser : currentUser).name?.[0] || (isViewingOtherUser ? targetUser : currentUser).email[0].toUpperCase()
                    )}
                  </div>

                  {/* 프로필 정보 */}
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-charcoal dark:text-cream mb-2">
                      {(isViewingOtherUser ? targetUser : currentUser).name || (isViewingOtherUser ? targetUser : currentUser).email}
                    </h2>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="font-semibold text-charcoal dark:text-cream">{userPosts.length}</span>
                        <span className="text-charcoal-light dark:text-cream-dark ml-1">게시물</span>
                      </div>
                      <div>
                        <span
                          className="font-semibold text-charcoal dark:text-cream"
                        >
                          {displayFollowersCount}
                        </span>
                        {isViewingOtherUser ? (
                          <span
                            onClick={handleFollow}
                            className={`ml-1 cursor-pointer transition-colors ${isFollowing
                              ? 'text-charcoal-light dark:text-cream-dark'
                              : 'text-blue-500 font-bold hover:text-blue-600'
                              }`}
                          >
                            {isFollowing ? '팔로워' : '팔로워+'}
                          </span>
                        ) : (
                          <span
                            onClick={() => {
                              if (!isViewingOtherUser && followerList.length > 0) {
                                setIsFollowerModalOpen(true);
                              }
                            }}
                            className={`text-charcoal-light dark:text-cream-dark ml-1 ${!isViewingOtherUser && followerList.length > 0 ? 'cursor-pointer hover:underline' : ''}`}
                          >
                            팔로워
                          </span>
                        )}
                      </div>

                    </div>
                  </div>
                </div>

                {/* 프로필 편집 버튼 - 본인 피드일 때만 표시 */}
                {!isViewingOtherUser && (
                  <button
                    onClick={() => navigate('/mypage')}
                    className="w-full py-2 bg-warm-white dark:bg-charcoal text-charcoal dark:text-cream rounded-lg font-semibold border border-gold-light/30 hover:bg-gold-light/10 transition-colors"
                  >
                    프로필 편집
                  </button>
                )}
              </div>
            )}

            {/* 서브 탭 네비게이션 */}
            <div className={`sticky ${hideHeader ? 'top-[64px]' : 'top-[132px]'} z-20 bg-cream dark:bg-[#1A1918] border-b border-gold-light/20 mb-6 -mx-4 px-4`}>
              <div className="flex">
                <button
                  onClick={() => setUserFeedSubTab('피드')}
                  className={`flex-1 py-4 flex flex-col items-center justify-center gap-1 transition-all relative ${userFeedSubTab === '피드'
                    ? 'text-gold dark:text-gold'
                    : 'text-charcoal-light dark:text-cream-dark'
                    }`}
                >
                  <span
                    className="material-symbols-rounded text-2xl"
                    style={{ fontVariationSettings: userFeedSubTab === '피드' ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    grid_on
                  </span>
                  {userFeedSubTab === '피드' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
                  )}
                </button>
                <button
                  onClick={() => setUserFeedSubTab('옷장')}
                  className={`flex-1 py-4 flex flex-col items-center justify-center gap-1 transition-all relative ${userFeedSubTab === '옷장'
                    ? 'text-gold dark:text-gold'
                    : 'text-charcoal-light dark:text-cream-dark'
                    }`}
                >
                  <span
                    className="material-symbols-rounded text-2xl"
                    style={{ fontVariationSettings: userFeedSubTab === '옷장' ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    checkroom
                  </span>
                  {userFeedSubTab === '옷장' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
                  )}
                </button>
              </div>
            </div>

            {/* 피드 서브탭 - 게시물 그리드 */}
            {userFeedSubTab === '피드' && (
              <>
                {userPostsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
                  </div>
                ) : userPosts.length === 0 ? (
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
                  <div className="grid grid-cols-3 gap-1">
                    {userPosts.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => navigate(`/post/${post.id}`)}
                        className="relative aspect-square bg-cream-dark dark:bg-charcoal-light cursor-pointer overflow-hidden group"
                      >
                        <img
                          src={post.imageUrl}
                          alt="Post"
                          className="w-full h-full object-contain"
                        />
                        {/* 호버 오버레이 */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          <div className="flex items-center gap-1 text-white">
                            <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                              favorite
                            </span>
                            <span className="font-semibold">{post.likesCount}</span>
                          </div>
                          <div className="flex items-center gap-1 text-white">
                            <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                              chat_bubble
                            </span>
                            <span className="font-semibold">{post.commentsCount}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 옷장 서브탭 - 카테고리별 의류 */}
            {userFeedSubTab === '옷장' && (
              <>
                {clothesLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* 옷 추가 버튼 (내 피드일 때만 표시) */}
                    {!isViewingOtherUser && (
                      <div className="flex justify-center px-4">
                        <button
                          onClick={() => navigate('/register', { state: { returnTo: '/feed' } })}
                          className={`flex items-center gap-2 rounded-full transition-colors font-bold shadow-sm ${Object.values(userClothes).every(arr => arr.length === 0)
                              ? 'px-6 py-3 text-base bg-gold hover:bg-gold-dark text-white'
                              : 'px-6 py-3 text-base bg-gold/10 hover:bg-gold/20 text-gold-dark dark:text-gold'
                            }`}
                        >
                          <span className="material-symbols-rounded text-xl">add</span>
                          옷 추가하기
                        </button>
                      </div>
                    )}
                    {/* 외투 */}
                    {userClothes.outerwear.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-charcoal dark:text-cream mb-3 flex items-center gap-2">
                          <span className="material-symbols-rounded text-gold">apparel</span>
                          외투
                        </h3>
                        <div className="overflow-x-auto pb-4 -mx-4 px-4">
                          <div className="flex gap-3" style={{ width: 'max-content' }}>
                            {userClothes.outerwear.map((item) => (
                              <div
                                key={item.id}
                                className="flex-shrink-0 w-32 h-40 rounded-xl overflow-hidden bg-cream-dark dark:bg-charcoal-light border border-gold-light/30 hover:border-gold transition-all cursor-pointer group relative"
                              >
                                <img
                                  src={item.image || item.imageUrl}
                                  alt={item.name || '외투'}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  onClick={() => setSelectedClothDetail({ ...item, ownerId: isViewingOtherUser ? targetUserId : currentUser?.id })}
                                />
                                {/* 공개/비공개 토글 버튼 - 본인 피드일 때만 표시 */}
                                {!isViewingOtherUser && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      console.log('공개/비공개 토글 클릭:', item.id, '현재 상태:', item.isPublic);
                                      try {
                                        const token = localStorage.getItem('accessToken');
                                        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

                                        console.log('API 호출:', `${backendUrl}/items/${item.id}/visibility`, { isPublic: !item.isPublic });
                                        const response = await fetch(`${backendUrl}/items/${item.id}/visibility`, {
                                          method: 'PATCH',
                                          headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'Content-Type': 'application/json',
                                          },
                                          body: JSON.stringify({ isPublic: !item.isPublic }),
                                        });

                                        console.log('API 응답 상태:', response.status);
                                        if (response.ok) {
                                          const result = await response.json();
                                          console.log('API 응답 데이터:', result);
                                          // 상태 업데이트
                                          setUserClothes(prev => ({
                                            ...prev,
                                            outerwear: prev.outerwear.map(i =>
                                              i.id === item.id ? { ...i, isPublic: !i.isPublic } : i
                                            )
                                          }));
                                          console.log('상태 업데이트 완료');
                                        } else {
                                          console.error('API 호출 실패:', response.status, await response.text());
                                        }
                                      } catch (error) {
                                        console.error('Failed to toggle visibility:', error);
                                      }
                                    }}
                                    className={`absolute top-2 right-2 w-7 h-7 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 z-10 ${item.isPublic
                                      ? 'bg-gold dark:bg-gold'
                                      : 'bg-gray-400/80 dark:bg-gray-600/80'
                                      }`}
                                  >
                                    <span
                                      className={`material-symbols-rounded text-sm ${item.isPublic ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                      style={{ fontVariationSettings: item.isPublic ? "'FILL' 1" : "'FILL' 0" }}
                                    >
                                      {item.isPublic ? 'visibility' : 'visibility_off'}
                                    </span>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 상의 */}
                    {userClothes.tops.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-charcoal dark:text-cream mb-3 flex items-center gap-2">
                          <span className="material-symbols-rounded text-gold">styler</span>
                          상의
                        </h3>
                        <div className="overflow-x-auto pb-4 -mx-4 px-4">
                          <div className="flex gap-3" style={{ width: 'max-content' }}>
                            {userClothes.tops.map((item) => (
                              <div
                                key={item.id}
                                className="flex-shrink-0 w-32 h-40 rounded-xl overflow-hidden bg-cream-dark dark:bg-charcoal-light border border-gold-light/30 hover:border-gold transition-all cursor-pointer group relative"
                              >
                                <img
                                  src={item.image || item.imageUrl}
                                  alt={item.name || '상의'}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  onClick={() => setSelectedClothDetail({ ...item, ownerId: isViewingOtherUser ? targetUserId : currentUser?.id })}
                                />
                                {/* 공개/비공개 토글 버튼 - 본인 피드일 때만 표시 */}
                                {!isViewingOtherUser && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        const token = localStorage.getItem('accessToken');
                                        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

                                        const response = await fetch(`${backendUrl}/items/${item.id}/visibility`, {
                                          method: 'PATCH',
                                          headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'Content-Type': 'application/json',
                                          },
                                          body: JSON.stringify({ isPublic: !item.isPublic }),
                                        });

                                        if (response.ok) {
                                          setUserClothes(prev => ({
                                            ...prev,
                                            tops: prev.tops.map(i =>
                                              i.id === item.id ? { ...i, isPublic: !i.isPublic } : i
                                            )
                                          }));
                                        }
                                      } catch (error) {
                                        console.error('Failed to toggle visibility:', error);
                                      }
                                    }}
                                    className={`absolute top-2 right-2 w-7 h-7 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 z-10 ${item.isPublic
                                      ? 'bg-gold dark:bg-gold'
                                      : 'bg-gray-400/80 dark:bg-gray-600/80'
                                      }`}
                                  >
                                    <span
                                      className={`material-symbols-rounded text-sm ${item.isPublic ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                      style={{ fontVariationSettings: item.isPublic ? "'FILL' 1" : "'FILL' 0" }}
                                    >
                                      {item.isPublic ? 'visibility' : 'visibility_off'}
                                    </span>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 하의 */}
                    {userClothes.bottoms.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-charcoal dark:text-cream mb-3 flex items-center gap-2">
                          <span className="material-symbols-rounded text-gold">sports_martial_arts</span>
                          하의
                        </h3>
                        <div className="overflow-x-auto pb-4 -mx-4 px-4">
                          <div className="flex gap-3" style={{ width: 'max-content' }}>
                            {userClothes.bottoms.map((item) => (
                              <div
                                key={item.id}
                                className="flex-shrink-0 w-32 h-40 rounded-xl overflow-hidden bg-cream-dark dark:bg-charcoal-light border border-gold-light/30 hover:border-gold transition-all cursor-pointer group relative"
                              >
                                <img
                                  src={item.image || item.imageUrl}
                                  alt={item.name || '하의'}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  onClick={() => setSelectedClothDetail({ ...item, ownerId: isViewingOtherUser ? targetUserId : currentUser?.id })}
                                />
                                {/* 공개/비공개 토글 버튼 - 본인 피드일 때만 표시 */}
                                {!isViewingOtherUser && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        const token = localStorage.getItem('accessToken');
                                        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

                                        const response = await fetch(`${backendUrl}/items/${item.id}/visibility`, {
                                          method: 'PATCH',
                                          headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'Content-Type': 'application/json',
                                          },
                                          body: JSON.stringify({ isPublic: !item.isPublic }),
                                        });

                                        if (response.ok) {
                                          setUserClothes(prev => ({
                                            ...prev,
                                            bottoms: prev.bottoms.map(i =>
                                              i.id === item.id ? { ...i, isPublic: !i.isPublic } : i
                                            )
                                          }));
                                        }
                                      } catch (error) {
                                        console.error('Failed to toggle visibility:', error);
                                      }
                                    }}
                                    className={`absolute top-2 right-2 w-7 h-7 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 z-10 ${item.isPublic
                                      ? 'bg-gold dark:bg-gold'
                                      : 'bg-gray-400/80 dark:bg-gray-600/80'
                                      }`}
                                  >
                                    <span
                                      className={`material-symbols-rounded text-sm ${item.isPublic ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                      style={{ fontVariationSettings: item.isPublic ? "'FILL' 1" : "'FILL' 0" }}
                                    >
                                      {item.isPublic ? 'visibility' : 'visibility_off'}
                                    </span>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 신발 */}
                    {userClothes.shoes.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-charcoal dark:text-cream mb-3 flex items-center gap-2">
                          <span className="material-symbols-rounded text-gold">step</span>
                          신발
                        </h3>
                        <div className="overflow-x-auto pb-4 -mx-4 px-4">
                          <div className="flex gap-3" style={{ width: 'max-content' }}>
                            {userClothes.shoes.map((item) => (
                              <div
                                key={item.id}
                                className="flex-shrink-0 w-32 h-40 rounded-xl overflow-hidden bg-cream-dark dark:bg-charcoal-light border border-gold-light/30 hover:border-gold transition-all cursor-pointer group relative"
                              >
                                <img
                                  src={item.image || item.imageUrl}
                                  alt={item.name || '신발'}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  onClick={() => setSelectedClothDetail({ ...item, ownerId: isViewingOtherUser ? targetUserId : currentUser?.id })}
                                />
                                {/* 공개/비공개 토글 버튼 - 본인 피드일 때만 표시 */}
                                {!isViewingOtherUser && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        const token = localStorage.getItem('accessToken');
                                        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

                                        const response = await fetch(`${backendUrl}/items/${item.id}/visibility`, {
                                          method: 'PATCH',
                                          headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'Content-Type': 'application/json',
                                          },
                                          body: JSON.stringify({ isPublic: !item.isPublic }),
                                        });

                                        if (response.ok) {
                                          setUserClothes(prev => ({
                                            ...prev,
                                            shoes: prev.shoes.map(i =>
                                              i.id === item.id ? { ...i, isPublic: !i.isPublic } : i
                                            )
                                          }));
                                        }
                                      } catch (error) {
                                        console.error('Failed to toggle visibility:', error);
                                      }
                                    }}
                                    className={`absolute top-2 right-2 w-7 h-7 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 z-10 ${item.isPublic
                                      ? 'bg-gold dark:bg-gold'
                                      : 'bg-gray-400/80 dark:bg-gray-600/80'
                                      }`}
                                  >
                                    <span
                                      className={`material-symbols-rounded text-sm ${item.isPublic ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                      style={{ fontVariationSettings: item.isPublic ? "'FILL' 1" : "'FILL' 0" }}
                                    >
                                      {item.isPublic ? 'visibility' : 'visibility_off'}
                                    </span>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 옷이 하나도 없는 경우 */}
                    {Object.values(userClothes).every(arr => arr.length === 0) && (
                      <div className="text-center py-20">
                        <span className="material-symbols-rounded text-6xl text-gold-light dark:text-charcoal-light">
                          {isViewingOtherUser ? 'lock' : 'checkroom'}
                        </span>
                        <p className="mt-4 text-charcoal-light dark:text-cream-dark">
                          {isViewingOtherUser ? '옷장이 비공개 상태입니다' : '옷장이 비어있습니다'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* 댓글 바텀시트 */}
      <CommentBottomSheet
        isOpen={isCommentSheetOpen}
        onClose={handleCloseComments}
        postId={commentPostId}
      />

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

      {/* 의류 상세 정보 모달 */}
      {selectedClothDetail && (
        <ClothDetailModal
          cloth={{
            ...selectedClothDetail,
            image: selectedClothDetail.image || selectedClothDetail.imageUrl,
            name: selectedClothDetail.name || selectedClothDetail.subCategory,
          }}
          onClose={() => setSelectedClothDetail(null)}
          onTryOn={() => {
            // FittingRoom 탭으로 전환하면서 옷 정보 전달 (멀티탭)
            const { setActiveTab, setPendingTryOnCloth } = useTabStore.getState();
            const clothToTryOn = {
              ...selectedClothDetail,
              image: selectedClothDetail.image || selectedClothDetail.imageUrl || selectedClothDetail.flattenImageUrl,
            };
            setSelectedClothDetail(null);
            setPendingTryOnCloth(clothToTryOn);
            setActiveTab(TAB_KEYS.FITTING_ROOM);
            window.history.replaceState(null, '', '/fitting-room');
          }}
          showActions={true}
          onEdit={(!selectedClothDetail.ownerId || selectedClothDetail.ownerId === currentUser?.id) ? () => {
            const itemId = selectedClothDetail.id;
            setSelectedClothDetail(null);
            navigate(`/item/edit/${itemId}`);
          } : null}
          onDelete={null}
        />
      )}

      {/* 팔로워 리스트 모달 (본인 피드일 때만 동작하도록 위에서 제한함) */}
      <FollowerListModal
        isOpen={isFollowerModalOpen}
        followers={followerList}
        onClose={() => setIsFollowerModalOpen(false)}
        currentUserId={currentUser?.id}
      />
    </div>
  );
};

export default FeedPage;
