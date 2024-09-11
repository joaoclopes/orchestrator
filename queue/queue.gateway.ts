import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { QueueService } from './queue.service';

@WebSocketGateway({ namespace: '/queue' })
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private readonly queueService: QueueService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('manageQueue')
  async handleJoinQueue(client: Socket, { userId, ticketBatchId }: { userId: string, ticketBatchId: string }): Promise<void> {
    // Adiciona o usuário à fila e inicia o streaming da posição
    await this.queueService.addUserToQueue(userId, ticketBatchId);
    this.streamUserPosition(userId, ticketBatchId, client);
  }

  async streamUserPosition(userId: string, ticketBatchId: string, client: Socket): Promise<void> {
    const interval = setInterval(async () => {
      const position = await this.queueService.getUserPosition(userId, ticketBatchId);
      client.emit('queuePosition', { userId, position });

      // Para de enviar se o usuário atingir a primeira posição ou não estiver mais na fila
      if (position === 1 || position === null) {
        clearInterval(interval);
      }
    }, 15000); // Envia a cada 15 segundos
  }
}
