// src/recommendation/dto/search-request.dto.ts

import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class SearchRequestDto {
  @IsString()
  calendarEvent: string;  // 캘린더 일정 제목 (필수)

  @IsOptional()
  @IsBoolean()
  isToday?: boolean;  // 오늘 일정 여부

  @IsOptional()
  @IsString()
  date?: string;  // 날짜 (YYYY-MM-DD), 없으면 오늘/내일 자동 판단
}