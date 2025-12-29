import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FittingModule } from './fitting/fitting.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    FittingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
