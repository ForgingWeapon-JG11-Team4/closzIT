import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { BedrockModule } from './ai/bedrock.module';
import { AnalysisModule } from './analysis/analysis.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ItemsModule } from './items/items.module';
import { FittingModule } from './fitting/fitting.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    BedrockModule,
    AnalysisModule,
    ItemsModule,
    AuthModule,
    UserModule,
    FittingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
