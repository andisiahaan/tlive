import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, Sse, MessageEvent } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TiktokService } from '../tiktok/tiktok.service';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly tiktokService: TiktokService
  ) {}

  @Get()
  async getAccounts(@Request() req: any) {
    return this.accountsService.getAccounts(req.user.id);
  }

  @Get('profile')
  async getProfile(@Request() req: any) {
    return this.accountsService.getProfile(req.user.id);
  }

  @Post('profile/apikey')
  async regenerateApiKey(@Request() req: any) {
    return this.accountsService.regenerateApiKey(req.user.id);
  }

  @Post()
  async addAccount(@Request() req: any, @Body() body: { username: string }) {
    return this.accountsService.addAccount(req.user.id, body.username);
  }

  @Delete(':id')
  async deleteAccount(@Request() req: any, @Param('id') id: string) {
    return this.accountsService.deleteAccount(req.user.id, id);
  }

  @Post(':id/webhook')
  async setWebhook(
    @Request() req: any,
    @Param('id') accountId: string,
    @Body() body: { endpointUrl: string; secretKey: string; isEnabled: boolean }
  ) {
    return this.accountsService.setWebhook(
      req.user.id,
      accountId,
      body.endpointUrl,
      body.secretKey,
      body.isEnabled
    );
  }

  @Sse(':id/events')
  events(@Request() req: any, @Param('id') id: string): Observable<MessageEvent> {
    this.tiktokService.addSseClient(id);

    return new Observable<MessageEvent>((subscriber) => {
      const subscription = this.tiktokService.events$
        .pipe(
          filter(event => event.accountId === id),
          map((event) => ({
            data: {
              type: event.eventType,
              payload: event.data,
            },
          } as MessageEvent))
        )
        .subscribe(subscriber);

      return () => {
        subscription.unsubscribe();
        this.tiktokService.removeSseClient(id);
      };
    });
  }
}
