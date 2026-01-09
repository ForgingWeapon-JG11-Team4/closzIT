import { Controller, Post, Body, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { VtonCacheService } from './vton-cache.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('vton-cache')
@UseGuards(JwtAuthGuard)
export class VtonCacheController {
  constructor(
    private readonly vtonCacheService: VtonCacheService,
    private readonly prismaService: PrismaService,
  ) { }

  /**
   * 사람 이미지 전처리 및 캐싱
   * POST /vton-cache/preprocess-human
   */
  @Post('preprocess-human')
  async preprocessHuman(@Request() req, @Body('image_base64') imageBase64: string) {
    const userId = req.user.userId;

    if (!imageBase64) {
      throw new HttpException('image_base64 is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const cacheData = await this.vtonCacheService.preprocessAndCacheHuman(userId, imageBase64);

      // User 테이블에 캐시 메타데이터 저장 (선택사항)
      await this.prismaService.user.update({
        where: { id: userId },
        data: {
          // 커스텀 필드가 있다면 여기에 저장 (예: vtonCacheData JSON field)
          // vtonHumanCache: cacheData as any
        },
      });

      return {
        success: true,
        message: 'Human preprocessing completed and cached',
        cache: cacheData,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Human preprocessing failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 옷 이미지 전처리 및 캐싱
   * POST /vton-cache/preprocess-garment
   */
  @Post('preprocess-garment')
  async preprocessGarment(
    @Request() req,
    @Body('clothing_id') clothingId: string,
    @Body('image_base64') imageBase64: string
  ) {
    const userId = req.user.userId;

    if (!clothingId || !imageBase64) {
      throw new HttpException('clothing_id and image_base64 are required', HttpStatus.BAD_REQUEST);
    }

    try {
      const cacheData = await this.vtonCacheService.preprocessAndCacheGarment(
        userId,
        clothingId,
        imageBase64
      );

      // Clothing 테이블에 캐시 메타데이터 저장 (선택사항)
      await this.prismaService.clothing.update({
        where: { id: clothingId },
        data: {
          // 커스텀 필드가 있다면 여기에 저장
          // vtonGarmentCache: cacheData as any
        },
      });

      return {
        success: true,
        message: 'Garment preprocessing completed and cached',
        cache: cacheData,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Garment preprocessing failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 텍스트 임베딩 생성 및 캐싱 (Claude 라벨링 결과 활용)
   * POST /vton-cache/preprocess-text
   */
  @Post('preprocess-text')
  async preprocessText(
    @Request() req,
    @Body('clothing_id') clothingId: string,
    @Body('garment_description') garmentDescription: string
  ) {
    const userId = req.user.userId;

    if (!clothingId || !garmentDescription) {
      throw new HttpException('clothing_id and garment_description are required', HttpStatus.BAD_REQUEST);
    }

    try {
      const cacheData = await this.vtonCacheService.preprocessAndCacheText(
        userId,
        clothingId,
        garmentDescription
      );

      return {
        success: true,
        message: 'Text embedding completed and cached',
        cache: cacheData,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Text preprocessing failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 단일 옷 가상 피팅 (캐시된 데이터 사용 - Diffusion만 실행)
   * POST /vton-cache/generate-tryon
   */
  @Post('generate-tryon')
  async generateTryOn(
    @Request() req,
    @Body('clothing_id') clothingId: string,
    @Body('denoise_steps') denoiseSteps?: number,
    @Body('seed') seed?: number
  ) {
    const userId = req.user.userId;

    if (!clothingId) {
      throw new HttpException('clothing_id is required', HttpStatus.BAD_REQUEST);
    }

    try {
      // 캐시 존재 여부 확인
      const humanCacheExists = await this.vtonCacheService.checkHumanCacheExists(userId);
      const garmentCacheExists = await this.vtonCacheService.checkGarmentCacheExists(userId, clothingId);

      if (!humanCacheExists) {
        throw new HttpException(
          'Human cache not found. Please preprocess human image first.',
          HttpStatus.BAD_REQUEST
        );
      }

      if (!garmentCacheExists) {
        throw new HttpException(
          'Garment cache not found. Please preprocess garment image first.',
          HttpStatus.BAD_REQUEST
        );
      }

      // Diffusion 생성
      const resultImageBase64 = await this.vtonCacheService.generateTryOn(
        userId,
        clothingId,
        String(denoiseSteps || 20),
        seed || 42
      );

      return {
        success: true,
        message: 'Virtual try-on generated successfully',
        imageUrl: `data:image/png;base64,${resultImageBase64}`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Virtual try-on generation failed',
          error: error.message,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 캐시 상태 확인
   * POST /vton-cache/check-status
   */
  @Post('check-status')
  async checkCacheStatus(@Request() req, @Body('clothing_id') clothingId?: string) {
    const userId = req.user.userId;

    try {
      const humanCacheExists = await this.vtonCacheService.checkHumanCacheExists(userId);
      let garmentCacheExists = false;

      if (clothingId) {
        garmentCacheExists = await this.vtonCacheService.checkGarmentCacheExists(userId, clothingId);
      }

      return {
        success: true,
        humanCache: humanCacheExists,
        garmentCache: clothingId ? garmentCacheExists : null,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to check cache status',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
