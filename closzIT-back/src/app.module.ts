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
import { CalendarModule } from './calendar/calendar.module';
import { PostsModule } from './posts/posts.module';
import { CommentsModule } from './comments/comments.module';
import { LikesModule } from './likes/likes.module';
import { FollowModule } from './follow/follow.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { CreditModule } from './credit/credit.module';
import { WeatherModule } from './weather/weather.module';

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
    CalendarModule,
    PostsModule,
    CommentsModule,
    LikesModule,
    FollowModule,
    RecommendationModule,
    CreditModule,
    WeatherModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
