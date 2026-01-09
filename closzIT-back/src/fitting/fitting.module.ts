import { Module, forwardRef } from '@nestjs/common';
import { FittingController } from './fitting.controller';
import { FittingService } from './fitting.service';
import { CreditModule } from '../credit/credit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [forwardRef(() => CreditModule), PrismaModule, S3Module],
  controllers: [FittingController],
  providers: [FittingService],
})
export class FittingModule { }
