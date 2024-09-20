import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { QueueService } from './queue.service';
import { RedisService } from '../redis/redis.service';

@WebSocketGateway({
  namespace: '/monitoring',
  cors: {
    origin: 'http://localhost:8001',
    methods: ['GET', 'POST'],
    credentials: true,
  }
})
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private clientUserMap: Map<string, string> = new Map();
  private clientEventMap: Map<string, string> = new Map();
  private clientIntervalMap: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly queueService: QueueService,
    private readonly redisService: RedisService
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    const batchId = this.clientEventMap.get(client.id);
    const userId = this.clientUserMap.get(client.id);

    if (batchId && userId) {
      const channel = `queueUpdate:${batchId}`;
      
      // Remove o usuário da fila
      await this.queueService.removeUserFromQueue(userId, batchId);
      
      // Unsubscribe from Redis channel
      await this.redisService.unsubscribe(channel);
      console.log(`Client ${client.id} unsubscribed from Redis channel ${channel}`);

      // Remove do mapeamento
      this.clientEventMap.delete(client.id);
      this.clientUserMap.delete(client.id);
    }

    const interval = this.clientIntervalMap.get(client.id);
    if (interval) {
      clearInterval(interval);
      this.clientIntervalMap.delete(client.id);
    }
  }

  @SubscribeMessage('manageQueue')
  async handleJoinQueue(client: Socket, { userId, batchId }: { userId: string, batchId: string }): Promise<void> {
    const position = await this.queueService.addUserToQueue(userId, batchId);
    client.emit('queuePosition', { userId, position });

    // Mapear cliente para gerenciar desconexão posteriormente
    this.clientEventMap.set(client.id, batchId);
    this.clientUserMap.set(client.id, userId);

    this.streamUserPosition(userId, batchId, client);
  }

  async streamUserPosition(userId: string, batchId: string, client: Socket): Promise<void> {
    const channel = `queueUpdate:${batchId}`;
    
    // Subscribing to Redis channel to receive updates
    await this.redisService.subscribe(channel, async (channel, message) => {
      console.log(`Received message from channel ${channel}: ${message}`);
      
      // Emitir a atualização para o cliente
      client.emit('queueUpdate', { batchId });

      const position = await this.queueService.getUserPosition(userId, batchId);
      client.emit('queuePosition', { userId, position });

      // Iniciar atualizações periódicas se o usuário for o primeiro
      if (position === 1) {
        this.startPeriodicUpdates(client, userId, batchId);
      }

      // Remover se o usuário não estiver mais na fila
      if (position === null) {
        await this.redisService.unsubscribe(channel);
        this.clientEventMap.delete(client.id);
      }
    });

    // Emit initial position
    const position = await this.queueService.getUserPosition(userId, batchId);
    client.emit('queuePosition', { userId, position });
  }

  startPeriodicUpdates(client: Socket, userId: string, batchId: string) {
    if (this.clientIntervalMap.has(client.id)) {
      return;
    }

    const interval = setInterval(async () => {
      const position = await this.queueService.getUserPosition(userId, batchId);

      client.emit('queuePosition', { userId, position });

      if (position !== 1) {
        clearInterval(interval);
        this.clientIntervalMap.delete(client.id);
      }
    }, 10000);

    this.clientIntervalMap.set(client.id, interval);
  }
}
