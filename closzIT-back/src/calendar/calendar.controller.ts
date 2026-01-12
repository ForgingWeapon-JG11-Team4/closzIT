// src/calendar/calendar.controller.ts

import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Get('today')
  async getTodayEvents(@Req() req) {
    const events = await this.calendarService.getEvents(
      req.user.id,
      new Date(),
    );
    return { events };
  }

  @Get('today/tpo')
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
  async getTodayWithContext(@Req() req) {
    const events = await this.calendarService.getEventsWithWeather(
      req.user.id,
      new Date(),
    );
    return { events };
  }

  @Get('upcoming')
  async getUpcomingEvents(@Req() req) {
    const events = await this.calendarService.getUpcomingEvents(req.user.id);
    return { events };
  }

  @Post('events')
  async createEvent(
    @Req() req,
    @Body() dto: CreateEventDto,
  ) {
    return this.calendarService.createEvent(req.user.id, dto);
  }
}