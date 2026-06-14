import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AccountsModule } from './accounts/accounts.module';
import { TiktokModule } from './tiktok/tiktok.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { GameModule } from './game/game.module';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load root .env
dotenv.config({ path: resolve(process.cwd(), '../.env') });

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(process.cwd(), '../.env'),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || '127.0.0.1',
          port: parseInt(configService.get<string>('REDIS_PORT') || '6379', 10),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    AccountsModule,
    TiktokModule,
    WebhooksModule,
    GameModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
