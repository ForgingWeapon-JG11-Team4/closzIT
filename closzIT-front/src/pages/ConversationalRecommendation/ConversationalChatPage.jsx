import React, { useState } from 'react';
import axios from 'axios';
import './ConversationalChatPage.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://api.closzit.shop';

const ConversationalChatPage = () => {
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const exampleQueries = [
    '에버랜드 갔을 때 입었던 옷에서 상의만 빼고 전부 새로 추천해 줘',
    '놀이동산 갔던 날과 유사하게 추천해줘',
    '데이트 갔을 때 뭐 입었지?',
    '그거랑 비슷한데 좀 더 포멀하게',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    // 사용자 메시지 추가
    const userMessage = { role: 'user', content: query };
    setChatHistory((prev) => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('로그인이 필요합니다.');
      }

      const response = await axios.post(
        `${API_BASE_URL}/recommendation/chat`,
        { query },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // AI 응답 추가
      const aiMessage = {
        role: 'assistant',
        content: response.data.response,
        success: response.data.success,
      };
      setChatHistory((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error('Chat failed:', err);
      const errorMessage = {
        role: 'assistant',
        content: `❌ ${err.response?.data?.message || err.message || '추천 실패'}`,
        success: false,
      };
      setChatHistory((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (exampleQuery) => {
    setQuery(exampleQuery);
  };

  const handleClearChat = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(
        `${API_BASE_URL}/recommendation/clear-chat`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setChatHistory([]);
    } catch (err) {
      console.error('Clear chat failed:', err);
    }
  };

  return (
    <div className="conversational-chat-page">
      <div className="page-header">
        <h1>💬 AI 패션 어시스턴트</h1>
        <p>자유롭게 대화하며 코디 추천을 받아보세요!</p>
        <button onClick={handleClearChat} className="clear-button">
          🗑️ 대화 초기화
        </button>
      </div>

      <div className="chat-container">
        {chatHistory.length === 0 && (
          <div className="welcome-message">
            <h2>👋 환영합니다!</h2>
            <p>과거에 입었던 옷을 기반으로 새로운 코디를 추천해드립니다.</p>
            <p>아래 예시를 참고해서 자유롭게 질문해보세요.</p>
          </div>
        )}

        <div className="messages">
          {chatHistory.map((message, index) => (
            <div
              key={index}
              className={`message ${message.role === 'user' ? 'user-message' : 'ai-message'}`}
            >
              <div className="message-avatar">
                {message.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">
                <p>{message.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="message ai-message">
              <div className="message-avatar">🤖</div>
              <div className="message-content loading">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="input-section">
        {chatHistory.length === 0 && (
          <div className="example-queries">
            <p className="example-label">💡 예시 질문:</p>
            <div className="example-grid">
              {exampleQueries.map((example, index) => (
                <button
                  key={index}
                  className="example-button"
                  onClick={() => handleExampleClick(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="input-form">
          <textarea
            className="query-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 에버랜드 갔던 날과 유사하게 추천해줘"
            rows={2}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? '⏳' : '📤'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConversationalChatPage;
