// src/user/user.controller.ts

import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { S3Service } from '../s3/s3.service';
import { VtonCacheService } from '../vton-cache/vton-cache.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly s3Service: S3Service,
    private readonly vtonCacheService: VtonCacheService,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    return this.userService.findById(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(req.user.id, updateProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('fullbody-image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadFullBodyImage(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user.id;

    if (!file) {
      return { success: false, message: 'Image file is required' };
    }

    // S3에 직접 업로드
    const s3Key = `users/${userId}/fullbody.${file.mimetype.split('/')[1] || 'jpg'}`;
    const imageUrl = await this.s3Service.uploadBuffer(file.buffer, s3Key, file.mimetype);

    // DB 업데이트
    await this.userService.updateProfile(userId, { fullBodyImage: imageUrl });

    // VTON 사람 캐시 생성 (OpenPose + Parsing + DensePose)
    console.log(`[FullBodyImage] Creating human cache for userId: ${userId}`);
    try {
      const imageBase64 = file.buffer.toString('base64');
      await this.vtonCacheService.preprocessAndCacheHuman(userId, imageBase64);
      console.log(`[FullBodyImage] ✅ Human cache created for userId: ${userId}`);
    } catch (cacheError) {
      console.error(`[FullBodyImage] ❌ Human cache creation failed for userId: ${userId}`, cacheError.message);
      // 캐시 생성 실패해도 사진 업로드는 성공으로 처리
    }

    return { success: true, imageUrl };
  }
}
