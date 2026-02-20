import { Module } from '@nestjs/common';
import { ProductionOrderService } from './production-orders.service';
import { ProductionOrderController } from './production-orders.controller';

@Module({
  controllers: [ProductionOrderController],
  providers: [ProductionOrderService],
  exports: [ProductionOrderService],
})
export class ProductionOrderModule {}
