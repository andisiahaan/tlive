import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TiktokService } from './tiktok.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'webhooks',
    }),
  ],
  providers: [TiktokService],
  exports: [TiktokService],
})
export class TiktokModule {}
