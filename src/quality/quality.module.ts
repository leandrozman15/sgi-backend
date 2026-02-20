import { Module } from '@nestjs/common';
import { CalibrationService } from './quality.service';
import { CalibrationController } from './quality.controller';

@Module({
  controllers: [CalibrationController],
  providers: [CalibrationService],
  exports: [CalibrationService],
})
export class QualityModule {}
