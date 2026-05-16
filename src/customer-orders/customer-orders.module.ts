import { Module } from '@nestjs/common';
import { CustomerOrderService } from './customer-orders.service';
import { CustomerOrderController } from './customer-orders.controller';
import { ProductionOrderModule } from '../production-orders/production-orders.module';
import { PurchaseOrderModule } from '../purchase-orders/purchase-orders.module';

@Module({
  imports: [ProductionOrderModule, PurchaseOrderModule],
  controllers: [CustomerOrderController],
  providers: [CustomerOrderService],
  exports: [CustomerOrderService],
})
export class CustomerOrderModule {}
