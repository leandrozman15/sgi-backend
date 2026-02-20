import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CompanyService } from './companies.service';
import { CompanyController } from './companies.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [CompanyController],
  providers: [CompanyService],
  exports: [CompanyService]
})
export class CompanyModule {}
