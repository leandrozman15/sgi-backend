import { Module } from '@nestjs/common';
import { SaleService } from './sales.service';
import { SaleController } from './sales.controller';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [SaleController],
  providers: [SaleService],
  exports: [SaleService],
})
export class SaleModule {}
