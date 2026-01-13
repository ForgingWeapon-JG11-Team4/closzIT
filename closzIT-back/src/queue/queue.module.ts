import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueController } from './queue.controller';
import { FlattenProcessor } from './processors/flatten.processor';
import { VtoProcessor } from './processors/vto.processor';
import { AnalysisModule } from '../analysis/analysis.module';
import { FittingModule } from '../fitting/fitting.module';

@Module({
    imports: [
        BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                connection: {
                    host: configService.get<string>('REDIS_HOST', 'localhost'),
                    port: configService.get<number>('REDIS_PORT', 6379),
                },
            }),
            inject: [ConfigService],
        }),
        BullModule.registerQueue(
            { name: 'flatten-queue' },
            { name: 'vto-queue' },
        ),
        forwardRef(() => AnalysisModule),
        forwardRef(() => FittingModule),
    ],
    controllers: [QueueController],
    providers: [FlattenProcessor, VtoProcessor],
    exports: [BullModule],
})
export class QueueModule { }

