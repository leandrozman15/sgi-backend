import { Controller, Get, Post, Body, Param, Put, Delete, Patch, UseGuards } from '@nestjs/common';
import { ShiftService } from './shifts.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../types/roles';
import { Tenant } from '../common/decorators/tenant.decorator';

@Controller('shifts')
@UseGuards(AuthGuard, RolesGuard)
export class ShiftController {
  constructor(private readonly service: ShiftService) {}

  @Get()
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR)
  async findAll(@Tenant() companyId: string) {
    return this.service.findByCompany(companyId);
  }

  @Get(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR)
  async findOne(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.findById(id, companyId);
  }

  @Post()
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async create(@Body() createDto: any, @Tenant() companyId: string) {
    return this.service.createItem(createDto, companyId);
  }

  @Put(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async update(@Param('id') id: string, @Body() updateDto: any, @Tenant() companyId: string) {
    return this.service.updateItem(id, updateDto, companyId);
  }

  @Patch(':id/production')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR)
  async updateProduction(@Param('id') id: string, @Body() dto: any, @Tenant() companyId: string) {
    return this.service.updateProduction(id, dto, companyId);
  }

  @Delete(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async remove(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteItem(id, companyId);
  }
}
