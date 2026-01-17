import { Controller, Post, Body, HttpException, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { BarcodeService, ImageResult } from './barcode.service';

@Controller('api/barcode')
export class BarcodeController {
  constructor(private readonly barcodeService: BarcodeService) { }

  @Post('search-images')
  async searchImages(@Body() body: { barcode: string }): Promise<{ success: boolean; barcode: string; images: ImageResult[] }> {
    const { barcode } = body;

    if (!barcode) {
      throw new HttpException('바코드가 필요합니다.', HttpStatus.BAD_REQUEST);
    }

    try {
      const images = await this.barcodeService.searchImagesByBarcode(barcode);
      return {
        success: true,
        barcode,
        images,
      };
    } catch (error) {
      console.error('Barcode image search error:', error);
      throw new HttpException(
        '이미지 검색 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 이미지를 base64로 변환하여 반환
  @Post('fetch-base64')
  async fetchBase64(@Body() body: { imageUrl: string }): Promise<{ success: boolean; base64: string | null }> {
    const { imageUrl } = body;

    if (!imageUrl) {
      throw new HttpException('이미지 URL이 필요합니다.', HttpStatus.BAD_REQUEST);
    }

    try {
      const base64 = await this.barcodeService.fetchImageAsBase64Public(imageUrl);
      return {
        success: !!base64,
        base64,
      };
    } catch (error) {
      console.error('Base64 fetch error:', error);
      return {
        success: false,
        base64: null,
      };
    }
  }

  // 이미지 프록시 - CORS 우회용
  @Post('proxy-image')
  async proxyImage(
    @Body() body: { imageUrl: string },
    @Res() res: Response,
  ): Promise<void> {
    const { imageUrl } = body;

    if (!imageUrl) {
      throw new HttpException('이미지 URL이 필요합니다.', HttpStatus.BAD_REQUEST);
    }

    try {
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/*,*/*',
          'Referer': new URL(imageUrl).origin,
        },
      });

      if (!response.ok) {
        console.error('Image fetch failed:', response.status, response.statusText);
        throw new HttpException('이미지를 가져올 수 없습니다.', HttpStatus.BAD_GATEWAY);
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=3600');
      res.send(buffer);
    } catch (error) {
      console.error('Image proxy error:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '이미지 프록시 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
