import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { ProductionOrderService } from './production-orders.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../types/roles';
import { Tenant } from '../common/decorators/tenant.decorator';

@Controller('production-orders')
@UseGuards(AuthGuard, RolesGuard)
export class ProductionOrderController {
  constructor(private readonly service: ProductionOrderService) {}

  @Get()
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.CONSULTOR)
  async findAll(@Tenant() companyId: string) {
    return this.service.findByCompany(companyId);
  }

  @Get(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.CONSULTOR)
  async findOne(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.findById(id, companyId);
  }

  @Post()
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async create(@Body() createDto: any, @Tenant() companyId: string) {
    return this.service.createItem(createDto, companyId);
  }

  @Put(':id')
  @Roles(
    UserRole.MASTER,
    UserRole.ADMIN,
    UserRole.GERENTE,
    UserRole.SUPERVISOR,
    UserRole.OPERADOR,
    UserRole.CONSULTOR,
  )
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

  // ─── Bultos (Embalagem) ──────────────────────────────────────────────────

  @Post(':id/bultos')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR, UserRole.OPERADOR)
  async addBulto(
    @Param('id') id: string,
    @Body() bultoDto: any,
    @Tenant() companyId: string,
  ) {
    return this.service.addBulto(id, bultoDto, companyId);
  }

  @Delete(':id/bultos/:bultoId')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR)
  async removeBulto(
    @Param('id') id: string,
    @Param('bultoId') bultoId: string,
    @Tenant() companyId: string,
  ) {
    return this.service.removeBulto(id, bultoId, companyId);
  }

  @Post(':id/confirmar-embalagem')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR, UserRole.OPERADOR)
  async confirmarEmbalagem(
    @Param('id') id: string,
    @Tenant() companyId: string,
  ) {
    return this.service.confirmarEmbalagem(id, companyId);
  }
}
