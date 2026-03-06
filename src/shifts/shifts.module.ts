import { Module } from '@nestjs/common';
import { ShiftService } from './shifts.service';
import { ShiftController } from './shifts.controller';

@Module({
  controllers: [ShiftController],
  providers: [ShiftService],
  exports: [ShiftService],
})
export class ShiftModule {}
