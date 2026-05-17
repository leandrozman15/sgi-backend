import { Module } from '@nestjs/common';
import { InventoryMovementService } from './inventory.service';
import { InventoryMovementController } from './inventory.controller';
import { InventoryApplicationService } from './inventory-application.service';

@Module({
  controllers: [InventoryMovementController],
  providers: [InventoryMovementService, InventoryApplicationService],
  exports: [InventoryMovementService, InventoryApplicationService]
})
export class InventoryMovementModule {}
