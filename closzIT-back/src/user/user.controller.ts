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

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly s3Service: S3Service,
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

    return { success: true, imageUrl };
  }
}
