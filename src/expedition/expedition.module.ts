import { Module } from '@nestjs/common';
import { ExpeditionService } from './expedition.service';
import { ExpeditionController } from './expedition.controller';
import { NumberSequenceModule } from '../number-sequences/number-sequences.module';
import { InventoryMovementModule } from '../inventory/inventory.module';

@Module({
  imports: [NumberSequenceModule, InventoryMovementModule],
  controllers: [ExpeditionController],
  providers: [ExpeditionService],
  exports: [ExpeditionService],
})
export class ExpeditionModule {}
