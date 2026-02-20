import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WorkAccidentService } from './hr-extras.service';
import { WorkAccidentController } from './hr-extras.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [WorkAccidentController],
  providers: [WorkAccidentService],
  exports: [WorkAccidentService]
})
export class WorkAccidentModule {}
