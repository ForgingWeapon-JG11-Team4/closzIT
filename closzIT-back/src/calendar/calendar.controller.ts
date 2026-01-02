// src/calendar/calendar.controller.ts

import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CalendarService } from './calendar.service';

@Controller('calendar')
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Get('today')
  @UseGuards(JwtAuthGuard)
  async getTodayEvents(@Req() req) {
    const events = await this.calendarService.getEvents(
      req.user.id,
      new Date(),
    );
    return { events };
  }

  @Get('today/tpo')
  @UseGuards(JwtAuthGuard)
  async getTodayTPO(@Req() req) {
    const events = await this.calendarService.getEvents(req.user.id, new Date());
    
    const results = await Promise.all(
      events.map(async (event) => ({
        summary: event.summary,
        tpo: await this.calendarService.extractTPOFromEvent(event),
      }))
    );
    
    return { results };
  }

  @Get('today/context')
  @UseGuards(JwtAuthGuard)
  async getTodayWithContext(@Req() req) {
    const events = await this.calendarService.getEventsWithWeather(
      req.user.id,
      new Date(),
    );
    return { events };
  }
}