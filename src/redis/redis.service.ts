import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  public redisClient: Redis;
  public pubSubClient: Redis;

  onModuleInit() {
    this.redisClient = new Redis({
      host: 'localhost',
      port: 6379,
    });

    this.pubSubClient = new Redis({
      host: 'localhost',
      port: 6379,
    });
  }

  onModuleDestroy() {
    this.redisClient.quit();
    this.pubSubClient.quit();
  }

  async lpos(key: string, value: string) {
    return this.redisClient.lpos(key, value);
  }

  async subscribe(channel: string, handler: (channel: string, message: string) => void) {
    await this.pubSubClient.subscribe(channel);
    this.pubSubClient.on('message', handler);
  }

  async unsubscribe(channel: string) {
    await this.pubSubClient.unsubscribe(channel);
  }

  async publish(channel: string, message: string) {
    await this.redisClient.publish(channel, message);
  }
}
