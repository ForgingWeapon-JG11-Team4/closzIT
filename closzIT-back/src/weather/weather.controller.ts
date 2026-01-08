import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WeatherService } from './weather.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('weather')
export class WeatherController {
  constructor(
    private readonly weatherService: WeatherService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('current')
  @UseGuards(JwtAuthGuard)
  async getCurrentWeather(@Req() req) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { province: true, city: true },
    });

    if (!user?.province || !user?.city) {
      return {
        temperature: null,
        condition: '위치 정보 없음',
        location: null,
      };
    }

    const location = `${user.province} ${user.city}`;
    
    try {
      const weather = await this.weatherService.getWeatherForLocation(
        location,
        new Date(),
      );
      
      return {
        temperature: weather.temperature,
        condition: weather.condition,
        location: user.city,
        humidity: weather.humidity,
        rainProbability: weather.rainProbability,
      };
    } catch (error) {
      console.error('[Weather] API 오류:', error.message);
      return {
        temperature: null,
        condition: '날씨 정보 로딩 실패',
        location: user.city,
      };
    }
  }
}
