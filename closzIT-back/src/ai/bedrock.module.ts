import { Module } from '@nestjs/common';
import { BedrockService } from './bedrock.service';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [ConfigModule],
    providers: [BedrockService],
    exports: [BedrockService],
})
export class BedrockModule { }
