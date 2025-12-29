// src/auth/auth.controller.ts

import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Google 로그인 페이지로 리다이렉트 (Guard가 처리)
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    const { accessToken, user } = await this.authService.login(req.user);

    // 프론트엔드로 토큰과 함께 리다이렉트
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';

    // 신규 사용자 (프로필 미완성) vs 기존 사용자 구분
    const redirectPath = user.isProfileComplete
      ? '/main'
      : '/setup/profile1';

    res.redirect(
      `${frontendUrl}/auth/callback?token=${accessToken}&redirect=${redirectPath}`,
    );
  }

  @Get('status')
  async status() {
    return { status: 'Auth service is running' };
  }
}

