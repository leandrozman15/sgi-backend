import { Module } from '@nestjs/common';
import { AsaasService } from './asaas.service';
import { AsaasWebhookController } from './asaas-webhook.controller';
import { AsaasSubscriptionController } from './asaas-subscription.controller';
import { AsaasPaymentController } from './asaas-payment.controller';

@Module({
  controllers: [AsaasWebhookController, AsaasSubscriptionController, AsaasPaymentController],
  providers: [AsaasService],
  exports: [AsaasService],
})
export class AsaasModule {}
