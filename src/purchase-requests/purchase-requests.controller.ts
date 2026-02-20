import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { PurchaseRequestService } from './purchase-requests.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { TenantMembershipGuard } from '../auth/guards/tenant-membership.guard';
import { Tenant } from '../auth/decorators/tenant.decorator';

@Controller('purchase-requests')
@UseGuards(FirebaseAuthGuard, TenantMembershipGuard)
export class PurchaseRequestController {
  constructor(private readonly purchaserequestService: PurchaseRequestService) {}

  @Get()
  findAll(@Tenant('companyId') companyId: string) {
    return this.purchaserequestService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Tenant('companyId') companyId: string) {
    return this.purchaserequestService.findOne(id, companyId);
  }

  @Post()
  create(@Body() createDto: any, @Tenant('companyId') companyId: string) {
    return this.purchaserequestService.create(createDto, companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any, @Tenant('companyId') companyId: string) {
    return this.purchaserequestService.update(id, updateDto, companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Tenant('companyId') companyId: string) {
    return this.purchaserequestService.remove(id, companyId);
  }
}
