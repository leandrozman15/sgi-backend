import { Controller, Get, Post, Body, Param, Put, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { ExpeditionService } from './expedition.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../types/roles';
import { Tenant } from '../common/decorators/tenant.decorator';

@Controller('expeditions')
@UseGuards(AuthGuard, RolesGuard)
export class ExpeditionController {
  constructor(private readonly service: ExpeditionService) {}

  @Get()
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.CONSULTOR)
  async findAll(@Tenant() companyId: string, @Query('limit') limit?: string) {
    const data = await this.service.findByCompany(companyId, limit ? Number(limit) : undefined);
    return { data };
  }

  @Get(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.CONSULTOR)
  async findOne(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.findById(id, companyId);
  }

  @Post()
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR, UserRole.OPERADOR)
  async create(@Body() createDto: any, @Tenant() companyId: string) {
    return this.service.createItem(createDto, companyId);
  }

  @Put(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR, UserRole.OPERADOR)
  async update(
    @Param('id') id: string,
    @Body() updateDto: any,
    @Tenant() companyId: string,
  ) {
    return this.service.updateItem(id, updateDto, companyId);
  }

  @Patch(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR, UserRole.OPERADOR)
  async patch(
    @Param('id') id: string,
    @Body() patchDto: any,
    @Tenant() companyId: string,
  ) {
    return this.service.updateItem(id, patchDto, companyId);
  }

  @Delete(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async remove(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteItem(id, companyId);
  }
}
