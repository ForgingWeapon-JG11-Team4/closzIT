import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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
    TypeOrmModule.forRoot(databaseConfig()),
    AuthModule,
    UserModule,
    FittingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
