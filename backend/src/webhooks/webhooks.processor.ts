import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as crypto from 'crypto';

@Processor('webhooks')
export class WebhooksProcessor extends WorkerHost {
  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { accountId, endpoint, secretKey, eventType, data } = job.data;

    const payload = {
      event: eventType,
      data: data,
      timestamp: new Date().toISOString(),
    };

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    try {
      const response = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Tiktok-Signature': signature,
        },
        timeout: 5000,
      });

      await this.prisma.webhookLog.create({
        data: {
          accountId,
          endpoint,
          payload: payload,
          statusCode: response.status,
          isSuccess: true,
        },
      });

      return { success: true, status: response.status };
    } catch (error: any) {
      const statusCode = error.response?.status || null;
      const errorMsg = error.message;

      await this.prisma.webhookLog.create({
        data: {
          accountId,
          endpoint,
          payload: payload,
          statusCode,
          isSuccess: false,
          errorMsg,
        },
      });

      // Throw error to trigger BullMQ retry logic
      throw error;
    }
  }
}
