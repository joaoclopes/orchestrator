import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { QueueService } from './queue.service';

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

  constructor(private readonly queueService: QueueService) { }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('manageQueue')
  async handleJoinQueue(client: Socket, { userId, eventId }: { userId: string, eventId: string }): Promise<void> {
    // Adiciona o usuário à fila e inicia o streaming da posição
    console.time('addUserToQueue');
    const position = await this.queueService.addUserToQueue(userId, eventId);
    console.timeEnd('addUserToQueue');
    client.emit('queuePosition', { userId, position });
    this.streamUserPosition(userId, eventId, client);
  }

  async streamUserPosition(userId: string, eventId: string, client: Socket): Promise<void> {
    const interval = setInterval(async () => {
      const position = await this.queueService.getUserPosition(userId, eventId);
      client.emit('queuePosition', { userId, position });

      // Para de enviar se o usuário atingir a primeira posição ou não estiver mais na fila
      if (position === null) {
        clearInterval(interval);
      }
    }, 15000); // Envia a cada 15 segundos
  }
}
