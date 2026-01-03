// src/recommendation/services/embedding.service.ts

import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface EmbeddingResponse {
  embedding: number[];
}

@Injectable()
export class EmbeddingService {
  private aiServerUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.aiServerUrl = this.configService.get('FASTAPI_URL') || 'http://localhost:8000';
  }

  /**
   * 텍스트 → 벡터 변환 (CLIP)
   */
  async getTextEmbedding(text: string): Promise<number[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<{ embeddings: number[][] }>(
          `${this.aiServerUrl}/embed-text`,  // 경로 수정
          { texts: [text] }                  // 배열로 전송
        )
      );
      return response.data.embeddings[0];   // 첫 번째 결과 반환
    } catch (error) {
      console.error('Failed to get text embedding:', error);
      throw new Error('임베딩 생성 실패');
    }
  }

  /**
   * 이미지 → 벡터 변환 (CLIP)
   */
  async getImageEmbedding(imageUrl: string): Promise<number[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<EmbeddingResponse>(
          `${this.aiServerUrl}/embedding/image`,
          { image_url: imageUrl }
        )
      );
      return response.data.embedding;
    } catch (error) {
      console.error('Failed to get image embedding:', error);
      throw new Error('이미지 임베딩 생성 실패');
    }
  }
}