import { Module } from '@nestjs/common';
import { InventoryMovementService } from './inventory.service';
import { InventoryMovementController } from './inventory.controller';

@Module({
  controllers: [InventoryMovementController],
  providers: [InventoryMovementService],
  exports: [InventoryMovementService],
})
export class InventoryMovementModule {}
