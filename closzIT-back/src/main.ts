import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Increase body size limit for base64 image uploads
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Enable CORS for frontend
  app.enableCors({
    origin: ['https://www.closzit.shop'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  try {
    const prismaService = app.get(PrismaService);
    await prismaService.$queryRaw`SELECT 1`;
    console.log('Database connected successfully (Prisma)');
  } catch (error) {
    console.error('Database connection failed:', error);
    console.log('Check your Security Group settings.');
  }

  const port = process.env.PORT ?? 42429;
  await app.listen(port, '0.0.0.0');

}
bootstrap();
