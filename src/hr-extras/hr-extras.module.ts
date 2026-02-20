import { Module } from '@nestjs/common';
import { HrExtrasService } from './hr-extras.service';
import { WorkAccidentController } from './hr-extras.controller';

@Module({
  controllers: [WorkAccidentController],
  providers: [HrExtrasService],
  exports: [HrExtrasService],
})
export class HrExtrasModule {}
