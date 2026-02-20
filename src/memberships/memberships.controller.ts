import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { MembershipService } from './memberships.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { TenantMembershipGuard } from '../auth/guards/tenant-membership.guard';
import { Tenant } from '../auth/decorators/tenant.decorator';

@Controller('memberships')
@UseGuards(FirebaseAuthGuard, TenantMembershipGuard)
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get()
  findAll(@Tenant('companyId') companyId: string) {
    return this.membershipService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Tenant('companyId') companyId: string) {
    return this.membershipService.findOne(id, companyId);
  }

  @Post()
  create(@Body() createDto: any, @Tenant('companyId') companyId: string) {
    return this.membershipService.create(createDto, companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any, @Tenant('companyId') companyId: string) {
    return this.membershipService.update(id, updateDto, companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Tenant('companyId') companyId: string) {
    return this.membershipService.remove(id, companyId);
  }
}
