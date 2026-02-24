import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { SaleService } from './sales.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../types/roles';
import { Tenant } from '../common/decorators/tenant.decorator';

@Controller('sales')
@UseGuards(AuthGuard, RolesGuard)
export class SaleController {
  constructor(private readonly service: SaleService) {}

  @Get()
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findAll(@Tenant() companyId: string) {
    return this.service.findByCompany(companyId);
  }

  @Get('lookup/access-key/:accessKey')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findByAccessKey(@Param('accessKey') accessKey: string, @Tenant() companyId: string) {
    return this.service.findByAccessKey(accessKey, companyId);
  }

  @Get(':id/fiscal-history')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getFiscalHistory(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.getFiscalHistory(id, companyId);
  }

  @Post(':id/fiscal-document')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async upsertFiscalDocument(
    @Param('id') id: string,
    @Body() payload: any,
    @Tenant() companyId: string
  ) {
    return this.service.upsertFiscalDocument(id, companyId, payload);
  }

  @Post(':id/fiscal-event')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async createFiscalEvent(
    @Param('id') id: string,
    @Body() payload: any,
    @Tenant() companyId: string
  ) {
    return this.service.createFiscalEvent(id, companyId, payload);
  }

  @Get(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findOne(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.findById(id, companyId);
  }

  @Post()
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async create(@Body() createDto: any, @Tenant() companyId: string) {
    return this.service.createItem(createDto, companyId);
  }

  @Put(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateDto: any,
    @Tenant() companyId: string
  ) {
    return this.service.updateItem(id, updateDto, companyId);
  }

  @Delete(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async remove(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteItem(id, companyId);
  }
}
