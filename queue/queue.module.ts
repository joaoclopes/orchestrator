import { Module } from '@nestjs/common';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';

@Module({
  imports: [],
  controllers: [QueueController], // Controllers são declarados aqui
  providers: [QueueService],      // Services são declarados aqui
})
export class QueueModule {}
