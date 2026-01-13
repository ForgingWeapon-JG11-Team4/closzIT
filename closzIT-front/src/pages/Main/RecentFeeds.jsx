import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const RecentFeeds = () => {
  const navigate = useNavigate();
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeeds = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
        // Fetch recent feeds (limit 6 for a nice grid, or more if space allows)
        const response = await fetch(`${backendUrl}/posts/feed?page=1&limit=6`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setFeeds(data);
        }
      } catch (error) {
        console.error('Failed to fetch recent feeds:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeeds();
  }, []);

  if (loading) return null; // Or a loading skeleton
  if (feeds.length === 0) return null; // Hide if no feeds

  return (
    <div className="flex-1 w-full mt-8 px-1 flex flex-col min-h-0">
      <div 
        className="rounded-[28px] p-4 shadow-soft border border-gold/30 relative overflow-hidden flex flex-col flex-1 bg-white backdrop-blur-sm"
      >
        <h3 className="text-sm font-bold text-charcoal dark:text-cream flex items-center justify-between gap-1.5 mb-3 flex-shrink-0 z-10 relative">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-rounded text-gold text-lg">grid_view</span>
            Feeds
          </div>
          <button 
            onClick={() => navigate('/feed')}
            className="text-xs text-gold/80 flex items-center hover:text-gold transition-colors"
          >
            더보기 <span className="material-symbols-rounded text-sm">chevron_right</span>
          </button>
        </h3>

        <div className="flex-1 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
           <div className="grid grid-cols-3 gap-2">
             {feeds.map((feed) => (
               <div 
                 key={feed.id} 
                 onClick={() => navigate('/feed')} // For now go to feed page on click
                 className="aspect-[3/4] rounded-xl overflow-hidden cursor-pointer relative group border border-gold/10"
               >
                 <img 
                   src={feed.imageUrl || feed.image} 
                   alt="feed" 
                   className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                 />
                 <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                 
                 {/* Like count overlay */}
                 <div className="absolute bottom-1 right-1 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                   <span className="material-symbols-rounded text-[10px] text-white">favorite</span>
                   <span className="text-[9px] text-white font-medium">{feed.likes || 0}</span>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default RecentFeeds;
