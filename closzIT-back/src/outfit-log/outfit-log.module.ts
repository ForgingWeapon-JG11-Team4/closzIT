import { Module } from '@nestjs/common';
import { OutfitLogController } from './outfit-log.controller';
import { OutfitLogService } from './outfit-log.service';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [PrismaModule, S3Module],
  controllers: [OutfitLogController],
  providers: [OutfitLogService],
  exports: [OutfitLogService],
})
export class OutfitLogModule {}
