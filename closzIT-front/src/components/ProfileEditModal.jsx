import React, { useState, useEffect } from 'react';
import WheelDatePicker from './WheelDatePicker';

// 도/시 데이터
const locationData = {
  '서울특별시': ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
  '부산광역시': ['강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구'],
  '대구광역시': ['남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구'],
  '인천광역시': ['강화군', '계양구', '남동구', '동구', '미추홀구', '부평구', '서구', '연수구', '옹진군', '중구'],
  '광주광역시': ['광산구', '남구', '동구', '북구', '서구'],
  '대전광역시': ['대덕구', '동구', '서구', '유성구', '중구'],
  '울산광역시': ['남구', '동구', '북구', '울주군', '중구'],
  '세종특별자치시': ['세종시'],
  '경기도': ['가평군', '고양시', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시', '남양주시', '동두천시', '부천시', '성남시', '수원시', '시흥시', '안산시', '안성시', '안양시', '양주시', '양평군', '여주시', '연천군', '오산시', '용인시', '의왕시', '의정부시', '이천시', '파주시', '평택시', '포천시', '하남시', '화성시'],
  '강원도': ['강릉시', '고성군', '동해시', '삼척시', '속초시', '양구군', '양양군', '영월군', '원주시', '인제군', '정선군', '철원군', '춘천시', '태백시', '평창군', '홍천군', '화천군', '횡성군'],
  '충청북도': ['괴산군', '단양군', '보은군', '영동군', '옥천군', '음성군', '제천시', '증평군', '진천군', '청주시', '충주시'],
  '충청남도': ['계룡시', '공주시', '금산군', '논산시', '당진시', '보령시', '부여군', '서산시', '서천군', '아산시', '예산군', '천안시', '청양군', '태안군', '홍성군'],
  '전라북도': ['고창군', '군산시', '김제시', '남원시', '무주군', '부안군', '순창군', '완주군', '익산시', '임실군', '장수군', '전주시', '정읍시', '진안군'],
  '전라남도': ['강진군', '고흥군', '곡성군', '광양시', '구례군', '나주시', '담양군', '목포시', '무안군', '보성군', '순천시', '신안군', '여수시', '영광군', '영암군', '완도군', '장성군', '장흥군', '진도군', '함평군', '해남군', '화순군'],
  '경상북도': ['경산시', '경주시', '고령군', '구미시', '군위군', '김천시', '문경시', '봉화군', '상주시', '성주군', '안동시', '영덕군', '영양군', '영주시', '영천시', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군', '포항시'],
  '경상남도': ['거제시', '거창군', '고성군', '김해시', '남해군', '밀양시', '사천시', '산청군', '양산시', '의령군', '진주시', '창녕군', '창원시', '통영시', '하동군', '함안군', '함양군', '합천군'],
  '제주특별자치도': ['서귀포시', '제주시'],
};

const provinces = Object.keys(locationData);

const styleOptions = ['캐주얼', '모던', '스트릿', '포멀', '빈티지', '미니멀', '스포티', '로맨틱', '클래식', '힙'];

const ProfileEditModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'style'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // 기본 정보
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState(null);
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [availableCities, setAvailableCities] = useState([]);
  
  // 스타일 정보
  const [hairColor, setHairColor] = useState('');
  const [personalColor, setPersonalColor] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [preferredStyles, setPreferredStyles] = useState([]);

  // 초기 데이터 로드
  useEffect(() => {
    if (initialData && isOpen) {
      setName(initialData.name || '');
      setGender(initialData.gender || '');
      
      if (initialData.birthday) {
        const date = new Date(initialData.birthday);
        setBirthday({
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate()
        });
      }
      
      setProvince(initialData.province || '');
      setCity(initialData.city || '');
      if (initialData.province) {
        setAvailableCities(locationData[initialData.province] || []);
      }
      
      setHairColor(initialData.hairColor || '');
      setPersonalColor(initialData.personalColor || '');
      setHeight(initialData.height ? String(initialData.height) : '');
      setWeight(initialData.weight ? String(initialData.weight) : '');
      setBodyType(initialData.bodyType || '');
      setPreferredStyles(initialData.preferredStyles || []);
    }
  }, [initialData, isOpen]);

  // 도 선택 시 시 목록 업데이트
  useEffect(() => {
    if (province) {
      setAvailableCities(locationData[province] || []);
      if (!locationData[province]?.includes(city)) {
        setCity('');
      }
    }
  }, [province, city]);

  const toggleStyle = (style) => {
    setPreferredStyles(prev => 
      prev.includes(style) 
        ? prev.filter(s => s !== style)
        : [...prev, style]
    );
  };

  const formatBirthday = (bd) => {
    if (!bd) return '';
    return `${bd.year}. ${bd.month}. ${bd.day}.`;
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      
      let birthdayStr = null;
      if (birthday) {
        birthdayStr = `${birthday.year}-${String(birthday.month).padStart(2, '0')}-${String(birthday.day).padStart(2, '0')}`;
      }

      const profileData = {
        name,
        gender,
        birthday: birthdayStr,
        province,
        city,
        hairColor,
        personalColor,
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        bodyType,
        preferredStyles
      };

      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        throw new Error('프로필 저장에 실패했습니다');
      }

      onSave && onSave();
      onClose();
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.message || '오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 animate-fadeIn"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] bg-cream dark:bg-[#1A1918] rounded-t-3xl shadow-2xl animate-slideUp overflow-hidden flex flex-col">
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1.5 rounded-full bg-charcoal-light/30 dark:bg-cream-dark/30" />
        </div>
        
        {/* Header */}
        <div className="px-6 pb-4 flex items-center justify-between border-b border-gold-light/20">
          <h2 className="text-xl font-bold text-charcoal dark:text-cream">프로필 수정</h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gold-light/20 transition-colors"
          >
            <span className="material-symbols-rounded text-2xl text-charcoal dark:text-cream">close</span>
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="px-6 pt-4 flex gap-2">
          <button
            onClick={() => setActiveTab('basic')}
            className={`flex-1 py-2.5 rounded-xl font-medium transition-colors ${
              activeTab === 'basic' 
                ? 'bg-gold text-warm-white' 
                : 'bg-warm-white dark:bg-charcoal text-charcoal dark:text-cream border border-gold-light/30'
            }`}
          >
            기본 정보
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`flex-1 py-2.5 rounded-xl font-medium transition-colors ${
              activeTab === 'style' 
                ? 'bg-gold text-warm-white' 
                : 'bg-warm-white dark:bg-charcoal text-charcoal dark:text-cream border border-gold-light/30'
            }`}
          >
            스타일 정보
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {activeTab === 'basic' ? (
            <>
              {/* 이름 */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-charcoal dark:text-cream">이름</label>
                <input 
                  className="w-full px-4 py-3.5 rounded-xl border border-gold-light/30 bg-warm-white dark:bg-charcoal/50 text-charcoal dark:text-cream focus:ring-2 focus:ring-gold outline-none" 
                  placeholder="이름을 입력해주세요"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* 성별 */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-charcoal dark:text-cream">성별</label>
                <div className="grid grid-cols-2 gap-3">
                  {['male', 'female'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`py-3 rounded-xl font-medium transition-colors ${
                        gender === g 
                          ? 'bg-gold text-warm-white' 
                          : 'bg-warm-white dark:bg-charcoal text-charcoal dark:text-cream border border-gold-light/30'
                      }`}
                    >
                      {g === 'male' ? '남성' : '여성'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 생년월일 */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-charcoal dark:text-cream">생년월일</label>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className="w-full px-4 py-3.5 rounded-xl border border-gold-light/30 bg-warm-white dark:bg-charcoal/50 text-charcoal dark:text-cream text-left"
                >
                  {birthday ? formatBirthday(birthday) : '선택해주세요'}
                </button>
              </div>

              {/* 지역 */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-charcoal dark:text-cream">지역</label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full px-3 py-3.5 rounded-xl border border-gold-light/30 bg-warm-white dark:bg-charcoal/50 text-charcoal dark:text-cream appearance-none"
                  >
                    <option value="">시/도</option>
                    {provinces.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!province}
                    className="w-full px-3 py-3.5 rounded-xl border border-gold-light/30 bg-warm-white dark:bg-charcoal/50 text-charcoal dark:text-cream appearance-none disabled:opacity-50"
                  >
                    <option value="">시/군/구</option>
                    {availableCities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 머리 색깔 */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-charcoal dark:text-cream">머리 색깔</label>
                <select
                  value={hairColor}
                  onChange={(e) => setHairColor(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-gold-light/30 bg-warm-white dark:bg-charcoal/50 text-charcoal dark:text-cream appearance-none"
                >
                  <option value="">선택해주세요</option>
                  <option value="black">검정색</option>
                  <option value="darkbrown">진한 갈색</option>
                  <option value="lightbrown">밝은 갈색</option>
                  <option value="blonde">금발</option>
                  <option value="other">기타</option>
                </select>
              </div>

              {/* 퍼스널 컬러 */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-charcoal dark:text-cream">퍼스널 컬러</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'spring', label: '봄 웜톤' },
                    { value: 'summer', label: '여름 쿨톤' },
                    { value: 'autumn', label: '가을 웜톤' },
                    { value: 'winter', label: '겨울 쿨톤' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPersonalColor(value)}
                      className={`py-3 rounded-xl font-medium text-sm transition-colors ${
                        personalColor === value 
                          ? 'bg-gold text-warm-white' 
                          : 'bg-warm-white dark:bg-charcoal text-charcoal dark:text-cream border border-gold-light/30'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 키/몸무게 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-charcoal dark:text-cream">키 (cm)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="170"
                    className="w-full px-4 py-3.5 rounded-xl border border-gold-light/30 bg-warm-white dark:bg-charcoal/50 text-charcoal dark:text-cream outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-charcoal dark:text-cream">몸무게 (kg)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="65"
                    className="w-full px-4 py-3.5 rounded-xl border border-gold-light/30 bg-warm-white dark:bg-charcoal/50 text-charcoal dark:text-cream outline-none"
                  />
                </div>
              </div>

              {/* 체형 */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-charcoal dark:text-cream">체형</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'triangle', label: '삼각형' },
                    { value: 'invertedTriangle', label: '역삼각형' },
                    { value: 'oval', label: '둥근형' },
                    { value: 'rectangle', label: '직사각형' },
                    { value: 'trapezoid', label: '사다리꼴' },
                    { value: 'unknown', label: '잘 모르겠어요' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setBodyType(value)}
                      className={`py-2.5 rounded-xl font-medium text-xs transition-colors ${
                        bodyType === value 
                          ? 'bg-gold text-warm-white' 
                          : 'bg-warm-white dark:bg-charcoal text-charcoal dark:text-cream border border-gold-light/30'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 선호 스타일 */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-charcoal dark:text-cream">선호 스타일</label>
                <div className="flex flex-wrap gap-2">
                  {styleOptions.map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => toggleStyle(style)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        preferredStyles.includes(style) 
                          ? 'bg-gold text-warm-white' 
                          : 'bg-warm-white dark:bg-charcoal text-charcoal dark:text-cream border border-gold-light/30'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Save Button */}
        <div className="p-6 border-t border-gold-light/20">
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="w-full py-4 btn-premium rounded-xl font-bold text-warm-white disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-warm-white/30 border-t-warm-white rounded-full animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <span className="material-symbols-rounded">check</span>
                저장하기
              </>
            )}
          </button>
        </div>
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <WheelDatePicker
          initialDate={birthday}
          onConfirm={(date) => {
            setBirthday(date);
            setShowDatePicker(false);
          }}
          onCancel={() => setShowDatePicker(false)}
        />
      )}
    </>
  );
};

export default ProfileEditModal;
