import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { CarrierService } from './carriers.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { TenantMembershipGuard } from '../auth/guards/tenant-membership.guard';
import { Tenant } from '../auth/decorators/tenant.decorator';

@Controller('carriers')
@UseGuards(FirebaseAuthGuard, TenantMembershipGuard)
export class CarrierController {
  constructor(private readonly carrierService: CarrierService) {}

  @Get()
  findAll(@Tenant('companyId') companyId: string) {
    return this.carrierService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Tenant('companyId') companyId: string) {
    return this.carrierService.findOne(id, companyId);
  }

  @Post()
  create(@Body() createDto: any, @Tenant('companyId') companyId: string) {
    return this.carrierService.create(createDto, companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any, @Tenant('companyId') companyId: string) {
    return this.carrierService.update(id, updateDto, companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Tenant('companyId') companyId: string) {
    return this.carrierService.remove(id, companyId);
  }
}
