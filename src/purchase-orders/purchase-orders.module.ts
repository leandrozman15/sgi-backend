import { Module } from '@nestjs/common';
import { PurchaseOrderService } from './purchase-orders.service';
import { PurchaseOrderController } from './purchase-orders.controller';

@Module({
  controllers: [PurchaseOrderController],
  providers: [PurchaseOrderService],
  exports: [PurchaseOrderService]
})
export class PurchaseOrderModule {}
