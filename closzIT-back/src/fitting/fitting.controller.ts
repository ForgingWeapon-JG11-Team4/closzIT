import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FittingService } from './fitting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { VtonCacheService } from '../vton-cache/vton-cache.service';
import { S3Service } from '../s3/s3.service';

@Controller('api/fitting')
@UseGuards(JwtAuthGuard)
export class FittingController {
  constructor(
    private readonly fittingService: FittingService,
    private readonly prisma: PrismaService,
    private readonly vtonCacheService: VtonCacheService,
    private readonly s3Service: S3Service,
  ) {}

  @Post('virtual-try-on')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'person', maxCount: 1 },
      { name: 'outer', maxCount: 1 },
      { name: 'top', maxCount: 1 },
      { name: 'bottom', maxCount: 1 },
      { name: 'shoes', maxCount: 1 },
    ]),
  )
  async virtualTryOn(
    @Request() req,
    @UploadedFiles()
    files: {
      person?: Express.Multer.File[];
      outer?: Express.Multer.File[];
      top?: Express.Multer.File[];
      bottom?: Express.Multer.File[];
      shoes?: Express.Multer.File[];
    },
  ) {
    const userId = req.user.id;
    console.log('VTO Request - userId:', userId);

    // 모든 필수 이미지가 있는지 확인
    if (
      !files.person?.[0] ||
      !files.outer?.[0] ||
      !files.top?.[0] ||
      !files.bottom?.[0] ||
      !files.shoes?.[0]
    ) {
      throw new BadRequestException(
        '5개의 이미지가 필요합니다: person, outer, top, bottom, shoes'
      );
    }

    const imageMap = {
      person: files.person[0],
      outer: files.outer[0],
      top: files.top[0],
      bottom: files.bottom[0],
      shoes: files.shoes[0],
    };

    const result = await this.fittingService.processVirtualFitting(imageMap, userId);
    return result;
  }

  @Post('partial-try-on')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'person', maxCount: 1 },
      { name: 'outer', maxCount: 1 },
      { name: 'top', maxCount: 1 },
      { name: 'bottom', maxCount: 1 },
      { name: 'shoes', maxCount: 1 },
    ]),
  )
  async partialTryOn(
    @Request() req,
    @UploadedFiles()
    files: {
      person?: Express.Multer.File[];
      outer?: Express.Multer.File[];
      top?: Express.Multer.File[];
      bottom?: Express.Multer.File[];
      shoes?: Express.Multer.File[];
    },
  ) {
    const userId = req.user.id;
    console.log('Partial VTO Request - userId:', userId);

    // person 이미지는 필수
    if (!files.person?.[0]) {
      throw new BadRequestException('전신 사진(person)은 필수입니다.');
    }

    // 최소 1개 이상의 의류 이미지가 있어야 함
    const hasOuter = !!files.outer?.[0];
    const hasTop = !!files.top?.[0];
    const hasBottom = !!files.bottom?.[0];
    const hasShoes = !!files.shoes?.[0];

    if (!hasOuter && !hasTop && !hasBottom && !hasShoes) {
      throw new BadRequestException('최소 1개 이상의 의류 이미지가 필요합니다.');
    }

    const imageMap = {
      person: files.person[0],
      outer: files.outer?.[0] || null,
      top: files.top?.[0] || null,
      bottom: files.bottom?.[0] || null,
      shoes: files.shoes?.[0] || null,
    };

    const result = await this.fittingService.processPartialFitting(imageMap, userId);
    return result;
  }

  @Post('partial-try-on-by-ids')
  async partialTryOnByIds(
    @Request() req,
    @Body() body: {
      outerId?: string;
      topId?: string;
      bottomId?: string;
      shoesId?: string;
    },
  ) {
    const userId = req.user.id;
    console.log('Partial VTO by IDs Request - userId:', userId);

    // 사용자의 전신 이미지 조회
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullBodyImage: true },
    });

    if (!user?.fullBodyImage) {
      throw new BadRequestException({
        success: false,
        code: 'NO_FULL_BODY_IMAGE',
        message: '피팅 모델 이미지가 없어서 착장서비스 이용이 불가합니다.',
      });
    }

    // 최소 1개 이상의 의류 ID가 있어야 함
    if (!body.outerId && !body.topId && !body.bottomId && !body.shoesId) {
      throw new BadRequestException({
        success: false,
        message: '최소 1개 이상의 의류를 선택해주세요.',
      });
    }

    // 의류 ID로 이미지 URL 조회
    const clothingUrls: {
      outer?: string;
      top?: string;
      bottom?: string;
      shoes?: string;
    } = {};

    const clothingIds = [body.outerId, body.topId, body.bottomId, body.shoesId].filter((id): id is string => !!id);
    
    if (clothingIds.length > 0) {
      const clothes = await this.prisma.clothing.findMany({
        where: {
          id: { in: clothingIds },
          userId, // 사용자 본인의 의류만 허용
        },
        select: {
          id: true,
          category: true,
          imageUrl: true,
          flattenImageUrl: true,
        },
      });

      for (const cloth of clothes) {
        // flattenImageUrl이 있으면 우선 사용
        const imageUrl = cloth.flattenImageUrl || cloth.imageUrl;
        
        if (cloth.id === body.outerId) {
          clothingUrls.outer = imageUrl;
        } else if (cloth.id === body.topId) {
          clothingUrls.top = imageUrl;
        } else if (cloth.id === body.bottomId) {
          clothingUrls.bottom = imageUrl;
        } else if (cloth.id === body.shoesId) {
          clothingUrls.shoes = imageUrl;
        }
      }
    }

    console.log('Clothing URLs found:', Object.keys(clothingUrls));

    // VTO 처리 (백엔드에서 S3 이미지 fetch)
    const result = await this.fittingService.processVirtualFittingFromUrls(
      user.fullBodyImage,
      clothingUrls,
      userId,
    );

    return result;
  }

  @Post('sns-virtual-try-on')
  async snsVirtualTryOn(
    @Request() req,
    @Body() body: { postId: string; clothingId: string },
  ) {
    const userId = req.user.id;
    console.log('[sns-virtual-try-on] Starting - userId:', userId, 'postId:', body.postId, 'clothingId:', body.clothingId);

    if (!body.clothingId) {
      throw new BadRequestException({
        success: false,
        message: 'clothingId is required',
      });
    }

    // 사용자의 전신 이미지 확인
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullBodyImage: true },
    });

    if (!user?.fullBodyImage) {
      throw new BadRequestException({
        success: false,
        code: 'NO_FULL_BODY_IMAGE',
        message: '피팅 모델 이미지가 없어서 착장서비스 이용이 불가합니다.',
      });
    }

    // 게시글의 태그된 의상인지 확인
    const postClothing = await this.prisma.postClothing.findFirst({
      where: {
        postId: body.postId,
        clothingId: body.clothingId,
      },
      include: {
        clothing: {
          select: {
            id: true,
            userId: true, // 옷 주인 ID
            imageUrl: true,
            flattenImageUrl: true,
            category: true,
            subCategory: true,
            colors: true,
            patterns: true,
            details: true,
          },
        },
      },
    });

    if (!postClothing) {
      throw new BadRequestException({
        success: false,
        message: '해당 게시글에 태그된 의상이 아닙니다.',
      });
    }

    const clothing = postClothing.clothing;
    const clothingOwnerId = clothing.userId; // 옷 주인 ID

    console.log(`[sns-virtual-try-on] Clothing owner: ${clothingOwnerId}, Current user: ${userId}`);

    // 1. Human 캐시 생성 (필요시)
    const humanCacheExists = await this.vtonCacheService.checkHumanCacheExists(userId);
    if (!humanCacheExists) {
      const imageBase64 = await this.fetchImageAsBase64(user.fullBodyImage);
      await this.vtonCacheService.preprocessAndCacheHuman(userId, imageBase64);
      console.log('[Cache] Human cache created');
    }

    // 2. Garment 캐시 생성 (필요시) - 옷 주인의 캐시 사용
    const garmentCacheExists = await this.vtonCacheService.checkGarmentCacheExists(clothingOwnerId, body.clothingId);
    if (!garmentCacheExists) {
      let imageUrl = clothing.flattenImageUrl || clothing.imageUrl;

      // S3 URL을 Pre-signed URL로 변환
      if (this.s3Service.isS3Url(imageUrl)) {
        const presignedUrl = await this.s3Service.convertToPresignedUrl(imageUrl);
        if (presignedUrl) {
          imageUrl = presignedUrl;
        }
      }

      const imageBase64 = await this.fetchImageAsBase64(imageUrl);
      await this.vtonCacheService.preprocessAndCacheGarment(clothingOwnerId, body.clothingId, imageBase64);
      console.log(`[Cache] Garment cache created for owner: ${clothingOwnerId}`);
    }

    // 3. Text 캐시 생성 (필요시) - 옷 주인의 캐시 사용
    const textCacheExists = await this.vtonCacheService.checkTextCacheExists(clothingOwnerId, body.clothingId);
    if (!textCacheExists) {
      const description = [
        clothing.category || '',
        clothing.subCategory || '',
        ...(clothing.colors || []),
        ...(clothing.patterns || []),
        ...(clothing.details || []),
      ].filter(Boolean).join(' ');

      await this.vtonCacheService.preprocessAndCacheText(clothingOwnerId, body.clothingId, description);
      console.log(`[Cache] Text cache created for owner: ${clothingOwnerId}`);
    }

    // 4. Category 매핑
    const categoryMap = {
      'tops': 'upper_body',
      'outerwear': 'upper_body',
      'bottoms': 'lower_body',
      'bottom': 'lower_body',
      'shoes': 'lower_body',
    };
    const vtonCategory = categoryMap[clothing.category?.toLowerCase() ?? ''] || 'upper_body';

    console.log(`[sns-virtual-try-on] Mapped VTON category: ${vtonCategory}`);

    // 5. IDM-VTON V2 API 호출 (내 사진 + 남의 옷)
    const resultImageBase64 = await this.vtonCacheService.generateTryOnV2(
      userId, // 내 전신 사진 사용
      body.clothingId,
      vtonCategory,
      10, // denoiseSteps
      42, // seed
      clothingOwnerId // 옷 주인의 캐시 사용
    );

    return {
      success: true,
      message: '가상 피팅이 완료되었습니다',
      imageUrl: `data:image/png;base64,${resultImageBase64}`,
      postId: body.postId,
      clothingId: body.clothingId,
    };
  }

  @Post('check-status')
  async checkStatus(@Body() body: { jobId: string }) {
    return await this.fittingService.checkJobStatus(body.jobId);
  }

  /**
   * 단일 옷 가상 피팅 (자동 캐싱 + V2 최적화)
   * POST /api/fitting/single-item-tryon
   */
  @Post('single-item-tryon')
  @UseGuards(JwtAuthGuard)
  async singleItemTryOn(@Request() req, @Body() body: { clothingId: string; category?: string; denoiseSteps?: number; seed?: number }) {
    const userId = req.user.id;
    console.log('[singleItemTryOn] Starting - userId:', userId, 'clothingId:', body.clothingId, 'category:', body.category);

    if (!body.clothingId) {
      throw new BadRequestException({
        success: false,
        message: 'clothingId is required',
      });
    }

    // 캐시 존재 확인
    const humanCacheExists = await this.vtonCacheService.checkHumanCacheExists(userId);
    const garmentCacheExists = await this.vtonCacheService.checkGarmentCacheExists(userId, body.clothingId);
    const textCacheExists = await this.vtonCacheService.checkTextCacheExists(userId, body.clothingId);

    console.log(`[Cache Check] human=${humanCacheExists}, garment=${garmentCacheExists}, text=${textCacheExists}`);

    // 1. Human 캐시 생성 (필요시)
    if (!humanCacheExists) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { fullBodyImage: true },
      });

      if (!user?.fullBodyImage) {
        throw new BadRequestException({
          success: false,
          code: 'NO_FULL_BODY_IMAGE',
          message: '피팅 모델 이미지가 없어서 착장서비스 이용이 불가합니다.',
        });
      }

      const imageBase64 = await this.fetchImageAsBase64(user.fullBodyImage);
      await this.vtonCacheService.preprocessAndCacheHuman(userId, imageBase64);
      console.log('[Cache] Human cache created');
    }

    // 2. Garment & Text 캐시 생성 (필요시)
    if (!garmentCacheExists || !textCacheExists) {
      const clothing = await this.prisma.clothing.findUnique({
        where: { id: body.clothingId, userId },
        select: {
          flattenImageUrl: true,
          imageUrl: true,
          category: true,
          subCategory: true,
          colors: true,
          patterns: true,
          details: true,
        },
      });

      if (!clothing) {
        throw new BadRequestException({
          success: false,
          message: '의류를 찾을 수 없습니다.',
        });
      }

      // Garment 캐시
      if (!garmentCacheExists) {
        const imageUrl = clothing.flattenImageUrl || clothing.imageUrl;
        const imageBase64 = await this.fetchImageAsBase64(imageUrl);
        await this.vtonCacheService.preprocessAndCacheGarment(userId, body.clothingId, imageBase64);
        console.log('[Cache] Garment cache created');
      }

      // Text 캐시
      if (!textCacheExists) {
        const description = [
          clothing.category || '',
          clothing.subCategory || '',
          ...(clothing.colors || []),
          ...(clothing.patterns || []),
          ...(clothing.details || []),
        ].filter(Boolean).join(' ');

        await this.vtonCacheService.preprocessAndCacheText(userId, body.clothingId, description);
        console.log('[Cache] Text cache created');
      }
    }

    // 3. V2 API 호출 (FastAPI가 S3 직접 다운로드)
    // category 매핑: "tops", "outerwear" → "upper_body", "bottoms", "shoes" → "lower_body"

    // Frontend에서 category를 보내면 그것을 사용, 아니면 DB에서 조회
    let clothingCategory = body.category;
    if (!clothingCategory) {
      const clothing = await this.prisma.clothing.findUnique({
        where: { id: body.clothingId, userId },
        select: { category: true },
      });
      clothingCategory = clothing?.category;
    }

    console.log(`[singleItemTryOn] Clothing category: ${clothingCategory}`);

    const categoryMap = {
      'tops': 'upper_body',
      'outerwear': 'upper_body',
      'bottoms': 'lower_body',
      'bottom' : 'lower_body',
      'shoes': 'lower_body',
    };
    const vtonCategory = categoryMap[clothingCategory?.toLowerCase() ?? ''] || 'upper_body';

    console.log(`[singleItemTryOn] Mapped VTON category: ${vtonCategory}`);

    const resultImageBase64 = await this.vtonCacheService.generateTryOnV2(
      userId,
      body.clothingId,
      vtonCategory,  // ⚡ category 전달
      body.denoiseSteps ?? 10,
      body.seed ?? 42,
    );

    return {
      success: true,
      message: '가상 피팅이 완료되었습니다',
      imageUrl: `data:image/png;base64,${resultImageBase64}`,
    };
  }

  @Post('batch-tryon')
  @UseGuards(JwtAuthGuard)
  async batchTryOn(@Request() req, @Body() body: { clothingIds: string[]; denoiseSteps?: number; seed?: number }) {
    /**
     * 배치 처리: 여러 옷을 동시에 입어보기
     */
    const userId = req.user.id;

    console.log('[batchTryOn] Starting batch try-on', { userId, count: body.clothingIds.length });

    // 배치 API 호출
    const results = await this.vtonCacheService.generateBatchTryOn(
      userId,
      body.clothingIds,
      body.denoiseSteps || 10,
      body.seed || 42,
    );

    return {
      success: true,
      message: `${body.clothingIds.length}개 옷 배치 피팅이 완료되었습니다`,
      results: results.map(r => ({
        clothingId: r.clothing_id,
        imageUrl: r.result_image_base64 ? `data:image/png;base64,${r.result_image_base64}` : null,
        processingTime: r.processing_time,
        success: r.success,
      })),
    };
  }

  /**
   * URL에서 이미지를 Base64로 변환
   */
  private async fetchImageAsBase64(url: string): Promise<string> {
    try {
      // Base64 Data URL인 경우 그대로 반환
      if (url.startsWith('data:image/')) {
        return url.split(',')[1];
      }

      // S3 URL인 경우 Pre-signed URL로 변환 후 fetch
      // (FittingService의 fetchImageAsBuffer 로직 참고)
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return buffer.toString('base64');
    } catch (error) {
      console.error(`Error fetching image from ${url}:`, error);
      throw error;
    }
  }
}



// 컨트롤러 호출 /////////////////////////////////////////////////////
// export class SomeOtherService {
//   constructor(private fittingService: FittingService) {}
  
//   async doSomething() {
//     // FittingService의 메서드를 직접 호출
//     const result = await this.fittingService.processVirtualFitting(images);
//     // HTTP 요청 없이 바로 메서드 실행
//   }
// }