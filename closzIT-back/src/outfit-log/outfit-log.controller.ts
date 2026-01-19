import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OutfitLogService } from './outfit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('outfit-log')
@UseGuards(JwtAuthGuard)
export class OutfitLogController {
  constructor(private readonly outfitLogService: OutfitLogService) {}

  /**
   * 착장 기록 생성 - "오늘 이 코디 입기"
   */
  @Post()
  async createOutfitLog(
    @Request() req,
    @Body()
    body: {
      outerId?: string;
      topId: string;
      bottomId: string;
      shoesId: string;
      tpo?: string;
      location?: string;
      weatherTemp?: number;
      weatherCondition?: string;
      userNote?: string;
    },
  ) {
    const userId = req.user.id;
    return this.outfitLogService.createOutfitLog(userId, body);
  }

  /**
   * 착장 기록 목록 조회
   */
  @Get()
  async getOutfitLogs(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const userId = req.user.id;
    return this.outfitLogService.getOutfitLogs(
      userId,
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0,
    );
  }

  /**
   * 오늘의 착장 기록 조회
   */
  @Get('today')
  async getTodayOutfitLog(@Request() req) {
    const userId = req.user.id;
    return this.outfitLogService.getTodayOutfitLog(userId);
  }

  /**
   * 특정 착장 기록 조회
   */
  @Get(':id')
  async getOutfitLogById(@Request() req, @Param('id') id: string) {
    const userId = req.user.id;
    return this.outfitLogService.getOutfitLogById(userId, id);
  }

  /**
   * 착장 기록 삭제
   */
  @Delete(':id')
  async deleteOutfitLog(@Request() req, @Param('id') id: string) {
    const userId = req.user.id;
    return this.outfitLogService.deleteOutfitLog(userId, id);
  }
}
