import { Module } from '@nestjs/common';
import { SaleService } from './sales.service';
import { SaleController } from './sales.controller';

@Module({
  controllers: [SaleController],
  providers: [SaleService],
  exports: [SaleService]
})
export class SaleModule {}
