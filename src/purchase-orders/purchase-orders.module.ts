import { Module } from '@nestjs/common';
import { PurchaseOrderService } from './purchase-orders.service';
import { PurchaseOrderController } from './purchase-orders.controller';
import { ExpenseProjectionModule } from '../expense-projection/expense-projection.module';

@Module({
  imports: [ExpenseProjectionModule],
  controllers: [PurchaseOrderController],
  providers: [PurchaseOrderService],
  exports: [PurchaseOrderService]
})
export class PurchaseOrderModule {}
