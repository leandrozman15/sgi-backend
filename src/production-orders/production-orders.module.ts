import { Module } from '@nestjs/common';
import { ProductionOrderService } from './production-orders.service';
import { ProductionOrderController } from './production-orders.controller';
import { InventoryMovementModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryMovementModule],
  controllers: [ProductionOrderController],
  providers: [ProductionOrderService],
  exports: [ProductionOrderService]
})
export class ProductionOrderModule {}
