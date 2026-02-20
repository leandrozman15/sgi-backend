import { Module } from '@nestjs/common';
import { MachineService } from './machines.service';
import { MachineController } from './machines.controller';

@Module({
  controllers: [MachineController],
  providers: [MachineService],
  exports: [MachineService],
})
export class MachineModule {}
