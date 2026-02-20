import { Module } from '@nestjs/common';
import { MembershipService } from './memberships.service';
import { MembershipController } from './memberships.controller';

@Module({
  controllers: [MembershipController],
  providers: [MembershipService],
  exports: [MembershipService],
})
export class MembershipModule {}
