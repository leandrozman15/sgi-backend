import { Module } from '@nestjs/common';
import { WorkTeamService } from './work-teams.service';
import { WorkTeamController } from './work-teams.controller';

@Module({
  controllers: [WorkTeamController],
  providers: [WorkTeamService],
  exports: [WorkTeamService],
})
export class WorkTeamModule {}
