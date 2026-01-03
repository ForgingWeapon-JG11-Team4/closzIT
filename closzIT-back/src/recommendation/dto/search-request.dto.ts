// src/recommendation/dto/search-request.dto.ts

import { IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';
import type { TPO } from '../types/clothing.types';

export class SearchRequestDto {
  @IsOptional()
  @IsString()
  tpo?: TPO;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}