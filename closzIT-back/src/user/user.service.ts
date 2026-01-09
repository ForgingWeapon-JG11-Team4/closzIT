// src/user/user.service.ts

import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreditService } from '../credit/credit.service';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => CreditService))
    private creditService: CreditService,
    private s3Service: S3Service,
  ) { }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      return null;
    }

    // 이미지 URL을 Pre-signed URL로 변환
    const [profileImage, fullBodyImage] = await Promise.all([
      this.s3Service.convertToPresignedUrl(user.profileImage),
      this.s3Service.convertToPresignedUrl(user.fullBodyImage),
    ]);

    return {
      ...user,
      profileImage,
      fullBodyImage,
    };
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async createFromGoogle(googleProfile: {
    googleId: string;
    email: string;
    profileImage?: string;
    accessToken: string;
    refreshToken?: string;
  }): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        googleId: googleProfile.googleId,
        email: googleProfile.email,
        profileImage: googleProfile.profileImage,
        googleAccessToken: googleProfile.accessToken,
        googleRefreshToken: googleProfile.refreshToken,
      },
    });

    // 회원가입 시 100크레딧 지급
    try {
      await this.creditService.grantSignupCredit(user.id);
    } catch (error) {
      console.error('Failed to grant signup credit:', error);
    }

    return user;
  }

  async updateGoogleTokens(
    userId: string,
    tokens: { accessToken: string; refreshToken?: string },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.accessToken,
        ...(tokens.refreshToken && { googleRefreshToken: tokens.refreshToken }),
      },
    });
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updateData: any = {};

    // Setup 1 정보 업데이트
    if (updateProfileDto.name !== undefined) updateData.name = updateProfileDto.name;
    if (updateProfileDto.gender !== undefined) updateData.gender = updateProfileDto.gender;
    if (updateProfileDto.birthday !== undefined) updateData.birthday = new Date(updateProfileDto.birthday);
    if (updateProfileDto.province !== undefined) updateData.province = updateProfileDto.province;
    if (updateProfileDto.city !== undefined) updateData.city = updateProfileDto.city;

    // Setup 2 정보 업데이트
    if (updateProfileDto.hairColor !== undefined) updateData.hairColor = updateProfileDto.hairColor;
    if (updateProfileDto.personalColor !== undefined) updateData.personalColor = updateProfileDto.personalColor;
    if (updateProfileDto.height !== undefined) updateData.height = updateProfileDto.height;
    if (updateProfileDto.weight !== undefined) updateData.weight = updateProfileDto.weight;
    if (updateProfileDto.bodyType !== undefined) updateData.bodyType = updateProfileDto.bodyType;
    if (updateProfileDto.preferredStyles !== undefined) updateData.preferredStyles = updateProfileDto.preferredStyles;

    // Setup 3 정보 업데이트 - fullBodyImage를 S3에 업로드
    if (updateProfileDto.fullBodyImage !== undefined) {
      // Base64 이미지인 경우 S3에 업로드
      if (updateProfileDto.fullBodyImage.startsWith('data:image/')) {
        try {
          const s3Url = await this.s3Service.uploadBase64Image(
            updateProfileDto.fullBodyImage,
            `users/${userId}/fullbody.jpg`,
            'image/jpeg'
          );
          updateData.fullBodyImage = s3Url;
          this.logger.log(`Uploaded fullBodyImage to S3 for user: ${userId}`);
        } catch (error) {
          this.logger.error(`Failed to upload fullBodyImage to S3: ${error.message}`);
          throw error;
        }
      } else {
        // 이미 URL인 경우 그대로 저장 (S3 URL 또는 외부 URL)
        updateData.fullBodyImage = updateProfileDto.fullBodyImage;
      }
    }

    // 프로필 완성 여부 체크
    const updatedName = updateData.name ?? user.name;
    const updatedGender = updateData.gender ?? user.gender;
    const updatedBirthday = updateData.birthday ?? user.birthday;
    const updatedProvince = updateData.province ?? user.province;
    const updatedCity = updateData.city ?? user.city;

    updateData.isProfileComplete = !!(
      updatedName &&
      updatedGender &&
      updatedBirthday &&
      updatedProvince &&
      updatedCity
    );

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  async getPreference(userId: string): Promise<{ preferred_styles: string[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferredStyles: true },
    });

    return {
      preferred_styles: user?.preferredStyles || [],
    };
  }
}
