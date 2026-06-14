import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { TiktokModule } from '../tiktok/tiktok.module';

@Module({
  imports: [TiktokModule],
  providers: [GameGateway],
})
export class GameModule {}
