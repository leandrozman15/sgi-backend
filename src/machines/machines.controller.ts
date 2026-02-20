import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { MachineService } from './machines.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { TenantMembershipGuard } from '../auth/guards/tenant-membership.guard';
import { Tenant } from '../auth/decorators/tenant.decorator';

@Controller('machines')
@UseGuards(FirebaseAuthGuard, TenantMembershipGuard)
export class MachineController {
  constructor(private readonly machineService: MachineService) {}

  @Get()
  findAll(@Tenant('companyId') companyId: string) {
    return this.machineService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Tenant('companyId') companyId: string) {
    return this.machineService.findOne(id, companyId);
  }

  @Post()
  create(@Body() createDto: any, @Tenant('companyId') companyId: string) {
    return this.machineService.create(createDto, companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any, @Tenant('companyId') companyId: string) {
    return this.machineService.update(id, updateDto, companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Tenant('companyId') companyId: string) {
    return this.machineService.remove(id, companyId);
  }
}
