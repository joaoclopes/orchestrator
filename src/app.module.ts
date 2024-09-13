import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QueueModule } from './queue/queue.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [RedisModule, QueueModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
