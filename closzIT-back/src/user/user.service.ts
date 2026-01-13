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

    this.logger.log(`[findById] Original fullBodyImage URL: ${user.fullBodyImage}`);

    // 이미지 URL을 Pre-signed URL로 변환
    const [profileImage, fullBodyImage] = await Promise.all([
      this.s3Service.convertToPresignedUrl(user.profileImage),
      this.s3Service.convertToPresignedUrl(user.fullBodyImage),
    ]);

    this.logger.log(`[findById] Converted fullBodyImage Presigned URL: ${fullBodyImage}`);

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

    const setString = (key: string, value: any) => {
      if (value !== undefined && value !== null && value !== '') {
        updateData[key] = value;
      }
    };

    const setEnum = (key: string, value: any) => {
      if (value !== undefined && value !== null && value !== '') {
        updateData[key] = value;
      }
    };

    const setNumber = (key: string, value: any) => {
      if (value !== undefined && value !== null && value !== '') {
        updateData[key] = value;
      }
    };

    const setDate = (key: string, value: any) => {
      if (value !== undefined && value !== null && value !== '') {
        updateData[key] = new Date(value);
      }
    };

    // Setup 1 정보
    setString('name', updateProfileDto.name);
    setEnum('gender', updateProfileDto.gender);
    setDate('birthday', updateProfileDto.birthday);
    setString('province', updateProfileDto.province);
    setString('city', updateProfileDto.city);

    // Setup 2 정보
    setEnum('hairColor', updateProfileDto.hairColor);
    setEnum('personalColor', updateProfileDto.personalColor);
    setNumber('height', updateProfileDto.height);
    setNumber('weight', updateProfileDto.weight);
    setString('bodyType', updateProfileDto.bodyType);
    
    // 배열 필드 (빈 배열은 허용)
    if (updateProfileDto.preferredStyles !== undefined && updateProfileDto.preferredStyles !== null) {
      updateData.preferredStyles = updateProfileDto.preferredStyles;
    }

    // Setup 3 정보 - fullBodyImage
    if (updateProfileDto.fullBodyImage !== undefined && updateProfileDto.fullBodyImage !== null && updateProfileDto.fullBodyImage !== '') {
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
