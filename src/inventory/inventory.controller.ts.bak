import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { InventoryMovementService } from './inventory.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { TenantMembershipGuard } from '../auth/guards/tenant-membership.guard';
import { Tenant } from '../auth/decorators/tenant.decorator';

@Controller('inventory')
@UseGuards(FirebaseAuthGuard, TenantMembershipGuard)
export class InventoryMovementController {
  constructor(private readonly inventorymovementService: InventoryMovementService) {}

  @Get()
  findAll(@Tenant('companyId') companyId: string) {
    return this.inventorymovementService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Tenant('companyId') companyId: string) {
    return this.inventorymovementService.findOne(id, companyId);
  }

  @Post()
  create(@Body() createDto: any, @Tenant('companyId') companyId: string) {
    return this.inventorymovementService.create(createDto, companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any, @Tenant('companyId') companyId: string) {
    return this.inventorymovementService.update(id, updateDto, companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Tenant('companyId') companyId: string) {
    return this.inventorymovementService.remove(id, companyId);
  }
}
