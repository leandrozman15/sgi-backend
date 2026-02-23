import { Module } from '@nestjs/common';
import { TaxServicePaymentService } from './finance.service';
import { TaxServicePaymentController } from './finance.controller';

@Module({
  controllers: [TaxServicePaymentController],
  providers: [TaxServicePaymentService],
  exports: [TaxServicePaymentService]
})
export class TaxServicePaymentModule {}
