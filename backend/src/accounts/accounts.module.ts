import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { TiktokModule } from '../tiktok/tiktok.module';

@Module({
  imports: [TiktokModule],
  controllers: [AccountsController],
  providers: [AccountsService]
})
export class AccountsModule {}
