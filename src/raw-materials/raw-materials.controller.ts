import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { RawMaterialService } from './raw-materials.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { TenantMembershipGuard } from '../auth/guards/tenant-membership.guard';
import { Tenant } from '../auth/decorators/tenant.decorator';

@Controller('raw-materials')
@UseGuards(FirebaseAuthGuard, TenantMembershipGuard)
export class RawMaterialController {
  constructor(private readonly rawmaterialService: RawMaterialService) {}

  @Get()
  findAll(@Tenant('companyId') companyId: string) {
    return this.rawmaterialService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Tenant('companyId') companyId: string) {
    return this.rawmaterialService.findOne(id, companyId);
  }

  @Post()
  create(@Body() createDto: any, @Tenant('companyId') companyId: string) {
    return this.rawmaterialService.create(createDto, companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any, @Tenant('companyId') companyId: string) {
    return this.rawmaterialService.update(id, updateDto, companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Tenant('companyId') companyId: string) {
    return this.rawmaterialService.remove(id, companyId);
  }
}
