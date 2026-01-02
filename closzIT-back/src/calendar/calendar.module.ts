// src/calendar/calendar.module.ts

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CalendarService } from './services/calendar.service';
import { BedrockModule } from '../ai/bedrock.module';

@Module({
  imports: [HttpModule, BedrockModule],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}