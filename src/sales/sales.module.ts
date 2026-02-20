import { Module } from '@nestjs/common';
import { SaleService } from './sales.service';
import { SaleQuoteController } from './sales.controller';

@Module({
  controllers: [SaleQuoteController],
  providers: [SaleService],
  exports: [SaleService],
})
export class SaleModule {}
