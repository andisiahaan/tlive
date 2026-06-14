import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { TiktokService } from '../tiktok/tiktok.service';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('GameGateway');

  constructor(
    private tiktokService: TiktokService,
    private prisma: PrismaService
  ) {
    this.tiktokService.events$.subscribe((event) => {
      // Emit strictly to the room matching the accountId
      this.server.to(event.accountId).emit('tiktok_event', event);
    });
  }

  afterInit(server: Server) {
    this.logger.log('Socket.io Game Gateway Initialized');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    const apiKey = client.handshake.query.apiKey as string;
    const username = client.handshake.query.username as string;

    if (!apiKey || !username) {
      this.logger.warn(`Game client rejected: missing apiKey or username`);
      client.disconnect();
      return;
    }

    const user = await this.prisma.user.findUnique({ where: { apiKey } });
    if (!user) {
      this.logger.warn(`Game client rejected: invalid apiKey`);
      client.disconnect();
      return;
    }

    // Find or create account
    let account = await this.prisma.tiktokAccount.findUnique({
      where: { userId_username: { userId: user.id, username } }
    });

    if (!account) {
      this.logger.log(`Auto-creating TiktokAccount ${username} for user ${user.id}`);
      account = await this.prisma.tiktokAccount.create({
        data: {
          userId: user.id,
          username
        }
      });
    }

    this.tiktokService.addSocketClient(account.id);
    client.join(account.id);
    (client as any).accountId = account.id;

    this.logger.log(`Game client connected and joined room: ${account.id} (ID: ${client.id})`);
  }

  handleDisconnect(client: Socket) {
    const accountId = (client as any).accountId;
    if (accountId) {
      this.tiktokService.removeSocketClient(accountId);
      this.logger.log(`Game client disconnected: ${client.id}`);
    }
  }
}
