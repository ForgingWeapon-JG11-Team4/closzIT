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

@Controller('api/fitting')
@UseGuards(JwtAuthGuard)
export class FittingController {
  constructor(
    private readonly fittingService: FittingService,
    private readonly prisma: PrismaService,
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

  @Post('sns-virtual-try-on')
  async snsVirtualTryOn(
    @Request() req,
    @Body() body: { postId: string },
  ) {
    const userId = req.user.id;
    console.log('SNS VTO Request - userId:', userId, 'postId:', body.postId);

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

    // 게시글의 태그된 의상 조회
    const post = await this.prisma.post.findUnique({
      where: { id: body.postId },
      include: {
        postClothes: {
          include: {
            clothing: {
              select: {
                id: true,
                imageUrl: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!post) {
      throw new BadRequestException({
        success: false,
        message: '게시글을 찾을 수 없습니다.',
      });
    }

    if (!post.postClothes || post.postClothes.length === 0) {
      throw new BadRequestException({
        success: false,
        message: '태그된 의상이 없습니다.',
      });
    }

    // 카테고리별 의상 URL 매핑
    const clothingUrls: {
      outer?: string;
      top?: string;
      bottom?: string;
      shoes?: string;
    } = {};

    for (const pc of post.postClothes) {
      const category = pc.clothing.category.toLowerCase();
      if (category === 'outer') {
        clothingUrls.outer = pc.clothing.imageUrl;
      } else if (category === 'top') {
        clothingUrls.top = pc.clothing.imageUrl;
      } else if (category === 'bottom') {
        clothingUrls.bottom = pc.clothing.imageUrl;
      } else if (category === 'shoes') {
        clothingUrls.shoes = pc.clothing.imageUrl;
      }
    }

    console.log('Clothing categories found:', Object.keys(clothingUrls));

    // VTO 처리
    const result = await this.fittingService.processVirtualFittingFromUrls(
      user.fullBodyImage,
      clothingUrls,
      userId,
    );

    return {
      ...result,
      postId: body.postId,
    };
  }

  @Post('check-status')
  async checkStatus(@Body() body: { jobId: string }) {
    return await this.fittingService.checkJobStatus(body.jobId);
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