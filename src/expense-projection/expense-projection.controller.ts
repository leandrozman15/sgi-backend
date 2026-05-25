import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ExpenseProjectionService } from './expense-projection.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../types/roles';
import { Tenant } from '../common/decorators/tenant.decorator';

@Controller('budget')
@UseGuards(AuthGuard, RolesGuard)
export class ExpenseProjectionController {
  constructor(private readonly service: ExpenseProjectionService) {}

  // ─── Períodos ──────────────────────────────────────────────────────
  @Get('periods')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.CONSULTOR)
  async listPeriods(@Tenant() companyId: string) {
    const data = await this.service.listPeriods(companyId);
    return { data };
  }

  @Post('periods')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async createPeriod(@Body() body: any, @Tenant() companyId: string) {
    return this.service.createPeriod(companyId, body);
  }

  @Put('periods/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async updatePeriod(
    @Param('id') id: string,
    @Body() body: any,
    @Tenant() companyId: string,
  ) {
    return this.service.updatePeriod(companyId, id, body);
  }

  @Post('periods/:id/close')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async closePeriod(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.closePeriod(companyId, id);
  }

  @Post('periods/:id/reopen')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async reopenPeriod(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.reopenPeriod(companyId, id);
  }

  // ─── Centros de Custo ──────────────────────────────────────────────
  @Get('cost-centers')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.CONSULTOR)
  async listCostCenters(@Tenant() companyId: string) {
    const data = await this.service.listCostCenters(companyId);
    return { data };
  }

  @Post('cost-centers')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async createCostCenter(@Body() body: any, @Tenant() companyId: string) {
    return this.service.createCostCenter(companyId, body);
  }

  @Put('cost-centers/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async updateCostCenter(
    @Param('id') id: string,
    @Body() body: any,
    @Tenant() companyId: string,
  ) {
    return this.service.updateCostCenter(companyId, id, body);
  }

  // ─── Linhas de orçamento ───────────────────────────────────────────
  @Get('lines')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.CONSULTOR)
  async listLines(@Query('periodId') periodId: string, @Tenant() companyId: string) {
    const data = await this.service.listLines(companyId, periodId);
    return { data };
  }

  @Post('lines')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async createLine(@Body() body: any, @Tenant() companyId: string) {
    return this.service.createLine(companyId, body);
  }

  @Put('lines/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async updateLine(
    @Param('id') id: string,
    @Body() body: any,
    @Tenant() companyId: string,
  ) {
    return this.service.updateLine(companyId, id, body);
  }

  // ─── Projeção / Commitments / Alerts ───────────────────────────────
  @Get('projection')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.CONSULTOR)
  async getProjection(
    @Tenant() companyId: string,
    @Query('periodId') periodId?: string,
    @Query('plant') plant?: string,
  ) {
    return this.service.getProjection(companyId, { periodId, plant });
  }

  @Get('commitments')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.CONSULTOR)
  async listCommitments(@Query('periodId') periodId: string, @Tenant() companyId: string) {
    const data = await this.service.listCommitments(companyId, periodId);
    return { data };
  }

  @Get('alerts')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.CONSULTOR)
  async listAlerts(@Query('periodId') periodId: string | undefined, @Tenant() companyId: string) {
    const data = await this.service.listAlerts(companyId, periodId);
    return { data };
  }

  @Post('alerts/:id/ack')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR)
  async acknowledgeAlert(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.acknowledgeAlert(companyId, id);
  }
}
