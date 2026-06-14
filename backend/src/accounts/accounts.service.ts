import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async getAccounts(userId: string) {
    return this.prisma.tiktokAccount.findMany({
      where: { userId },
      include: { webhookSetting: true },
    });
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, apiKey: true },
    });
  }

  async regenerateApiKey(userId: string) {
    const crypto = require('crypto');
    return this.prisma.user.update({
      where: { id: userId },
      data: { apiKey: crypto.randomUUID() },
      select: { apiKey: true }
    });
  }

  async addAccount(userId: string, username: string) {
    return this.prisma.tiktokAccount.create({
      data: {
        userId,
        username,
      },
    });
  }

  async deleteAccount(userId: string, accountId: string) {
    return this.prisma.tiktokAccount.deleteMany({
      where: { id: accountId, userId },
    });
  }

  async setWebhook(userId: string, accountId: string, endpointUrl: string, secretKey: string, isEnabled: boolean) {
    const account = await this.prisma.tiktokAccount.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return this.prisma.webhookSetting.upsert({
      where: { accountId },
      update: {
        endpointUrl,
        secretKey,
        isEnabled,
      },
      create: {
        accountId,
        endpointUrl,
        secretKey,
        isEnabled,
      },
    });
  }
}
