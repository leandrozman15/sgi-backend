import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EmployeeService } from './employees.service';
import { EmployeeController } from './employees.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [EmployeeController],
  providers: [EmployeeService],
  exports: [EmployeeService]
})
export class EmployeeModule {}
