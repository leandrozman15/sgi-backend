import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CustomerOrderService } from './customer-orders.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../types/roles';
import { Tenant } from '../common/decorators/tenant.decorator';

@Controller('customer-orders')
@UseGuards(AuthGuard, RolesGuard)
export class CustomerOrderController {
  constructor(private readonly service: CustomerOrderService) {}

  @Get()
  @Roles(
    UserRole.MASTER,
    UserRole.ADMIN,
    UserRole.GERENTE,
    UserRole.SUPERVISOR,
    UserRole.OPERADOR,
    UserRole.CONSULTOR,
  )
  async findAll(@Tenant() companyId: string) {
    return this.service.findByCompany(companyId);
  }

  @Get(':id')
  @Roles(
    UserRole.MASTER,
    UserRole.ADMIN,
    UserRole.GERENTE,
    UserRole.SUPERVISOR,
    UserRole.OPERADOR,
    UserRole.CONSULTOR,
  )
  async findOne(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.findById(id, companyId);
  }

  @Post()
  @Roles(
    UserRole.MASTER,
    UserRole.ADMIN,
    UserRole.GERENTE,
    UserRole.SUPERVISOR,
    UserRole.OPERADOR,
  )
  async create(@Body() dto: any, @Tenant() companyId: string) {
    return this.service.createItem(dto, companyId);
  }

  @Put(':id')
  @Roles(
    UserRole.MASTER,
    UserRole.ADMIN,
    UserRole.GERENTE,
    UserRole.SUPERVISOR,
    UserRole.OPERADOR,
  )
  async update(
    @Param('id') id: string,
    @Body() dto: any,
    @Tenant() companyId: string,
  ) {
    return this.service.updateItem(id, dto, companyId);
  }

  @Delete(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async remove(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteItem(id, companyId);
  }

  // ─── ações ───────────────────────────────────────────────────────────────
  @Post(':id/check-stock')
  @Roles(
    UserRole.MASTER,
    UserRole.ADMIN,
    UserRole.GERENTE,
    UserRole.SUPERVISOR,
    UserRole.OPERADOR,
  )
  async checkStock(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.checkStock(id, companyId);
  }

  @Post(':id/items/:itemId/convert-production')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR)
  async convertToProduction(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: any,
    @Tenant() companyId: string,
  ) {
    return this.service.convertItemToProductionOrder(id, itemId, dto, companyId);
  }

  @Post(':id/items/:itemId/convert-purchase')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR)
  async convertToPurchase(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: any,
    @Tenant() companyId: string,
  ) {
    return this.service.convertItemToPurchaseOrder(id, itemId, dto, companyId);
  }

  @Post(':id/approve-packing')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR)
  async approveForPacking(
    @Param('id') id: string,
    @Body() dto: any,
    @Tenant() companyId: string,
  ) {
    return this.service.approveForPacking(id, companyId, dto);
  }
}
