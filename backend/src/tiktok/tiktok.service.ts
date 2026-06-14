import { Injectable, OnModuleInit, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Subject } from 'rxjs';
// @ts-ignore
import { WebcastPushConnection } from 'tiktok-live-connector';

@Injectable()
export class TiktokService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TiktokService.name);
  private connections: Map<string, any> = new Map();
  public readonly events$ = new Subject<{ accountId: string; eventType: string; data: any }>();
  
  // Tracks active listeners per account
  private connectionRefs: Map<string, { sse: number; sockets: number; webhooks: boolean }> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('webhooks') private readonly webhooksQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Tiktok Listener Service...');
    await this.syncConnections();
    
    // Periodically sync connections in case of database updates
    setInterval(() => this.syncConnections(), 30000);
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting all Tiktok Live connections...');
    for (const [accountId, connection] of this.connections.entries()) {
      try {
        connection.disconnect();
      } catch (e) {
        this.logger.error(`Error disconnecting account ${accountId} on destroy`, e instanceof Error ? e.message : String(e));
      }
    }
  }

  private getRefs(accountId: string) {
    if (!this.connectionRefs.has(accountId)) {
      this.connectionRefs.set(accountId, { sse: 0, sockets: 0, webhooks: false });
    }
    return this.connectionRefs.get(accountId)!;
  }

  public addSseClient(accountId: string) {
    const refs = this.getRefs(accountId);
    refs.sse++;
    this.evaluateConnection(accountId).catch(err => {
      this.logger.error(`Failed to evaluate connection for ${accountId}`, err instanceof Error ? err.message : String(err));
    });
  }

  public removeSseClient(accountId: string) {
    const refs = this.getRefs(accountId);
    refs.sse = Math.max(0, refs.sse - 1);
    this.evaluateConnection(accountId).catch(err => {
      this.logger.error(`Failed to evaluate connection for ${accountId}`, err instanceof Error ? err.message : String(err));
    });
  }

  public addSocketClient(accountId: string) {
    const refs = this.getRefs(accountId);
    refs.sockets++;
    this.evaluateConnection(accountId).catch(err => {
      this.logger.error(`Failed to evaluate connection for ${accountId}`, err instanceof Error ? err.message : String(err));
    });
  }

  public removeSocketClient(accountId: string) {
    const refs = this.getRefs(accountId);
    refs.sockets = Math.max(0, refs.sockets - 1);
    this.evaluateConnection(accountId).catch(err => {
      this.logger.error(`Failed to evaluate connection for ${accountId}`, err instanceof Error ? err.message : String(err));
    });
  }

  public async evaluateConnection(accountId: string) {
    const refs = this.getRefs(accountId);
    const shouldConnect = refs.webhooks || refs.sse > 0 || refs.sockets > 0;
    const isConnected = this.connections.has(accountId);

    if (shouldConnect && !isConnected) {
      const account = await this.prisma.tiktokAccount.findUnique({
        where: { id: accountId },
        include: { webhookSetting: true }
      });
      if (account) {
        await this.connectAccount(account);
      }
    } else if (!shouldConnect && isConnected) {
      this.logger.log(`Account ${accountId} has 0 listeners. Auto-disconnecting to save resources.`);
      this.disconnectAccount(accountId);
    }
  }

  async syncConnections() {
    try {
      const allAccounts = await this.prisma.tiktokAccount.findMany({
        include: {
          webhookSetting: true,
        },
      });

      for (const account of allAccounts) {
        const refs = this.getRefs(account.id);
        refs.webhooks = account.webhookSetting?.isEnabled ?? false;
        await this.evaluateConnection(account.id);
      }

      const activeAccountIds = new Set(allAccounts.map((a) => a.id));
      for (const accountId of this.connections.keys()) {
        if (!activeAccountIds.has(accountId)) {
          this.disconnectAccount(accountId);
        }
      }
    } catch (error) {
      this.logger.error('Failed to sync connections', error instanceof Error ? error.message : String(error));
    }
  }

  private async connectAccount(account: any) {
    this.logger.log(`Connecting to Tiktok Live for user: ${account.username}`);
    
    const tiktokConnection = new WebcastPushConnection(account.username, {
      processInitialData: false,
      enableExtendedGiftInfo: true,
      enableWebsocketUpgrade: true,
      requestPollingIntervalMs: 2000,
      clientParams: {
        "app_language": "en-US",
        "device_platform": "web"
      }
    });

    this.connections.set(account.id, tiktokConnection);

    tiktokConnection.connect().then(async (state: any) => {
      this.logger.log(`Connected to room ${state.roomId} for ${account.username}`);
      await this.prisma.tiktokAccount.updateMany({
        where: { id: account.id },
        data: { status: 'ONLINE' }
      });
    }).catch(async (err: any) => {
      this.logger.error(`Failed to connect to ${account.username}`, err);
      await this.prisma.tiktokAccount.updateMany({
        where: { id: account.id },
        data: { status: 'ERROR' }
      });
      // Will be retried on next sync if we remove it
      this.connections.delete(account.id);
    });

    // Handle all events and dispatch to webhook queue
    const eventsToListen = ['chat', 'gift', 'like', 'social', 'member', 'roomUser', 'envelope'];
    
    for (const event of eventsToListen) {
      tiktokConnection.on(event, (data: any) => {
        this.dispatchWebhook(account, event, data).catch(err => {
           this.logger.error(`Failed to dispatch webhook for ${account.username}`, err instanceof Error ? err.message : String(err));
        });
      });
    }

    tiktokConnection.on('streamEnd', async () => {
      this.logger.log(`Stream ended for ${account.username}`);
      try {
        await this.prisma.tiktokAccount.updateMany({
          where: { id: account.id },
          data: { status: 'OFFLINE' }
        });
      } catch (err) {
        this.logger.error(`Error updating stream status offline for ${account.id}`, err instanceof Error ? err.message : String(err));
      }
      this.disconnectAccount(account.id);
    });

    tiktokConnection.on('disconnected', async () => {
      this.logger.log(`Disconnected from ${account.username}`);
      try {
        await this.prisma.tiktokAccount.updateMany({
          where: { id: account.id },
          data: { status: 'OFFLINE' }
        });
      } catch (err) {
        this.logger.error(`Error updating stream status disconnected for ${account.id}`, err instanceof Error ? err.message : String(err));
      }
      this.disconnectAccount(account.id);
    });
  }

  private disconnectAccount(accountId: string) {
    const connection = this.connections.get(accountId);
    if (connection) {
      try {
        connection.disconnect();
      } catch (e) {
        this.logger.error(`Error during explicit disconnect for ${accountId}`, e instanceof Error ? e.message : String(e));
      }
      this.connections.delete(accountId);
      this.logger.log(`Disconnected account ${accountId} locally.`);
    }
  }

  private async dispatchWebhook(account: any, eventType: string, data: any) {
    // Emit event locally for SSE
    this.events$.next({ accountId: account.id, eventType, data });

    if (!account.webhookSetting || !account.webhookSetting.endpointUrl || !account.webhookSetting.isEnabled) return;

    await this.webhooksQueue.add('send_webhook', {
      accountId: account.id,
      endpoint: account.webhookSetting.endpointUrl,
      secretKey: account.webhookSetting.secretKey,
      eventType,
      data,
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: 100, // Keep last 100 failed jobs for debugging
    });
  }
}
