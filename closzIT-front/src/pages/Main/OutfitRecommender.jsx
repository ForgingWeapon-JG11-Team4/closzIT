import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const OutfitRecommender = ({ selectedKeywords = [], onKeywordsChange, searchText = '', onGenerate }) => {
  const navigate = useNavigate();
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null); // 캘린더 일정 단일 선택

  // TPO 목록
  const tpoList = [
    '데일리', '학교', '일', '여행', '파티', '데이트',
    '결혼식', '쇼핑', '산책', '운동', '교회', '모임',
    '외식', '면접', '콘서트'
  ];

  // 스타일 목록
  const styleList = ['캐주얼', '힙', '모던', '스트릿', '빈티지', '미니멀', '클래식', '스포티'];

  // 캘린더 일정 가져오기
  useEffect(() => {
    const fetchCalendarEvents = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setIsLoadingCalendar(false);
          return;
        }

        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
        const response = await fetch(`${backendUrl}/calendar/upcoming`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setCalendarEvents(data.events || []);
        }
      } catch (error) {
        console.error('Failed to fetch calendar events:', error);
      } finally {
        setIsLoadingCalendar(false);
      }
    };

    fetchCalendarEvents();
  }, []);

  // 캘린더 일정 클릭 (단일 선택, 토글)
  const handleEventClick = (event) => {
    if (selectedEvent?.title === event.title) {
      setSelectedEvent(null);
    } else {
      setSelectedEvent(event);
    }
  };

  const handleKeywordClick = (keyword, type) => {
    // 해당 카테고리(TPO/Style)의 목록을 가져옴
    const categoryList = type === 'TPO' ? tpoList : styleList;
    
    // 1. 현재 선택된 키워드 중, '이번에 클릭한 카테고리'에 속하는 것들을 모두 제거
    // (즉, 기존에 선택된 TPO가 있다면 지우고 새로 선택한걸 넣기 위함)
    const filteredKeywords = selectedKeywords.filter(k => !categoryList.includes(k));

    // 2. 이미 선택되어 있던 키워드를 누른게 아니라면, 새로 클릭한 키워드 추가
    // (이미 선택된걸 눌렀다면 위에서 제거되었으므로 토글 OFF 효과)
    if (!selectedKeywords.includes(keyword)) {
      filteredKeywords.push(keyword);
    }

    onKeywordsChange(filteredKeywords);
  };

  const handleGenerate = () => {
    // onGenerate 콜백이 있으면 페이지 이동 없이 콜백 호출 (MainPage2 통합용)
    if (onGenerate) {
      onGenerate({
        calendarEvent: selectedEvent?.title,
        isToday: selectedEvent?.isToday,
        userQuery: searchText,
        keywords: selectedKeywords, 
      });
      return;
    }

    // 콜백이 없으면 기존 로직대로 페이지 이동
    navigate('/fitting', { 
      state: { 
        calendarEvent: selectedEvent?.title,
        isToday: selectedEvent?.isToday,
        userQuery: searchText,
        keywords: selectedKeywords, 
      } 
    });
  };

  return (
    <div className="animate-slideDown pb-24">

      {/* Calendar Section */}
      <div className="mb-6 mt-4">
        <h2 className="text-lg font-bold text-charcoal dark:text-cream mb-3 px-1">다가오는 일정</h2>
        
        {isLoadingCalendar ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gold border-t-transparent"></div>
          </div>
        ) : calendarEvents.length === 0 ? (
          <div className="text-center py-6 text-charcoal-light dark:text-cream-dark text-sm">
            <span className="material-symbols-rounded text-3xl text-gold-light mb-2 block">event_busy</span>
            등록된 일정이 없습니다
          </div>
        ) : (
          <div className="space-y-2">
            {calendarEvents.map((event, idx) => (
              <div 
                key={idx}
                onClick={() => handleEventClick(event)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                  selectedEvent?.title === event.title
                    ? 'bg-gold/10 border-gold'
                    : 'bg-warm-white dark:bg-charcoal border-gold-light/30 dark:border-charcoal-light/30 hover:border-gold'
                }`}
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gold/10 flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-gold">{event.date}</span>
                  <span className="text-[10px] text-charcoal-light dark:text-cream-dark">{event.time}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-charcoal dark:text-cream">{event.title}</p>
                  {event.isToday && (
                    <span className="text-[10px] text-gold font-medium">오늘</span>
                  )}
                </div>
                {selectedEvent?.title === event.title ? (
                  <span className="material-symbols-rounded text-lg text-gold">check_circle</span>
                ) : (
                  <span className="material-symbols-rounded text-lg text-gold-light dark:text-charcoal-light">chevron_right</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TPO Selection - Simple Pill Style */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-charcoal dark:text-cream mb-4 px-1">TPO 선택하기</h2>
        <div className="flex flex-wrap gap-2">
          {tpoList.map((tpo) => (
            <button
              key={tpo}
              onClick={() => handleKeywordClick(tpo, 'TPO')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedKeywords.includes(tpo)
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'bg-cream-dark dark:bg-charcoal-light/20 text-charcoal-light dark:text-cream-dark border border-gold-light/30 dark:border-charcoal-light/30 hover:border-gold hover:bg-gold/5'
              }`}
            >
              {tpo}
            </button>
          ))}
        </div>
      </div>

      {/* Style Category - Simple Pill Style */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-charcoal dark:text-cream mb-4 px-1">스타일</h2>
        <div className="flex flex-wrap gap-2">
          {styleList.map((style) => (
            <button
              key={style}
              onClick={() => handleKeywordClick(style, 'STYLE')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedKeywords.includes(style)
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'bg-cream-dark dark:bg-charcoal-light/20 text-charcoal-light dark:text-cream-dark border border-gold-light/30 dark:border-charcoal-light/30 hover:border-gold hover:bg-gold/5'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button - Fixed at bottom above navigator */}
      {(selectedEvent || searchText || selectedKeywords.length > 0) && (
        <div className="fixed bottom-20 left-0 right-0 flex justify-center z-40 animate-fadeIn">
          <button
            onClick={handleGenerate}
            className="px-10 py-4 bg-gold text-cream rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-gold-dark active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-rounded text-xl">auto_awesome</span>
            <span>코디 추천받기</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default OutfitRecommender;