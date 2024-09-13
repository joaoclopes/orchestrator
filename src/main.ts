import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  app.enableCors({
    origin: 'http://localhost:8001', // Defina a origem do frontend ou a API WebSocket
    methods: ['GET', 'POST'],
    credentials: true, // Habilite se necessário
  });
  
  await app.listen(3000);
}
bootstrap();
