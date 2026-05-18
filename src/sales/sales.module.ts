import { Module } from '@nestjs/common';
import { SaleService } from './sales.service';
import { SaleController } from './sales.controller';
import { EmailModule } from '../email/email.module';
import { NumberSequenceModule } from '../number-sequences/number-sequences.module';
import { AuditLogModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [EmailModule, NumberSequenceModule, AuditLogModule],
  controllers: [SaleController],
  providers: [SaleService],
  exports: [SaleService],
})
export class SaleModule {}
