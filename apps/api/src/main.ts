import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Sirve las imágenes subidas por UploadsController bajo el mismo prefijo /api,
  // así el proxy de Next.js (next.config.js) las alcanza igual que cualquier
  // endpoint de la API, sin configuración adicional para acceso desde LAN/móvil.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/api/uploads' });

  app.use(helmet());
  app.enableCors({
    origin: config.get<string>('corsOrigin'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ModaIA Closet API')
    .setDescription('API core: autenticación, catálogo e inventario')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('port') ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`ModaIA API escuchando en http://localhost:${port}/api (docs en /api/docs)`);
}

bootstrap();
