import { Module } from '@nestjs/common';
import { AsaasService } from './asaas.service';
import { AsaasWebhookController } from './asaas-webhook.controller';
import { AsaasSubscriptionController } from './asaas-subscription.controller';

@Module({
  controllers: [AsaasWebhookController, AsaasSubscriptionController],
  providers: [AsaasService],
  exports: [AsaasService],
})
export class AsaasModule {}
