import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { TaxServicePaymentController } from './finance.controller';

@Module({
  controllers: [TaxServicePaymentController],
  providers: [FinanceService],
  exports: [FinanceService]
})
export class TaxServicePaymentModule {}
