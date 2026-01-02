// src/auth/auth.controller.ts

import { Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('google')
  googleAuth(@Query('prompt') prompt: string, @Res() res: Response) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const callbackUrl = this.configService.get<string>('GOOGLE_CALLBACK_URL');
    const scope = encodeURIComponent('email profile https://www.googleapis.com/auth/calendar.readonly');
    
    const promptType = prompt === 'consent' ? 'consent' : 'select_account';
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${callbackUrl}&response_type=code&scope=${scope}&access_type=offline&prompt=${promptType}`;
    
    res.redirect(authUrl);
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    const { accessToken, user } = await this.authService.login(req.user);

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';

    // refresh token 없으면 consent 필요
    if (!user.googleRefreshToken) {
      res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}&needConsent=true`);
      return;
    }

    const redirectPath = user.isProfileComplete ? '/main' : '/setup/profile1';

    res.redirect(
      `${frontendUrl}/auth/callback?token=${accessToken}&redirect=${redirectPath}`,
    );
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req) {
    return { 
      success: true, 
      message: '로그아웃되었습니다',
      userId: req.user.id 
    };
  }

  @Get('status')
  async status() {
    return { status: 'Auth service is running' };
  }
}