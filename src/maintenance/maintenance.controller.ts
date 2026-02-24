import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Tenant } from '../common/decorators/tenant.decorator';
import { UserRole } from '../types/roles';

@Controller('maintenance')
@UseGuards(AuthGuard, RolesGuard)
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}

  @Get('plans')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findPlans(@Tenant() companyId: string, @Query('machineId') machineId?: string) {
    return this.service.findPlans(companyId, machineId);
  }

  @Get('plans/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findPlanById(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.findPlanById(id, companyId);
  }

  @Post('plans')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async createPlan(@Body() dto: any, @Tenant() companyId: string) {
    return this.service.createPlan(dto, companyId);
  }

  @Put('plans/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async updatePlan(@Param('id') id: string, @Body() dto: any, @Tenant() companyId: string) {
    return this.service.updatePlan(id, dto, companyId);
  }

  @Delete('plans/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async deletePlan(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deletePlan(id, companyId);
  }

  @Get('schedules')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findSchedules(@Tenant() companyId: string, @Query('machineId') machineId?: string) {
    return this.service.findSchedules(companyId, machineId);
  }

  @Get('schedules/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findScheduleById(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.findScheduleById(id, companyId);
  }

  @Post('schedules')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async createSchedule(@Body() dto: any, @Tenant() companyId: string) {
    return this.service.createSchedule(dto, companyId);
  }

  @Put('schedules/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async updateSchedule(@Param('id') id: string, @Body() dto: any, @Tenant() companyId: string) {
    return this.service.updateSchedule(id, dto, companyId);
  }

  @Delete('schedules/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async deleteSchedule(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteSchedule(id, companyId);
  }

  @Get('work-orders')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findWorkOrders(@Tenant() companyId: string, @Query('machineId') machineId?: string) {
    return this.service.findWorkOrders(companyId, machineId);
  }

  @Get('work-orders/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findWorkOrderById(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.findWorkOrderById(id, companyId);
  }

  @Post('work-orders')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async createWorkOrder(@Body() dto: any, @Tenant() companyId: string) {
    return this.service.createWorkOrder(dto, companyId);
  }

  @Put('work-orders/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async updateWorkOrder(@Param('id') id: string, @Body() dto: any, @Tenant() companyId: string) {
    return this.service.updateWorkOrder(id, dto, companyId);
  }

  @Delete('work-orders/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async deleteWorkOrder(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteWorkOrder(id, companyId);
  }
}
