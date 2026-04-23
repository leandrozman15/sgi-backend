import { Module } from '@nestjs/common';
import { ExpeditionService } from './expedition.service';
import { ExpeditionController } from './expedition.controller';

@Module({
  controllers: [ExpeditionController],
  providers: [ExpeditionService],
  exports: [ExpeditionService],
})
export class ExpeditionModule {}
