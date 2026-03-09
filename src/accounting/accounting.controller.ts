import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../types/roles';
import { Tenant } from '../common/decorators/tenant.decorator';

@Controller('accounting')
@UseGuards(AuthGuard, RolesGuard)
export class AccountingController {
  constructor(private readonly service: AccountingService) {}

  @Get(':resource')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.CONSULTOR)
  async findAll(
    @Param('resource') resource: string,
    @Tenant() companyId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findByResource(resource, companyId, Number(limit || 200));
  }

  @Get(':resource/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.CONSULTOR)
  async findOne(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Tenant() companyId: string,
  ) {
    return this.service.findById(resource, id, companyId);
  }

  @Post(':resource')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async create(
    @Param('resource') resource: string,
    @Body() payload: any,
    @Tenant() companyId: string,
  ) {
    return this.service.createItem(resource, payload, companyId);
  }

  @Put(':resource/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async update(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Body() payload: any,
    @Tenant() companyId: string,
  ) {
    return this.service.updateItem(resource, id, payload, companyId);
  }

  @Delete(':resource/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async remove(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Tenant() companyId: string,
  ) {
    return this.service.deleteItem(resource, id, companyId);
  }
}
