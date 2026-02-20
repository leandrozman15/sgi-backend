import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { InventoryMovementService } from './inventory.service';
import { InventoryMovementController } from './inventory.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [InventoryMovementController],
  providers: [InventoryMovementService],
  exports: [InventoryMovementService]
})
export class InventoryMovementModule {}
