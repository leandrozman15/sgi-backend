import { Module } from '@nestjs/common';
import { PurchaseRequestService } from './purchase-requests.service';
import { PurchaseRequestController } from './purchase-requests.controller';

@Module({
  controllers: [PurchaseRequestController],
  providers: [PurchaseRequestService],
  exports: [PurchaseRequestService],
})
export class PurchaseRequestModule {}
