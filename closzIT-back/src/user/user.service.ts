// src/user/user.service.ts
// ✅ Prisma ORM 방식으로 리팩토링됨

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';  // Prisma가 자동 생성한 타입
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,  // PrismaService 주입
  ) { }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
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
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        googleId: googleProfile.googleId,
        email: googleProfile.email,
        profileImage: googleProfile.profileImage,
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

    // 업데이트 데이터 구성
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

    // Setup 3 정보 업데이트
    if (updateProfileDto.fullBodyImage !== undefined) updateData.fullBodyImage = updateProfileDto.fullBodyImage;

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
}
