import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class QueueService {
  constructor(private readonly redisService: RedisService) {}

  // Adiciona um usuário à fila no Redis
  async addUserToQueue(userId: string, queueId: string): Promise<number> {
    const queueKey = `queue:${queueId}`; 
    await this.redisService.redisClient.rpush(queueKey, userId); // Adiciona o usuário no final da fila
    return this.getUserPosition(userId, queueId);
  }

  // Obtém a posição do usuário na fila usando LPos
  async getUserPosition(userId: string, queueId: string): Promise<number | null> {
    const queueKey = `queue:${queueId}`;
    const position = await this.redisService.redisClient.lpos(queueKey, userId);
    return position !== null ? position + 1 : null; // LPos retorna 0-based index, converter para 1-based
  }

  // Remove um usuário da fila (opcional)
  async removeUserFromQueue(userId: string, queueId: string): Promise<void> {
    const queueKey = `queue:${queueId}`;
    await this.redisService.redisClient.lrem(queueKey, 0, userId);
  }

  // Opcional: obter toda a fila
  async getQueue(queueId: string): Promise<string[]> {
    const queueKey = `queue:${queueId}`;
    return await this.redisService.redisClient.lrange(queueKey, 0, -1); // Retorna todos os usuários na fila
  }
}
