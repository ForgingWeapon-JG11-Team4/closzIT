import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { BedrockModule } from './ai/bedrock.module';
import { AnalysisModule } from './analysis/analysis.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ItemsModule } from './items/items.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FittingModule } from './fitting/fitting.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { databaseConfig } from './config/database.config';

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
    TypeOrmModule.forRoot(databaseConfig()),
    AuthModule,
    UserModule,
    FittingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
