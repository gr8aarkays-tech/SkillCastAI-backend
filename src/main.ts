import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Global validation pipe — strips unknown fields, transforms types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS for local Android emulator (10.0.2.2 is the emulator's host loopback)
  app.enableCors();

  // Serve locally stored audio files at GET /audio/<filename>
  // In production replace LocalStorageProvider with a cloud provider instead.
  const audioDir = join(process.cwd(), 'uploads', 'audio');
  app.useStaticAssets(audioDir, { prefix: '/audio' });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`SkillCastAI backend running on port ${process.env.PORT ?? 3000}`);
}

await bootstrap();
