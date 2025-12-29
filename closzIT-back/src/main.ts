import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  try {
    const prismaService = app.get(PrismaService);
    await prismaService.$queryRaw`SELECT 1`;
    console.log('Database connected successfully (Prisma)');
  } catch (error) {
    console.error('Database connection failed:', error);
    console.log('Check your Security Group settings.');
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
