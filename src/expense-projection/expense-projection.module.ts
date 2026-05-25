import { Module } from '@nestjs/common';
import { ExpenseProjectionService } from './expense-projection.service';
import { ExpenseProjectionController } from './expense-projection.controller';

@Module({
  controllers: [ExpenseProjectionController],
  providers: [ExpenseProjectionService],
  exports: [ExpenseProjectionService],
})
export class ExpenseProjectionModule {}
