import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { ClientService } from './clients.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { TenantMembershipGuard } from '../auth/guards/tenant-membership.guard';
import { Tenant } from '../auth/decorators/tenant.decorator';

@Controller('clients')
@UseGuards(FirebaseAuthGuard, TenantMembershipGuard)
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get()
  findAll(@Tenant('companyId') companyId: string) {
    return this.clientService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Tenant('companyId') companyId: string) {
    return this.clientService.findOne(id, companyId);
  }

  @Post()
  create(@Body() createDto: any, @Tenant('companyId') companyId: string) {
    return this.clientService.create(createDto, companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any, @Tenant('companyId') companyId: string) {
    return this.clientService.update(id, updateDto, companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Tenant('companyId') companyId: string) {
    return this.clientService.remove(id, companyId);
  }
}
