import React, { useState, useRef, useEffect } from 'react';

// 휠 아이템 리스트 생성
const generateYears = () => {
  const years = [];
  for (let i = 1950; i <= new Date().getFullYear(); i++) {
    years.push(i);
  }
  return years;
};

const months = Array.from({ length: 12 }, (_, i) => i + 1);

const generateDays = (year, month) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => i + 1);
};

const years = generateYears();

// 휠 컬럼 컴포넌트
const WheelColumn = ({ items, value, onChange, suffix }) => {
  const containerRef = useRef(null);
  const itemHeight = 32; // 40에서 32로 축소
  const visibleItems = 3; // 5에서 3으로 축소

  const currentIndex = items.indexOf(value);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = currentIndex * itemHeight;
    }
  }, [currentIndex]);

  const handleScroll = () => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      const newIndex = Math.round(scrollTop / itemHeight);
      if (newIndex >= 0 && newIndex < items.length && items[newIndex] !== value) {
        onChange(items[newIndex]);
      }
    }
  };

  return (
    <div className="relative flex-1">
      {/* 선택 하이라이트 */}
      <div 
        className="absolute left-0 right-0 pointer-events-none z-10"
        style={{ 
          top: `${(visibleItems - 1) / 2 * itemHeight}px`,
          height: `${itemHeight}px`,
          background: 'rgba(0,0,0,0.05)'
        }}
      />
      {/* 상단/하단 그라데이션 */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white dark:from-gray-900 to-transparent pointer-events-none z-20" />
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none z-20" />
      
      <div
        ref={containerRef}
        className="overflow-y-scroll hide-scrollbar"
        style={{ 
          height: `${visibleItems * itemHeight}px`,
          scrollSnapType: 'y mandatory'
        }}
        onScroll={handleScroll}
      >
        {/* 상단 패딩 */}
        <div style={{ height: `${((visibleItems - 1) / 2) * itemHeight}px` }} />
        
        {items.map((item) => (
          <div
            key={item}
            className={`flex items-center justify-center text-lg transition-all ${
              item === value 
                ? 'text-gray-900 dark:text-white font-bold' 
                : 'text-gray-400 dark:text-gray-500'
            }`}
            style={{ 
              height: `${itemHeight}px`,
              scrollSnapAlign: 'center'
            }}
          >
            {item}{suffix}
          </div>
        ))}
        
        {/* 하단 패딩 */}
        <div style={{ height: `${((visibleItems - 1) / 2) * itemHeight}px` }} />
      </div>
    </div>
  );
};

const WheelDatePicker = ({ value, onChange, onClose }) => {
  const [selectedYear, setSelectedYear] = useState(value?.year || 2000);
  const [selectedMonth, setSelectedMonth] = useState(value?.month || 1);
  const [selectedDay, setSelectedDay] = useState(value?.day || 1);

  const days = generateDays(selectedYear, selectedMonth);

  // 선택된 일이 해당 월에 없으면 조정
  useEffect(() => {
    if (selectedDay > days.length) {
      setSelectedDay(days.length);
    }
  }, [selectedYear, selectedMonth, days.length, selectedDay]);

  const handleConfirm = () => {
    onChange({
      year: selectedYear,
      month: selectedMonth,
      day: selectedDay
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl p-6 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            취소
          </button>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">생일 선택</h3>
          <button 
            onClick={handleConfirm}
            className="text-primary font-bold"
          >
            확인
          </button>
        </div>

        <div className="flex gap-2" style={{ height: '96px' }}>
          <WheelColumn
            items={years}
            value={selectedYear}
            onChange={setSelectedYear}
            suffix="년"
          />
          <WheelColumn
            items={months}
            value={selectedMonth}
            onChange={setSelectedMonth}
            suffix="월"
          />
          <WheelColumn
            items={days}
            value={selectedDay}
            onChange={setSelectedDay}
            suffix="일"
          />
        </div>
      </div>
    </div>
  );
};

export default WheelDatePicker;
