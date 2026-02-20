import { Module } from '@nestjs/common';
import { CarrierService } from './carriers.service';
import { CarrierController } from './carriers.controller';

@Module({
  controllers: [CarrierController],
  providers: [CarrierService],
  exports: [CarrierService],
})
export class CarrierModule {}
