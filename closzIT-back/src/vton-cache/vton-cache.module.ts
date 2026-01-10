import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VtonCacheService } from './vton-cache.service';
import { VtonCacheController } from './vton-cache.controller';
import { S3Module } from '../s3/s3.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000,
      maxRedirects: 5,
      // ECONNRESET 방지를 위한 Keep-Alive 설정
      httpAgent: undefined, // HTTP Agent 기본 설정 사용
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    }),
    S3Module,
    PrismaModule,
  ],
  controllers: [VtonCacheController],
  providers: [VtonCacheService],
  exports: [VtonCacheService],
})
export class VtonCacheModule {}
