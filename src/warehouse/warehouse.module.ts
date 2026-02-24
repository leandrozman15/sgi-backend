import { Module } from '@nestjs/common';
import { WarehouseLocationService } from './warehouse.service';
import { WarehouseLocationController } from './warehouse.controller';
import { WarehouseTraceabilityService } from './warehouse-traceability.service';
import { WarehouseTraceabilityController } from './warehouse-traceability.controller';

@Module({
  controllers: [WarehouseLocationController, WarehouseTraceabilityController],
  providers: [WarehouseLocationService, WarehouseTraceabilityService],
  exports: [WarehouseLocationService, WarehouseTraceabilityService]
})
export class WarehouseLocationModule {}
