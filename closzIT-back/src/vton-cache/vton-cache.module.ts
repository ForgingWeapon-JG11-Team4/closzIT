import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VtonCacheService } from './vton-cache.service';
import { VtonCacheController } from './vton-cache.controller';
import { S3Module } from '../s3/s3.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    HttpModule,
    S3Module,
    PrismaModule,
  ],
  controllers: [VtonCacheController],
  providers: [VtonCacheService],
  exports: [VtonCacheService],
})
export class VtonCacheModule {}
