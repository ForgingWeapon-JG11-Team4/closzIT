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
  @Post('profile-image')
  @UseInterceptors(FileInterceptor('profileImage'))
  async uploadProfileImage(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user.id;

    if (!file) {
      return { success: false, message: 'Profile image file is required' };
    }

    // 기존 profile 이미지 삭제
    console.log(`[ProfileImage] Deleting old profile images for userId: ${userId}`);
    try {
      await this.s3Service.deleteFolder(`users/${userId}/profile_image`);
      console.log(`[ProfileImage] ✅ Old profile images deleted`);
    } catch (deleteError) {
      console.log(`[ProfileImage] ⚠️ Failed to delete old profile images:`, deleteError.message);
    }

    // S3에 직접 업로드 (타임스탬프 추가하여 브라우저 캐시 방지)
    const timestamp = Date.now();
    const fileExtension = file.mimetype.split('/')[1] || 'jpg';
    const s3Key = `users/${userId}/profile_image/${timestamp}.${fileExtension}`;
    console.log(`[ProfileImage] Uploading to S3 key: ${s3Key}`);
    const imageUrl = await this.s3Service.uploadBuffer(file.buffer, s3Key, file.mimetype);
    console.log(`[ProfileImage] S3 upload complete. URL: ${imageUrl}`);

    // DB 업데이트
    await this.userService.updateProfile(userId, { profileImage: imageUrl });
    console.log(`[ProfileImage] DB updated with imageUrl: ${imageUrl}`);

    // Presigned URL로 변환하여 반환
    const presignedUrl = await this.s3Service.convertToPresignedUrl(imageUrl);

    return { success: true, profileImageUrl: presignedUrl };
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

    // 기존 fullbody 이미지 삭제
    console.log(`[FullBodyImage] Deleting old fullbody images for userId: ${userId}`);
    try {
      // users/{userId}/ 폴더 아래 fullbody로 시작하는 모든 파일 삭제
      await this.s3Service.deleteFolder(`users/${userId}/fullbody`);
      console.log(`[FullBodyImage] ✅ Old fullbody images deleted`);
    } catch (deleteError) {
      console.log(`[FullBodyImage] ⚠️ Failed to delete old fullbody images:`, deleteError.message);
    }

    // 기존 VTON 캐시 삭제 (전신 사진이 바뀌면 캐시도 무효화)
    console.log(`[FullBodyImage] Deleting existing VTON cache for userId: ${userId}`);
    try {
      await Promise.all([
        // 기존 경로 (upper/lower 구분)
        this.s3Service.deleteObject(`users/${userId}/vton-cache/upper/human_img.png`),
        this.s3Service.deleteObject(`users/${userId}/vton-cache/upper/mask.png`),
        this.s3Service.deleteObject(`users/${userId}/vton-cache/upper/mask_gray.png`),
        this.s3Service.deleteObject(`users/${userId}/vton-cache/upper/pose_tensor.pkl`),
        this.s3Service.deleteObject(`users/${userId}/vton-cache/lower/human_img.png`),
        this.s3Service.deleteObject(`users/${userId}/vton-cache/lower/mask.png`),
        this.s3Service.deleteObject(`users/${userId}/vton-cache/lower/mask_gray.png`),
        this.s3Service.deleteObject(`users/${userId}/vton-cache/lower/pose_tensor.pkl`),
        this.s3Service.deleteObject(`users/${userId}/vton-cache/dresses/human_img.png`),
        this.s3Service.deleteObject(`users/${userId}/vton-cache/dresses/mask.png`),
        this.s3Service.deleteObject(`users/${userId}/vton-cache/dresses/mask_gray.png`),
        this.s3Service.deleteObject(`users/${userId}/vton-cache/dresses/pose_tensor.pkl`),
        // 새 경로 (upper/lower 구분 없음)
        this.s3Service.deleteObject(`users/${userId}/vton-cache/human_img.png`),
        this.s3Service.deleteObject(`users/${userId}/vton-cache/mask.png`),
        this.s3Service.deleteObject(`users/${userId}/vton-cache/mask_gray.png`),
        this.s3Service.deleteObject(`users/${userId}/vton-cache/pose_tensor.pkl`),
      ]);
      console.log(`[FullBodyImage] ✅ Old VTON cache deleted`);
    } catch (deleteError) {
      console.log(`[FullBodyImage] ⚠️ Failed to delete old cache (might not exist):`, deleteError.message);
    }

    // S3에 직접 업로드 (타임스탬프 추가하여 브라우저 캐시 방지)
    const timestamp = Date.now();
    const s3Key = `users/${userId}/fullbody_${timestamp}.${file.mimetype.split('/')[1] || 'jpg'}`;
    console.log(`[FullBodyImage] Uploading to S3 key: ${s3Key}`);
    const imageUrl = await this.s3Service.uploadBuffer(file.buffer, s3Key, file.mimetype);
    console.log(`[FullBodyImage] S3 upload complete. URL: ${imageUrl}`);

    // S3에 실제로 업로드되었는지 확인
    const exists = await this.s3Service.checkObjectExists(s3Key);
    console.log(`[FullBodyImage] S3 object exists check: ${exists}`);

    // DB 업데이트
    await this.userService.updateProfile(userId, { fullBodyImage: imageUrl });
    console.log(`[FullBodyImage] DB updated with imageUrl: ${imageUrl}`);

    // FastAPI 메모리 캐시도 삭제 (있다면)
    console.log(`[FullBodyImage] Clearing FastAPI memory cache for userId: ${userId}`);
    try {
      const vtonApiUrl = process.env.VTON_API_URL || 'http://localhost:55554';
      await fetch(`${vtonApiUrl}/cache/human/${userId}`, { method: 'DELETE' });
      console.log(`[FullBodyImage] ✅ FastAPI memory cache cleared`);
    } catch (cacheError) {
      console.log(`[FullBodyImage] ⚠️ Failed to clear FastAPI cache:`, cacheError.message);
    }

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
