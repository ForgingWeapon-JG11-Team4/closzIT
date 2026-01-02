// src/user/user.module.ts
// ✅ PrismaORM 방식으로 리팩토링됨

import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  // PrismaModule은 @Global()로 선언되어 있어 자동으로 PrismaService 사용 가능
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule { }
