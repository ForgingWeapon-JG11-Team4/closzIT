import { Module } from '@nestjs/common';
import { OutfitLogService } from './outfit-log.service';
import { OutfitLogController } from './outfit-log.controller';

@Module({
  controllers: [OutfitLogController],
  providers: [OutfitLogService],
  exports: [OutfitLogService],
})
export class OutfitLogModule {}
