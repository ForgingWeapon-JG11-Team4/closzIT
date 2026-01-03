// src/recommendation/dto/feedback-request.dto.ts

import { IsArray, IsString, IsIn, IsOptional } from 'class-validator';

export class FeedbackRequestDto {
  @IsOptional()
  @IsString()
  outer_id?: string;

  @IsString()
  top_id: string;

  @IsString()
  bottom_id: string;

  @IsString()
  shoes_id: string;

  @IsIn(['accept', 'reject', 'worn'])
  feedback_type: 'accept' | 'reject' | 'worn';
}