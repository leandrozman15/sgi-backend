import { Module } from '@nestjs/common';
import { WorkAccidentService } from './hr-extras.service';
import { WorkAccidentController } from './hr-extras.controller';

@Module({
  controllers: [WorkAccidentController],
  providers: [WorkAccidentService],
  exports: [WorkAccidentService]
})
export class WorkAccidentModule {}
