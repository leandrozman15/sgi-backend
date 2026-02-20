import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CarrierService } from './carriers.service';
import { CarrierController } from './carriers.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [CarrierController],
  providers: [CarrierService],
  exports: [CarrierService]
})
export class CarrierModule {}
