import { Module } from '@nestjs/common';
import { SubscriptionHistoryService } from './subscriptions.service';
import { SubscriptionHistoryController } from './subscriptions.controller';

@Module({
  controllers: [SubscriptionHistoryController],
  providers: [SubscriptionHistoryService],
  exports: [SubscriptionHistoryService]
})
export class SubscriptionHistoryModule {}
