import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Body,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FittingService } from './fitting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { VtonCacheService } from '../vton-cache/vton-cache.service';
import { S3Service } from '../s3/s3.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

@Controller('api/fitting')
@UseGuards(JwtAuthGuard)
export class FittingController {
  private readonly logger = new Logger(FittingController.name);
  private readonly s3Client: S3Client;

  constructor(
    private readonly fittingService: FittingService,
    private readonly prisma: PrismaService,
    private readonly vtonCacheService: VtonCacheService,
    private readonly s3Service: S3Service,
    @InjectQueue(process.env.VTO_QUEUE_NAME || 'vto-queue') private readonly vtoQueue: Queue,
  ) {
    // S3 Client 초기화
    this.s3Client = new S3Client({
      region: process.env.AWS_S3_REGION || 'ap-northeast-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

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
    
    // 해시 키 생성 (캐싱용) - 2개 이상 선택 시에만
    let hashKey: string | undefined;
    const sortedClothingIds = [...clothingIds].sort();
    
    if (clothingIds.length >= 1) {
      const modelHash = crypto.createHash('md5').update(user.fullBodyImage).digest('hex').slice(0, 8);
      hashKey = crypto.createHash('sha256')
        .update(`${userId}:${modelHash}:${sortedClothingIds.join(',')}`)
        .digest('hex');

      // 캐시 조회 (isVisible 무관 - 캐시 용도)
      const cachedResult = await this.prisma.vtoCache.findUnique({
        where: { hashKey },
      });

      if (cachedResult) {
        this.logger.log(`[VTO Cache] Cache hit for partial VTO hashKey: ${hashKey.slice(0, 16)}...`);
        
        // 캐시 히트 시 isVisible을 true로 업데이트 (삭제 후 재요청 시 다시 보이도록)
        if (cachedResult.isVisible !== true) {
          await this.prisma.vtoCache.update({
            where: { hashKey },
            data: { isVisible: true },
          });
        }

        const presignedUrl = await this.s3Service.convertToPresignedUrl(cachedResult.s3Url);
        return {
          success: true,
          cached: true,
          imageUrl: presignedUrl,
          message: '캐시된 결과를 반환합니다.',
        };
      }
      this.logger.log(`[VTO Cache] Cache miss for partial VTO hashKey: ${hashKey.slice(0, 16)}...`);
    }

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

    // 큐에 VTO 작업 등록 (hashKey, clothingIds 포함)
    this.logger.log(`[VTO Queue] Queuing partial VTO for user ${userId}`);
    
    try {
      const job = await this.vtoQueue.add('vto', {
        userId,
        personImageUrl: user.fullBodyImage,
        clothingUrls,
        type: 'partial-try-on-by-ids',
        hashKey,                    // 캐시 저장용 (2개 이상일 때만)
        clothingIds: sortedClothingIds,  // 캐시 저장용
      }, {
        removeOnComplete: { age: 300, count: 100 },
        removeOnFail: { age: 3600 },
      });

      this.logger.log(`[VTO Queue] Job ${job.id} queued for user ${userId}`);

      return {
        success: true,
        jobId: job.id,
        status: 'queued',
        message: '가상 착장 작업이 대기열에 추가되었습니다.',
      };
    } catch (error) {
      this.logger.error(`[VTO Queue] Error queuing job: ${error.message}`);
      throw error;
    }
  }
  /**
   * 한옷 입어보기 (IDM-VTON) - clothingId 필수
   * POST /api/fitting/sns-virtual-try-on
   */
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

    // 4. Category 매핑 및 clothingUrls 구성
    const categoryMap: Record<string, string> = {
      'tops': 'top',
      'outerwear': 'outer',
      'bottoms': 'bottom',
      'bottom': 'bottom',
      'shoes': 'shoes',
      'dresses':'dresses'
    };
    const clothingCategory = categoryMap[clothing.category?.toLowerCase() ?? ''] || 'top';

    // S3 URL을 Pre-signed URL로 변환
    let clothingImageUrl = clothing.flattenImageUrl || clothing.imageUrl;
    if (this.s3Service.isS3Url(clothingImageUrl)) {
      const presignedUrl = await this.s3Service.convertToPresignedUrl(clothingImageUrl);
      if (presignedUrl) {
        clothingImageUrl = presignedUrl;
      }
    }

    // clothingUrls 구성
    const clothingUrls: { outer?: string; top?: string; bottom?: string; shoes?: string } = {};
    clothingUrls[clothingCategory as keyof typeof clothingUrls] = clothingImageUrl;

    console.log(`[sns-virtual-try-on] Clothing category: ${clothingCategory}, URL ready`);

    // 5. 큐에 VTO 작업 등록 (즉시 jobId 반환)
    this.logger.log(`[VTO Queue] Queuing SNS VTO for user ${userId}, postId: ${body.postId}`);
    
    try {
      const job = await this.vtoQueue.add('vto', {
        userId,
        personImageUrl: user.fullBodyImage,
        clothingUrls,
        type: 'sns-virtual-try-on',
        postId: body.postId,
        clothingId: body.clothingId,
        clothingOwnerId, // 옷 주인 ID (캐시용)
      }, {
        removeOnComplete: { age: 300, count: 100 },
        removeOnFail: { age: 3600 },
      });

      this.logger.log(`[VTO Queue] Job ${job.id} queued for user ${userId}`);

      return {
        success: true,
        jobId: job.id,
        status: 'queued',
        postId: body.postId,
        message: 'SNS 가상 착장 작업이 대기열에 추가되었습니다.',
      };
    } catch (error) {
      this.logger.error(`[VTO Queue] Error queuing SNS VTO job: ${error.message}`);
      throw error;
    }
  }

  /**
   * 전체 입어보기 (Gemini API) - postId로 태그된 모든 옷
   * POST /api/fitting/sns-full-try-on
   */
  @Post('sns-full-try-on')
  async snsFullTryOn(
    @Request() req,
    @Body() body: { postId: string },
  ) {
    const userId = req.user.id;
    console.log('[sns-full-try-on] Starting - userId:', userId, 'postId:', body.postId);

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

    // 게시글에 태그된 모든 의상 조회
    const allPostClothes = await this.prisma.postClothing.findMany({
      where: { postId: body.postId },
      include: {
        clothing: {
          select: {
            id: true,
            imageUrl: true,
            flattenImageUrl: true,
            category: true,
          },
        },
      },
    });

    if (allPostClothes.length === 0) {
      throw new BadRequestException({
        success: false,
        message: '해당 게시글에 태그된 의상이 없습니다.',
      });
    }

    // clothingIds 추출 및 해시 키 생성
    const clothingIds = allPostClothes.map(pc => pc.clothing.id).sort();
    const modelHash = crypto.createHash('md5').update(user.fullBodyImage).digest('hex').slice(0, 8);
    const hashKey = crypto.createHash('sha256')
      .update(`${userId}:${modelHash}:${clothingIds.join(',')}`)
      .digest('hex');

    // DB 캐시 조회 (isVisible 무관 - 캐시 용도)
    const cachedResult = await this.prisma.vtoCache.findUnique({
      where: { hashKey },
    });

    if (cachedResult) {
      this.logger.log(`[VTO Cache] Cache hit for hashKey: ${hashKey.slice(0, 16)}...`);
      
      // 캐시 히트 시 isVisible을 true로 업데이트 (삭제 후 재요청 시 다시 보이도록)
      if (cachedResult.isVisible !== true) {
        await this.prisma.vtoCache.update({
          where: { hashKey },
          data: { isVisible: true },
        });
      }

      // S3 URL을 Pre-signed URL로 변환
      const presignedUrl = await this.s3Service.convertToPresignedUrl(cachedResult.s3Url);
      return {
        success: true,
        cached: true,
        imageUrl: presignedUrl,
        postId: body.postId,
        message: '캐시된 결과를 반환합니다.',
      };
    }

    this.logger.log(`[VTO Cache] Cache miss for hashKey: ${hashKey.slice(0, 16)}...`);

    // 카테고리별 clothingUrls 구성
    const categoryMap: Record<string, string> = {
      'top': 'top',
      'tops': 'top',
      'outer': 'outer',
      'outerwear': 'outer',
      'bottom': 'bottom',
      'bottoms': 'bottom',
      'shoes': 'shoes',
    };

    const clothingUrls: { outer?: string; top?: string; bottom?: string; shoes?: string } = {};

    for (const pc of allPostClothes) {
      const category = categoryMap[pc.clothing.category?.toLowerCase() ?? ''];
      if (category) {
        let imageUrl = pc.clothing.flattenImageUrl || pc.clothing.imageUrl;
        
        if (this.s3Service.isS3Url(imageUrl)) {
          const presignedUrl = await this.s3Service.convertToPresignedUrl(imageUrl);
          if (presignedUrl) {
            imageUrl = presignedUrl;
          }
        }

        clothingUrls[category as keyof typeof clothingUrls] = imageUrl;
      }
    }

    // 큐에 VTO 작업 등록 (hashKey와 clothingIds 포함)
    this.logger.log(`[VTO Queue] Queuing SNS Full VTO for user ${userId}, postId: ${body.postId}`);
    
    try {
      const job = await this.vtoQueue.add('vto', {
        userId,
        personImageUrl: user.fullBodyImage,
        clothingUrls,
        type: 'sns-full-try-on',
        postId: body.postId,
        hashKey,         // 캐시 저장용
        clothingIds,     // 캐시 저장용
      }, {
        removeOnComplete: { age: 300, count: 100 },
        removeOnFail: { age: 3600 },
      });

      this.logger.log(`[VTO Queue] Job ${job.id} queued for user ${userId}`);

      return {
        success: true,
        jobId: job.id,
        status: 'queued',
        postId: body.postId,
        message: 'SNS 전체 가상 착장 작업이 대기열에 추가되었습니다.',
      };
    } catch (error) {
      this.logger.error(`[VTO Queue] Error queuing SNS Full VTO job: ${error.message}`);
      throw error;
    }
  }

  @Post('check-status')
  async checkStatus(@Body() body: { jobId: string }) {
    return await this.fittingService.checkJobStatus(body.jobId);
  }

  /**
   * 단일 옷 가상 피팅 (자동 캐싱 + V2 최적화 + VTO 결과 캐싱)
   * POST /api/fitting/single-item-tryon
   */
  @Post('single-item-tryon')
  @UseGuards(JwtAuthGuard)
  async singleItemTryOn(@Request() req, @Body() body: { clothingId: string; clothingOwnerId?: string; category?: string; denoiseSteps?: number; seed?: number }) {
    const userId = req.user.id;
    const clothingOwnerId = body.clothingOwnerId || userId; // 없으면 본인 의류
    console.log('[singleItemTryOn] Starting - userId:', userId, 'clothingId:', body.clothingId, 'clothingOwnerId:', clothingOwnerId, 'category:', body.category);

    if (!body.clothingId) {
      throw new BadRequestException({
        success: false,
        message: 'clothingId is required',
      });
    }

    // 사용자의 전신 이미지 조회 (캐시 해시 생성용)
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

    // ========== VTO 결과 캐시 조회 ==========
    const clothingIds = [body.clothingId];
    const modelHash = crypto.createHash('md5').update(user.fullBodyImage).digest('hex').slice(0, 8);
    const hashKey = crypto.createHash('sha256')
      .update(`${userId}:${modelHash}:${clothingIds.join(',')}`)
      .digest('hex');

    const cachedResult = await this.prisma.vtoCache.findUnique({
      where: { hashKey },
    });

    if (cachedResult) {
      this.logger.log(`[VTO Cache] Cache hit for single-item hashKey: ${hashKey.slice(0, 16)}...`);

      // 캐시 히트 시 isVisible을 true로 업데이트 (삭제 후 재요청 시 다시 보이도록)
      if (cachedResult.isVisible !== true) {
        await this.prisma.vtoCache.update({
          where: { hashKey },
          data: { isVisible: true },
        });
      }

      const presignedUrl = await this.s3Service.convertToPresignedUrl(cachedResult.s3Url);
      return {
        success: true,
        cached: true,
        imageUrl: presignedUrl,
        message: '캐시된 결과를 반환합니다.',
      };
    }
    this.logger.log(`[VTO Cache] Cache miss for single-item hashKey: ${hashKey.slice(0, 16)}...`);

    // 캐시 존재 확인 (garment/text 캐시는 의류 소유자 기준)
    const humanCacheExists = await this.vtonCacheService.checkHumanCacheExists(userId);
    const garmentCacheExists = await this.vtonCacheService.checkGarmentCacheExists(clothingOwnerId, body.clothingId);
    const textCacheExists = await this.vtonCacheService.checkTextCacheExists(clothingOwnerId, body.clothingId);

    console.log(`[Cache Check] human=${humanCacheExists}, garment=${garmentCacheExists}, text=${textCacheExists}`);

    // 1. Human 캐시 생성 (필요시) - user는 이미 위에서 조회함
    if (!humanCacheExists) {
      const imageBase64 = await this.fetchImageAsBase64(user.fullBodyImage);
      await this.vtonCacheService.preprocessAndCacheHuman(userId, imageBase64);
      console.log('[Cache] Human cache created');
    }

    // 2. Garment & Text 캐시 생성 (필요시)
    if (!garmentCacheExists || !textCacheExists) {
      const clothing = await this.prisma.clothing.findUnique({
        where: { id: body.clothingId }, // userId 필터 제거 - 다른 사람 옷도 조회 가능
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

      // Garment 캐시 (의류 소유자 기준으로 저장)
      if (!garmentCacheExists) {
        const imageUrl = clothing.flattenImageUrl || clothing.imageUrl;
        const imageBase64 = await this.fetchImageAsBase64(imageUrl);
        await this.vtonCacheService.preprocessAndCacheGarment(clothingOwnerId, body.clothingId, imageBase64);
        console.log('[Cache] Garment cache created for owner:', clothingOwnerId);
      }

      // Text 캐시 (의류 소유자 기준으로 저장)
      if (!textCacheExists) {
        const description = [
          clothing.category || '',
          clothing.subCategory || '',
          ...(clothing.colors || []),
          ...(clothing.patterns || []),
          ...(clothing.details || []),
        ].filter(Boolean).join(' ');

        await this.vtonCacheService.preprocessAndCacheText(clothingOwnerId, body.clothingId, description);
        console.log('[Cache] Text cache created for owner:', clothingOwnerId);
      }
    }

    // 3. V2 API 호출 (FastAPI가 S3 직접 다운로드)
    // category 매핑: "tops", "outerwear" → "upper_body", "bottoms", "shoes" → "lower_body"

    // Frontend에서 category를 보내면 그것을 사용, 아니면 DB에서 조회
    // subCategory는 항상 DB에서 조회 필요
    let clothingCategory = body.category;
    let clothingSubCategory: string | undefined;

    const clothing = await this.prisma.clothing.findUnique({
      where: { id: body.clothingId }, // userId 필터 제거 - 다른 사람 옷도 조회 가능
      select: { category: true, subCategory: true },
    });

    if (!clothingCategory) {
      clothingCategory = clothing?.category;
    }
    clothingSubCategory = clothing?.subCategory;

    console.log(`[singleItemTryOn] Clothing category: ${clothingCategory}, subCategory: ${clothingSubCategory}`);

    // 카테고리 매핑: 아우터 + (코트 or 롱패딩) → dresses
    let vtonCategory: string;
    const categoryLower = clothingCategory?.toLowerCase() ?? '';
    const subCategoryLower = clothingSubCategory?.toLowerCase() ?? '';

    if (categoryLower === 'outerwear' || categoryLower === '아우터') {
      if (subCategoryLower === '코트' || subCategoryLower === 'coat' ||
          subCategoryLower === '롱패딩' || subCategoryLower === 'long padding') {
        vtonCategory = 'dresses';
      } else {
        vtonCategory = 'upper_body';
      }
    } else {
      const categoryMap = {
        'tops': 'upper_body',
        'bottoms': 'lower_body',
        'bottom': 'lower_body',
        'shoes': 'lower_body',
        'dresses': 'dresses',
        'outer':'dresses',
        'coat':'dresses'
      };
      vtonCategory = categoryMap[categoryLower] || 'upper_body';
    }

    console.log(`[singleItemTryOn] Mapped VTON category: ${vtonCategory}`);

    const resultImageBase64 = await this.vtonCacheService.generateTryOnV2(
      userId,
      body.clothingId,
      vtonCategory,  // ⚡ category 전달
      body.denoiseSteps ?? 10,
      body.seed ?? 42,
      clothingOwnerId,  // 의류 소유자 ID 전달
    );

    // ========== VTO 결과 S3 업로드 + DB 캐시 저장 ==========
    try {
      const s3Key = `vto/${userId}/${hashKey}.png`;
      const s3Url = await this.s3Service.uploadBase64Image(
        resultImageBase64,
        s3Key,
        'image/png',
        'closzit-ai-results'
      );

      this.logger.log(`[VTO Cache] S3 upload complete: ${s3Key}`);

      // DB에 캐시 저장 (upsert로 중복 hashKey 처리)
      await this.prisma.vtoCache.upsert({
        where: { hashKey },
        update: {
          s3Url,
          isVisible: true,
        },
        create: {
          hashKey,
          userId,
          postId: 'direct-fitting',
          clothingIds,
          s3Url,
          isVisible: true,
        },
      });

      this.logger.log(`[VTO Cache] DB cache saved for single-item hashKey: ${hashKey.slice(0, 16)}...`);

      // S3 URL을 Pre-signed URL로 변환하여 반환
      const presignedUrl = await this.s3Service.convertToPresignedUrl(s3Url);

      return {
        success: true,
        message: '가상 피팅이 완료되었습니다',
        imageUrl: presignedUrl,
      };
    } catch (saveError) {
      // 캐싱 실패해도 결과는 반환
      this.logger.error(`[VTO Cache] Cache save failed: ${saveError.message}`);
      return {
        success: true,
        message: '가상 피팅이 완료되었습니다',
        imageUrl: `data:image/png;base64,${resultImageBase64}`,
      };
    }
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
   * URL에서 이미지를 Base64로 변환 (AWS SDK 사용)
   */
  private async fetchImageAsBase64(url: string): Promise<string> {
    try {
      // Base64 Data URL인 경우 그대로 반환
      if (url.startsWith('data:image/')) {
        return url.split(',')[1];
      }

      // S3 URL인 경우 AWS SDK로 직접 다운로드
      const s3UrlPattern = /https?:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)/;
      const s3Match = url.match(s3UrlPattern);

      if (s3Match) {
        const bucket = s3Match[1];
        const key = decodeURIComponent(s3Match[3].split('?')[0]); // Query string 제거

        this.logger.log(`[fetchImageAsBase64] Using AWS SDK - Bucket: ${bucket}, Key: ${key}`);

        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        });

        const response = await this.s3Client.send(command);
        const stream = response.Body as Readable;
        const chunks: Buffer[] = [];

        for await (const chunk of stream) {
          chunks.push(Buffer.from(chunk));
        }

        const buffer = Buffer.concat(chunks);
        return buffer.toString('base64');
      }

      // S3 URL이 아닌 경우 fetch 사용
      this.logger.log(`[fetchImageAsBase64] Using fetch for non-S3 URL: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return buffer.toString('base64');
    } catch (error) {
      this.logger.error(`Error fetching image from ${url}:`, error);
      throw error;
    }
  }

  // ========== VTO 캐시 관련 API ==========

  /**
   * VTO History 조회 (isVisible=true인 결과만)
   * GET /api/fitting/vto-history
   */
  @Get('vto-history')
  async getVtoHistory(@Request() req) {
    const userId = req.user.id;

    const results = await this.prisma.vtoCache.findMany({
      where: {
        userId,
        isVisible: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // S3 URL을 Pre-signed URL로 변환 + 타입 분류 + seen 포함
    const resultsWithPresignedUrls = await Promise.all(
      results.map(async (result) => ({
        id: result.id,
        postId: result.postId,
        imageUrl: await this.s3Service.convertToPresignedUrl(result.s3Url),
        createdAt: result.createdAt,
        seen: result.seen,
        // clothingIds 개수로 타입 결정: 2개 이상이면 full, 1개면 single
        type: result.clothingIds.length >= 2 ? 'full' : 'single',
      }))
    );

    // 타입별로 분류
    const fullResults = resultsWithPresignedUrls.filter(r => r.type === 'full');
    const singleResults = resultsWithPresignedUrls.filter(r => r.type === 'single');

    // unseen 개수 계산
    const unseenFullCount = fullResults.filter(r => !r.seen).length;
    const unseenSingleCount = singleResults.filter(r => !r.seen).length;
    const unseenCount = unseenFullCount + unseenSingleCount;

    return {
      success: true,
      results: resultsWithPresignedUrls,
      fullResults,
      singleResults,
      unseenCount,
      unseenFullCount,
      unseenSingleCount,
    };
  }

  /**
   * 모든 VTO 결과를 읽음으로 표시
   * PATCH /api/fitting/vto/mark-all-seen
   */
  @Patch('vto/mark-all-seen')
  async markAllVtoAsSeen(@Request() req) {
    const userId = req.user.id;

    await this.prisma.vtoCache.updateMany({
      where: {
        userId,
        isVisible: true,
        seen: false,
      },
      data: { seen: true },
    });

    return {
      success: true,
      message: '모든 결과를 읽음으로 표시했습니다.',
    };
  }

  /**
   * VTO 결과 숨기기 (Soft Delete)
   * PATCH /api/fitting/vto/:id/hide
   */
  @Patch('vto/:id/hide')
  async hideVtoResult(@Request() req, @Param('id') id: string) {
    const userId = req.user.id;

    // 소유권 확인
    const vtoCache = await this.prisma.vtoCache.findUnique({
      where: { id },
    });

    if (!vtoCache || vtoCache.userId !== userId) {
      throw new BadRequestException({
        success: false,
        message: 'VTO 결과를 찾을 수 없습니다.',
      });
    }

    await this.prisma.vtoCache.update({
      where: { id },
      data: { isVisible: false },
    });

    return {
      success: true,
      message: 'VTO 결과가 숨겨졌습니다.',
    };
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