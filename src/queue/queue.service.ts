import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class QueueService {
  constructor(private readonly redisService: RedisService) {}

  async addUserToQueue(userId: string, batchId: string): Promise<number> {
    const queueKey = `queue:${batchId}`; 
    await this.redisService.redisClient.rpush(queueKey, userId);
    return this.getUserPosition(userId, batchId);
  }

  async getUserPosition(userId: string, batchId: string): Promise<number | null> {
    const queueKey = `queue:${batchId}`;
    const position = await this.redisService.redisClient.lpos(queueKey, userId);
    return position !== null ? position + 1 : null;
  }

  async removeUserFromQueue(userId: string, batchId: string): Promise<void> {
    const queueKey = `queue:${batchId}`;
    await this.redisService.redisClient.lrem(queueKey, 0, userId);
  }

  async getQueue(batchId: string): Promise<string[]> {
    const queueKey = `queue:${batchId}`;
    return await this.redisService.redisClient.lrange(queueKey, 0, -1);
  }
}
