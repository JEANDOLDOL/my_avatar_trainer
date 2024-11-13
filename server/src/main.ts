// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { Logger } from '@nestjs/common';
// import * as config from 'config';
// import * as cookieParser from 'cookie-parser';
// import {ValidationPipe} from '@nestjs/common';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   app.use(cookieParser());
//   app.useGlobalPipes(new ValidationPipe()); // Enable validation globally
//   const serveConfig = config.get('server');
//   const port = serveConfig.port;
//   const redisConfig = config.get('redis');
//   const redisPort = redisConfig.port;

//   app.enableCors({
//     origin: 'https://techn0.shop', // 클라이언트 URL
//     credentials: true,
//   });

//   await app.listen(port);
//   Logger.log(`server is running on port ${port}`);
//   Logger.log(`Redis is running on port ${redisPort}`, 'Bootstrap');
// }
// bootstrap();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe()); // Enable validation globally

  // 빌드된 프론트엔드 정적 파일을 서빙
  app.useStaticAssets(join(__dirname, '..', '..', 'pose', 'build'));

  // CORS 설정: HTTPS를 위해 도메인으로 설정
  app.enableCors({
    origin: 'https://techn0.shop',
    credentials: true,
  });

  // 모든 경로에 '/api' prefix 추가
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3002;
  await app.listen(port);
  Logger.log(`Server is running on port ${port}`);
}

bootstrap();
