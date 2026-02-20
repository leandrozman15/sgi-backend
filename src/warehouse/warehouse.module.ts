import { Module } from '@nestjs/common';
import { WarehouseLocationService } from './warehouse.service';
import { WarehouseLocationController } from './warehouse.controller';

@Module({
  controllers: [WarehouseLocationController],
  providers: [WarehouseLocationService],
  exports: [WarehouseLocationService],
})
export class WarehouseLocationModule {}
