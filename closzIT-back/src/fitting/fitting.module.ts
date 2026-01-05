import { Module, forwardRef } from '@nestjs/common';
import { FittingController } from './fitting.controller';
import { FittingService } from './fitting.service';
import { CreditModule } from '../credit/credit.module';

@Module({
  imports: [forwardRef(() => CreditModule)],
  controllers: [FittingController],
  providers: [FittingService],
})
export class FittingModule {}
