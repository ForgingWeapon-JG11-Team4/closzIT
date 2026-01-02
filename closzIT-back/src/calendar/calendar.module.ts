// src/calendar/calendar.module.ts

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { BedrockModule } from '../ai/bedrock.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [HttpModule, BedrockModule, PrismaModule, WeatherModule],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}