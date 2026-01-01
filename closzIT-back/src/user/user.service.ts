// src/user/user.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { googleId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async createFromGoogle(googleProfile: {
    googleId: string;
    email: string;
    profileImage?: string;
  }): Promise<User> {
    const user = this.userRepository.create({
      googleId: googleProfile.googleId,
      email: googleProfile.email,
      profileImage: googleProfile.profileImage,
    });
    return this.userRepository.save(user);
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Setup 1 정보 업데이트
    if (updateProfileDto.name !== undefined) user.name = updateProfileDto.name;
    if (updateProfileDto.gender !== undefined)
      user.gender = updateProfileDto.gender;
    if (updateProfileDto.birthday !== undefined)
      user.birthday = new Date(updateProfileDto.birthday);
    if (updateProfileDto.province !== undefined)
      user.province = updateProfileDto.province;
    if (updateProfileDto.city !== undefined) user.city = updateProfileDto.city;

    // Setup 2 정보 업데이트
    if (updateProfileDto.hairColor !== undefined)
      user.hairColor = updateProfileDto.hairColor;
    if (updateProfileDto.personalColor !== undefined)
      user.personalColor = updateProfileDto.personalColor;
    if (updateProfileDto.bodyType !== undefined)
      user.bodyType = updateProfileDto.bodyType;
    if (updateProfileDto.preferredStyles !== undefined)
      user.preferredStyles = updateProfileDto.preferredStyles;

    // 옷장 설정 업데이트
    if (updateProfileDto.useAdminCloset !== undefined)
      user.useAdminCloset = updateProfileDto.useAdminCloset;

    // 프로필 완성 여부 체크
    user.isProfileComplete = !!(
      user.name &&
      user.gender &&
      user.birthday &&
      user.province &&
      user.city
    );

    return this.userRepository.save(user);
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    await this.userRepository.remove(user);
  }
}
