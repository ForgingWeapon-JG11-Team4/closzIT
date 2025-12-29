import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import WheelDatePicker from '../../components/WheelDatePicker';

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

const UserProfileSetup1 = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';
  
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    birthday: null, // { year, month, day } 객체로 변경
    province: '',
    city: ''
  });
  const [isValid, setIsValid] = useState(false);
  const [availableCities, setAvailableCities] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // 기존 사용자 데이터 불러오기
  useEffect(() => {
    const fetchExistingData = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsLoaded(true);
        return;
      }

      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
        const response = await fetch(`${backendUrl}/user/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const userData = await response.json();
          
          // 생년월일 파싱
          let birthday = null;
          if (userData.birthday) {
            const date = new Date(userData.birthday);
            birthday = {
              year: date.getFullYear(),
              month: date.getMonth() + 1,
              day: date.getDate()
            };
          }

          // 도 설정 시 시/군/구 목록도 설정
          if (userData.province) {
            setAvailableCities(locationData[userData.province] || []);
          }

          setFormData({
            name: userData.name || '',
            gender: userData.gender || '',
            birthday: birthday,
            province: userData.province || '',
            city: userData.city || ''
          });
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchExistingData();
  }, []);

  useEffect(() => {
    const { name, gender, birthday, province, city } = formData;
    setIsValid(name.trim() !== '' && gender !== '' && birthday !== null && province !== '' && city !== '');
  }, [formData]);

  // 도가 변경되면 해당 시/군/구 목록 업데이트
  useEffect(() => {
    if (formData.province && isLoaded) {
      setAvailableCities(locationData[formData.province] || []);
      // 도가 바뀌면 시 초기화 (최초 로드 시에는 초기화하지 않음)
      setFormData(prev => ({ ...prev, city: '' }));
    }
  }, [formData.province, isLoaded]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 생년월일 변경 핸들러
  const handleBirthdayChange = (dateObj) => {
    setFormData(prev => ({
      ...prev,
      birthday: dateObj
    }));
  };

  // 생년월일 표시 형식
  const formatBirthday = (birthday) => {
    if (!birthday) return '';
    return `${birthday.year}. ${birthday.month}. ${birthday.day}.`;
  };

  const handleNext = () => {
    if (isValid) {
      // localStorage에 유저 정보 저장
      localStorage.setItem('userProfile', JSON.stringify(formData));
      // edit 모드면 파라미터 유지
      navigate(isEditMode ? '/setup/profile2?edit=true' : '/setup/profile2');
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-sans text-text-light dark:text-text-dark antialiased transition-colors duration-200 min-h-screen">
      <div className="max-w-md mx-auto min-h-screen relative flex flex-col px-6 py-8">
        <header className="flex items-center justify-between mb-8">
          <button 
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-text-light dark:text-text-dark transition-colors" 
            type="button"
            onClick={() => navigate(-1)}
          >
            <span className="material-icons-round text-2xl">arrow_back</span>
          </button>
          <div className="flex space-x-2">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
          </div>
          <div className="w-8"></div> 
        </header>

        <main className="flex-grow flex flex-col space-y-8">
          <div>
            <h1 className="text-2xl font-bold mb-2">기본 정보를 입력해주세요</h1>
            <p className="text-text-muted-light dark:text-text-muted-dark text-sm">더 정확한 스타일 추천을 위해 필요해요.</p>
          </div>

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2 group">
              <label 
                className="block text-sm font-medium text-text-light dark:text-text-dark group-focus-within:text-primary transition-colors" 
                htmlFor="name"
              >
                이름을 알려주세요!
              </label>
              <div className="relative">
                <input 
                  className="block w-full px-4 py-3 rounded-xl border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent transition shadow-sm outline-none border" 
                  id="name" 
                  name="name" 
                  placeholder="닉네임을 입력해주세요" 
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                />
                <span className="absolute right-3 top-3 text-gray-400 dark:text-gray-500 material-icons-round">edit</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-light dark:text-text-dark">
                성별을 알려주세요
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="cursor-pointer relative">
                  <input 
                    className="peer sr-only" 
                    name="gender" 
                    type="radio" 
                    value="female"
                    checked={formData.gender === 'female'}
                    onChange={handleChange}
                  />
                  <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark text-center hover:bg-gray-50 dark:hover:bg-gray-800 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-all duration-200">
                    <span className="block text-sm font-medium">여성</span>
                  </div>
                </label>
                <label className="cursor-pointer relative">
                  <input 
                    className="peer sr-only" 
                    name="gender" 
                    type="radio" 
                    value="male"
                    checked={formData.gender === 'male'}
                    onChange={handleChange}
                  />
                  <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark text-center hover:bg-gray-50 dark:hover:bg-gray-800 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-all duration-200">
                    <span className="block text-sm font-medium">남성</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-2 group">
              <label 
                className="block text-sm font-medium text-text-light dark:text-text-dark group-focus-within:text-primary transition-colors" 
              >
                생일을 알려주세요
              </label>
              <div 
                className="block w-full px-4 py-3 rounded-xl border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark transition shadow-sm outline-none border cursor-pointer hover:border-primary"
                onClick={() => setShowDatePicker(true)}
              >
                {formData.birthday 
                  ? formatBirthday(formData.birthday)
                  : <span className="text-gray-400 dark:text-gray-500">생년월일 선택</span>
                }
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                입력하신 생년월일은 다른 사용자에게 공개되지 않아요
              </p>
            </div>

            <div className="space-y-2 group">
              <label className="block text-sm font-medium text-text-light dark:text-text-dark group-focus-within:text-primary transition-colors">
                어디에 살고 있나요?
              </label>
              
              {/* 도/광역시 선택 */}
              <div className="relative">
                <select
                  className="block w-full px-4 py-3 rounded-xl border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary focus:border-transparent transition shadow-sm outline-none border appearance-none cursor-pointer"
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                >
                  <option value="">도/광역시 선택</option>
                  {provinces.map(province => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </select>
                <span className="absolute right-3 top-3 text-gray-400 dark:text-gray-500 material-icons-round pointer-events-none">expand_more</span>
              </div>

              {/* 시/군/구 선택 */}
              <div className="relative">
                <select
                  className="block w-full px-4 py-3 rounded-xl border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary focus:border-transparent transition shadow-sm outline-none border appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  disabled={!formData.province}
                >
                  <option value="">시/군/구 선택</option>
                  {availableCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <span className="absolute right-3 top-3 text-gray-400 dark:text-gray-500 material-icons-round pointer-events-none">expand_more</span>
              </div>
            </div>
          </form>
        </main>

        <footer className="mt-8 mb-4 sticky bottom-4 z-10 w-full">
          <button 
            className={`w-full font-bold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center space-x-2 transition-all duration-200
              ${isValid 
                ? 'bg-primary hover:bg-green-600 text-white hover:shadow-xl transform active:scale-[0.98]' 
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'}`}
            disabled={!isValid}
            onClick={handleNext}
          >
            <span>다음</span>
            <span className="material-icons-round">arrow_forward</span>
          </button>
        </footer>
      </div>

      {/* Wheel Date Picker Modal */}
      {showDatePicker && (
        <WheelDatePicker
          value={formData.birthday}
          onChange={handleBirthdayChange}
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </div>
  );
};

export default UserProfileSetup1;
