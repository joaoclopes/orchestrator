import { Injectable } from '@nestjs/common';
import { RedisService } from 'nestjs-redis';
import Redis from 'ioredis';

@Injectable()
export class QueueService {
  private redisClient: Redis;

  constructor(private readonly redisService: RedisService) {
    this.redisClient = this.redisService.getClient();
  }

  // Adiciona um usuário à fila no Redis
  async addUserToQueue(userId: string, ticketBatchId: string): Promise<number> {
    const queueKey = `queue:${ticketBatchId}`;
    await this.redisClient.rpush(queueKey, userId); // Adiciona o usuário no final da fila
    return this.getUserPosition(userId, ticketBatchId);
  }

  // Obtém a posição do usuário na fila usando LPos
  async getUserPosition(userId: string, queueId: string): Promise<number | null> {
    const queueKey = `queue:${queueId}`;
    const position = await this.redisClient.lpos(queueKey, userId); // Obtém a posição do usuário
    return position !== null ? position + 1 : null; // LPos retorna 0-based index, converter para 1-based
  }

  // Remove um usuário da fila (opcional)
  async removeUserFromQueue(userId: string, ticketBatchId: string): Promise<void> {
    const queueKey = `queue:${ticketBatchId}`;
    await this.redisClient.lrem(queueKey, 0, userId); // Remove o usuário da fila
  }

  // Opcional: obter toda a fila
  async getQueue(ticketBatchId: string): Promise<string[]> {
    const queueKey = `queue:${ticketBatchId}`;
    return await this.redisClient.lrange(queueKey, 0, -1); // Retorna todos os usuários na fila
  }
}
