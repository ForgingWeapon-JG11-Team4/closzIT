import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { S3Service } from '../s3/s3.service';
import sharp = require('sharp');

const FEED_IMAGE_MAX_SIZE = 2048;

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly s3Service: S3Service,
  ) { }

  /**
   * 이미지 버퍼를 적절한 크기로 리사이징합니다. (EXIF 회전 포함)
   */
  private async resizeImageBuffer(buffer: Buffer, maxSize: number): Promise<Buffer> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      const { width, height, format } = metadata;

      if (!width || !height) return buffer;

      const maxDimension = Math.max(width, height);
      let pipeline = image.rotate(); // EXIF 기반 자동 회전

      if (maxDimension > maxSize) {
        pipeline = pipeline.resize({
          width: width > height ? maxSize : undefined,
          height: height >= width ? maxSize : undefined,
          fit: 'inside',
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3,
        });
      }

      return await pipeline
        .toFormat(format || 'jpeg', { quality: 90 })
        .toBuffer();

    } catch (error) {
      console.error('[PostsController] Image resize failed, using original:', error);
      return buffer;
    }
  }

  @Get('feed')
  async getFeed(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const userId = req.user.id;
    return this.postsService.getFeed(userId, parseInt(page), parseInt(limit));
  }

  @Get('user/:userId')
  async getUserPosts(
    @Request() req,
    @Param('userId') targetUserId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const currentUserId = req.user.id;
    return this.postsService.getUserPosts(
      targetUserId,
      currentUserId,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get(':id')
  async getPost(@Request() req, @Param('id') postId: string) {
    const userId = req.user.id;
    const post = await this.postsService.getPostById(postId, userId);

    if (!post) {
      throw new HttpException('Post not found', HttpStatus.NOT_FOUND);
    }

    return post;
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async createPost(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { caption?: string; clothingIds?: string },
  ) {
    const userId = req.user.id;
    const { caption = '' } = body;
    // clothingIds는 FormData로 올 때 문자열일 수 있음
    const clothingIds = body.clothingIds ? JSON.parse(body.clothingIds) : [];

    if (!file) {
      throw new HttpException('Image file is required', HttpStatus.BAD_REQUEST);
    }

    // S3에 직접 업로드
    const postId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const s3Key = `users/${userId}/posts/${postId}.${file.mimetype.split('/')[1] || 'png'}`;

    // 리사이징 + 회전 적용
    const resizedBuffer = await this.resizeImageBuffer(file.buffer, FEED_IMAGE_MAX_SIZE);

    const imageUrl = await this.s3Service.uploadBuffer(resizedBuffer, s3Key, file.mimetype);

    return this.postsService.createPost(userId, imageUrl, caption, clothingIds);
  }

  @Put(':id')
  async updatePost(
    @Request() req,
    @Param('id') postId: string,
    @Body() body: { caption: string; clothingIds?: string[] },
  ) {
    const userId = req.user.id;
    const post = await this.postsService.updatePost(postId, userId, body.caption, body.clothingIds);

    if (!post) {
      throw new HttpException(
        'Post not found or unauthorized',
        HttpStatus.NOT_FOUND,
      );
    }

    return post;
  }

  @Delete(':id')
  async deletePost(@Request() req, @Param('id') postId: string) {
    const userId = req.user.id;
    const success = await this.postsService.deletePost(postId, userId);

    if (!success) {
      throw new HttpException(
        'Post not found or unauthorized',
        HttpStatus.NOT_FOUND,
      );
    }

    return { message: 'Post deleted successfully' };
  }
}
