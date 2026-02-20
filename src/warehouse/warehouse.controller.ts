import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { WarehouseLocationService } from './warehouse.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { TenantMembershipGuard } from '../auth/guards/tenant-membership.guard';
import { Tenant } from '../auth/decorators/tenant.decorator';

@Controller('warehouse')
@UseGuards(FirebaseAuthGuard, TenantMembershipGuard)
export class WarehouseLocationController {
  constructor(private readonly warehouselocationService: WarehouseLocationService) {}

  @Get()
  findAll(@Tenant('companyId') companyId: string) {
    return this.warehouselocationService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Tenant('companyId') companyId: string) {
    return this.warehouselocationService.findOne(id, companyId);
  }

  @Post()
  create(@Body() createDto: any, @Tenant('companyId') companyId: string) {
    return this.warehouselocationService.create(createDto, companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any, @Tenant('companyId') companyId: string) {
    return this.warehouselocationService.update(id, updateDto, companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Tenant('companyId') companyId: string) {
    return this.warehouselocationService.remove(id, companyId);
  }
}
