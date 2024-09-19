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

  private pubSubClient;
  private clientUserMap: Map<string, string> = new Map();
  // Mapeamento de clientes com batchId
  private clientEventMap: Map<string, string> = new Map();
  // Mapeamento para intervalos quando cliente está em primeira posição
  private clientIntervalMap: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly queueService: QueueService,
    private readonly redisService: RedisService
  ) {
    this.pubSubClient = this.redisService.getClient();
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    // Verifica se o cliente estava associado a algum batchId
    const batchId = this.clientEventMap.get(client.id);
    const userId = this.clientUserMap.get(client.id);
    if (batchId && userId) {
      // Desinscreve o cliente do canal Redis associado ao batchId
      const channel = `queueUpdate:${batchId}`;
      this.redisService.redisClient.unsubscribe(channel);
      this.queueService.removeUserFromQueue(userId, batchId)
      console.log(`Client ${client.id} unsubscribed from Redis channel ${channel}`);

      // Remove o cliente do mapa
      this.clientEventMap.delete(client.id);
    }

    // Limpa o intervalo de envio, se houver
    const interval = this.clientIntervalMap.get(client.id);
    if (interval) {
      clearInterval(interval);
      this.clientIntervalMap.delete(client.id);
    }
  }

  @SubscribeMessage('manageQueue')
  async handleJoinQueue(client: Socket, { userId, batchId }: { userId: string, batchId: string }): Promise<void> {
    // Adiciona o usuário à fila e inicia o streaming da posição
    const position = await this.queueService.addUserToQueue(userId, batchId);
    client.emit('queuePosition', { userId, position });
    this.clientEventMap.set(client.id, batchId);
    this.clientUserMap.set(client.id, userId);
    this.streamUserPosition(userId, batchId, client);
  }

  async streamUserPosition(userId: string, batchId: string, client: Socket): Promise<void> {
    const channel = `queueUpdate:${batchId}`;
    // Usando o RedisService para subscrever ao canal Redis
    this.redisService.redisClient.subscribe(channel);
    let position = await this.queueService.getUserPosition(userId, batchId);
    client.emit('queuePosition', { userId, position });

    this.redisService.redisClient.on('message', async (channel, message) => {
      if (channel === `queueUpdate:${batchId}`) {
        // Quando uma atualização geral ocorrer, obtenha a posição atualizada do usuário
        const position = await this.queueService.getUserPosition(userId, batchId);

        // Envia a nova posição para o cliente
        client.emit('queuePosition', { userId, position });

        // Se o usuário atingir a primeira posição, envia updates periódicos
        if (position === 1) {
          this.startPeriodicUpdates(client, userId, batchId);
        } else {
          // Se o cliente não está mais na primeira posição, cancela o intervalo
          const interval = this.clientIntervalMap.get(client.id);
          if (interval) {
            clearInterval(interval);
            this.clientIntervalMap.delete(client.id);
          }
        }

        // Se o usuário não estiver mais na fila, cancela a subscrição
        if (position === null) {
          this.redisService.redisClient.unsubscribe(channel);
          this.clientEventMap.delete(client.id); // Remove do mapa
        }
      }
    });
  }

  startPeriodicUpdates(client: Socket, userId: string, batchId: string) {
    // Se já houver um intervalo rodando, não inicia outro
    if (this.clientIntervalMap.has(client.id)) {
      return;
    }

    // Define um intervalo de X segundos (ex: 30 segundos) para enviar atualizações
    const interval = setInterval(async () => {
      const position = await this.queueService.getUserPosition(userId, batchId);

      // Envia a nova posição a cada X segundos
      client.emit('queuePosition', { userId, position });

      // Se o usuário sair da primeira posição, para o intervalo
      if (position !== 1) {
        clearInterval(interval);
        this.clientIntervalMap.delete(client.id);
      }
    }, 10000);

    // Armazena o intervalo no mapa para controle posterior
    this.clientIntervalMap.set(client.id, interval);
  }
}
