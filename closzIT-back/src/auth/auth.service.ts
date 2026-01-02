// src/auth/auth.service.ts

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateGoogleUser(googleProfile: {
    googleId: string;
    email: string;
    profileImage?: string;
    accessToken: string;
    refreshToken?: string;
  }): Promise<User> {
    let user = await this.userService.findByGoogleId(googleProfile.googleId);

    if (user) {
      // 기존 사용자 - 토큰 업데이트
      user = await this.userService.updateGoogleTokens(user.id, {
        accessToken: googleProfile.accessToken,
        refreshToken: googleProfile.refreshToken,
      });
    } else {
      // 새 사용자 생성
      user = await this.userService.createFromGoogle(googleProfile);
    }

    return user;
  }

  generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
    };
    return this.jwtService.sign(payload);
  }

  async login(user: User): Promise<{
    accessToken: string;
    user: User;
  }> {
    return {
      accessToken: this.generateToken(user),
      user,
    };
  }
}