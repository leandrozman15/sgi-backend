import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../types/roles';
import { Tenant } from '../common/decorators/tenant.decorator';

@Controller('analysis')
@UseGuards(AuthGuard, RolesGuard)
export class AnalysisController {
  constructor(private readonly service: AnalysisService) {}

  @Get('dashboard-gerencial')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getDashboard(
    @Tenant() companyId: string,
    @Query('period') period?: string,
  ) {
    return this.service.getDashboardGerencial(companyId, period || 'month');
  }

  @Get('inventory-control')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getInventoryControl(@Tenant() companyId: string) {
    return this.service.getInventoryControl(companyId);
  }

  @Get('stock-movements')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getStockMovements(
    @Tenant() companyId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getStockMovements(companyId, Number(limit || 200));
  }

  @Get('raw-material-consumption')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getRawMaterialConsumption(
    @Tenant() companyId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getRawMaterialConsumption(companyId, Number(limit || 500));
  }

  @Get('employee-efficiency')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getEmployeeEfficiency(@Tenant() companyId: string) {
    return this.service.getEmployeeEfficiency(companyId);
  }

  @Get('machine-productivity')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getMachineProductivity(@Tenant() companyId: string) {
    return this.service.getMachineProductivity(companyId);
  }

  @Get('scrap-register')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getScrapRegister(@Tenant() companyId: string) {
    return this.service.getScrapRegister(companyId);
  }
}
