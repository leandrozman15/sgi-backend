import { Module } from '@nestjs/common';
import { NumberSequenceService } from './number-sequences.service';
import { NumberSequenceController } from './number-sequences.controller';

@Module({
  controllers: [NumberSequenceController],
  providers: [NumberSequenceService],
  exports: [NumberSequenceService],
})
export class NumberSequenceModule {}
