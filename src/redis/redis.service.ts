import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  public redisClient: Redis;

  onModuleInit() {
    this.redisClient = new Redis({
      host: 'localhost', // ou o endereço do seu servidor Redis
      port: 6379,        // a porta padrão do Redis
    });
  }

  onModuleDestroy() {
    this.redisClient.quit();
  }
}
