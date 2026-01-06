import { Controller, Get, Post, Body, Param, Delete, Patch, UseGuards, Req } from '@nestjs/common';
import { OutfitLogService } from './outfit-log.service';
import { CreateOutfitLogDto } from './dto/create-outfit-log.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('outfit-log')
@UseGuards(JwtAuthGuard)
export class OutfitLogController {
  constructor(private readonly outfitLogService: OutfitLogService) {}

  @Post()
  create(@Req() req: any, @Body() createDto: CreateOutfitLogDto) {
    return this.outfitLogService.create(req.user.id, createDto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.outfitLogService.findAllByUser(req.user.id);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.outfitLogService.findOne(id, req.user.id);
  }

  @Patch(':id/feedback')
  updateFeedback(
    @Req() req: any,
    @Param('id') id: string,
    @Body('feedbackScore') feedbackScore: number,
  ) {
    return this.outfitLogService.updateFeedback(id, req.user.id, feedbackScore);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.outfitLogService.remove(id, req.user.id);
  }
}
