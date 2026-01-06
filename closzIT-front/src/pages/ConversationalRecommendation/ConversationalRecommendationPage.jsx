import React, { useState } from 'react';
import axios from 'axios';
import './ConversationalRecommendationPage.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://api.closzit.shop';

const ConversationalRecommendationPage = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const exampleQueries = [
    '에버랜드 갔을 때 입었던 옷에서 상의만 빼고 전부 새로 추천해 줘',
    '놀이동산에 간 날 코디에서 하의만 바꿔줘',
    '데이트 갔던 날 코디에서 아우터랑 신발은 그대로 쓰고 나머지 추천해줘',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('로그인이 필요합니다.');
      }

      const response = await axios.post(
        `${API_BASE_URL}/recommendation/conversational`,
        { query },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setResult(response.data);
    } catch (err) {
      console.error('Conversational recommendation failed:', err);
      setError(err.response?.data?.message || err.message || '추천 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (exampleQuery) => {
    setQuery(exampleQuery);
  };

  return (
    <div className="conversational-recommendation-page">
      <div className="page-header">
        <h1>🤖 대화형 코디 추천</h1>
        <p>자연어로 원하는 코디 추천을 요청해보세요!</p>
      </div>

      <div className="query-section">
        <form onSubmit={handleSubmit}>
          <textarea
            className="query-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 에버랜드 갔을 때 입었던 옷에서 상의만 빼고 전부 새로 추천해 줘"
            rows={4}
          />
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? '추천 중...' : '추천받기'}
          </button>
        </form>

        <div className="example-queries">
          <p className="example-label">예시 질문:</p>
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

      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
        </div>
      )}

      {result && (
        <div className="result-section">
          <div className="parsed-query-section">
            <h2>📝 분석 결과</h2>
            <div className="parsed-info">
              <p><strong>위치 키워드:</strong> {result.parsedQuery.locationKeyword}</p>
              <p><strong>유지할 아이템:</strong> {result.parsedQuery.keepCategories.join(', ')}</p>
              <p><strong>새로 추천할 아이템:</strong> {result.parsedQuery.replaceCategories.join(', ')}</p>
            </div>
          </div>

          <div className="reference-outfit-section">
            <h2>👕 참조 코디 (과거 착용)</h2>
            <div className="outfit-info">
              <p><strong>착용 날짜:</strong> {new Date(result.referenceOutfit.wornDate).toLocaleDateString('ko-KR')}</p>
              <p><strong>위치:</strong> {result.referenceOutfit.location}</p>
              <p><strong>TPO:</strong> {result.referenceOutfit.tpo}</p>
            </div>
            <div className="outfit-grid">
              {result.referenceOutfit.outer && (
                <div className="clothing-item">
                  <img src={result.referenceOutfit.outer.imageUrl} alt="Outer" />
                  <p>아우터</p>
                </div>
              )}
              <div className="clothing-item">
                <img src={result.referenceOutfit.top.imageUrl} alt="Top" />
                <p>상의</p>
              </div>
              <div className="clothing-item">
                <img src={result.referenceOutfit.bottom.imageUrl} alt="Bottom" />
                <p>하의</p>
              </div>
              <div className="clothing-item">
                <img src={result.referenceOutfit.shoes.imageUrl} alt="Shoes" />
                <p>신발</p>
              </div>
            </div>
          </div>

          {Object.keys(result.fixedItems).length > 0 && (
            <div className="fixed-items-section">
              <h2>🔒 유지할 아이템</h2>
              <div className="outfit-grid">
                {Object.entries(result.fixedItems).map(([category, item]) => (
                  <div key={category} className="clothing-item fixed">
                    <img src={item.imageUrl} alt={category} />
                    <p>{category}</p>
                    <span className="fixed-badge">고정</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(result.recommendations).length > 0 && (
            <div className="recommendations-section">
              <h2>✨ 새로운 추천</h2>
              {Object.entries(result.recommendations).map(([category, items]) => (
                <div key={category} className="category-recommendations">
                  <h3>{category}</h3>
                  <div className="outfit-grid">
                    {items.map((item) => (
                      <div key={item.id} className="clothing-item">
                        <img src={item.imageUrl} alt={item.subCategory} />
                        <p>{item.subCategory}</p>
                        <div className="item-stats">
                          <span>⭐ {item.userRating.toFixed(1)}</span>
                          <span>👕 {item.wearCount}회</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConversationalRecommendationPage;
