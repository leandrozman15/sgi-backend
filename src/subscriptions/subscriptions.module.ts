import { Module } from '@nestjs/common';
import { SubscriptionHistoryController } from './subscriptions.controller';
import { SubscriptionHistoryService } from './subscriptions.service';

@Module({
  controllers: [SubscriptionHistoryController],
  providers: [SubscriptionHistoryService],
  exports: [SubscriptionHistoryService],
})
export class SubscriptionModule {}
