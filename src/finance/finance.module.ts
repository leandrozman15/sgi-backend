import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TaxServicePaymentService } from './finance.service';
import { TaxServicePaymentController } from './finance.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [TaxServicePaymentController],
  providers: [TaxServicePaymentService],
  exports: [TaxServicePaymentService]
})
export class TaxServicePaymentModule {}
