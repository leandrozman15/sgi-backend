import { Controller, Get, Post, Body, Param, Put, Patch, Delete, UseGuards, Query } from '@nestjs/common';
import { WorkAccidentService } from './hr-extras.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../types/roles';
import { Tenant } from '../common/decorators/tenant.decorator';

@Controller('hr-extras')
@UseGuards(AuthGuard, RolesGuard)
export class WorkAccidentController {
  constructor(private readonly service: WorkAccidentService) {}

  @Get('vacations')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async listVacations(@Tenant() companyId: string, @Query('limit') limit?: string) {
    return this.service.findByType('vacation', companyId, Number(limit) || 200);
  }

  @Get('vacations/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getVacation(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.findByTypeAndId('vacation', id, companyId);
  }

  @Post('vacations')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async createVacation(@Body() createDto: any, @Tenant() companyId: string) {
    return this.service.createByType('vacation', createDto, companyId);
  }

  @Patch('vacations/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async updateVacation(@Param('id') id: string, @Body() updateDto: any, @Tenant() companyId: string) {
    return this.service.updateByType('vacation', id, updateDto, companyId);
  }

  @Delete('vacations/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async removeVacation(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteByType('vacation', id, companyId);
  }

  @Get('attendance')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async listAttendance(@Tenant() companyId: string, @Query('limit') limit?: string) {
    return this.service.findByType('attendance', companyId, Number(limit) || 500);
  }

  @Get('attendance/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getAttendance(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.findByTypeAndId('attendance', id, companyId);
  }

  @Post('attendance')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async createAttendance(@Body() createDto: any, @Tenant() companyId: string) {
    return this.service.createByType('attendance', createDto, companyId);
  }

  @Patch('attendance/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async updateAttendance(@Param('id') id: string, @Body() updateDto: any, @Tenant() companyId: string) {
    return this.service.updateByType('attendance', id, updateDto, companyId);
  }

  @Delete('attendance/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async removeAttendance(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteByType('attendance', id, companyId);
  }

  @Get('overtime')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async listOvertime(@Tenant() companyId: string, @Query('limit') limit?: string) {
    return this.service.findByType('overtime', companyId, Number(limit) || 300);
  }

  @Get('overtime/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getOvertime(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.findByTypeAndId('overtime', id, companyId);
  }

  @Post('overtime')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async createOvertime(@Body() createDto: any, @Tenant() companyId: string) {
    return this.service.createByType('overtime', createDto, companyId);
  }

  @Patch('overtime/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async updateOvertime(@Param('id') id: string, @Body() updateDto: any, @Tenant() companyId: string) {
    return this.service.updateByType('overtime', id, updateDto, companyId);
  }

  @Delete('overtime/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async removeOvertime(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteByType('overtime', id, companyId);
  }

  @Get('production-coverage')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async listProductionCoverage(@Tenant() companyId: string, @Query('limit') limit?: string) {
    return this.service.findByType('coverage', companyId, Number(limit) || 300);
  }

  @Post('production-coverage')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async createProductionCoverage(@Body() createDto: any, @Tenant() companyId: string) {
    return this.service.createByType('coverage', createDto, companyId);
  }

  @Patch('production-coverage/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async updateProductionCoverage(@Param('id') id: string, @Body() updateDto: any, @Tenant() companyId: string) {
    return this.service.updateByType('coverage', id, updateDto, companyId);
  }

  @Delete('production-coverage/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async removeProductionCoverage(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteByType('coverage', id, companyId);
  }

  @Get('training-matrix')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async listTrainingMatrix(@Tenant() companyId: string, @Query('limit') limit?: string) {
    return this.service.findByType('training-matrix', companyId, Number(limit) || 400);
  }

  @Post('training-matrix')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async createTrainingMatrix(@Body() createDto: any, @Tenant() companyId: string) {
    return this.service.createByType('training-matrix', createDto, companyId);
  }

  @Patch('training-matrix/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async updateTrainingMatrix(@Param('id') id: string, @Body() updateDto: any, @Tenant() companyId: string) {
    return this.service.updateByType('training-matrix', id, updateDto, companyId);
  }

  @Delete('training-matrix/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async removeTrainingMatrix(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteByType('training-matrix', id, companyId);
  }

  @Get('accidents')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async listAccidents(@Tenant() companyId: string, @Query('limit') limit?: string) {
    return this.service.findByType('accident', companyId, Number(limit) || 100);
  }

  @Get('accidents/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getAccident(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.findByTypeAndId('accident', id, companyId);
  }

  @Post('accidents')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async createAccident(@Body() createDto: any, @Tenant() companyId: string) {
    return this.service.createByType('accident', createDto, companyId);
  }

  @Patch('accidents/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async updateAccident(@Param('id') id: string, @Body() updateDto: any, @Tenant() companyId: string) {
    return this.service.updateByType('accident', id, updateDto, companyId);
  }

  @Delete('accidents/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async removeAccident(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteByType('accident', id, companyId);
  }

  @Get('epis')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async listEpis(@Tenant() companyId: string, @Query('limit') limit?: string) {
    return this.service.findByType('epi', companyId, Number(limit) || 200);
  }

  @Get('epis/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getEpi(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.findByTypeAndId('epi', id, companyId);
  }

  @Post('epis')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async createEpi(@Body() createDto: any, @Tenant() companyId: string) {
    return this.service.createByType('epi', createDto, companyId);
  }

  @Patch('epis/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async updateEpi(@Param('id') id: string, @Body() updateDto: any, @Tenant() companyId: string) {
    return this.service.updateByType('epi', id, updateDto, companyId);
  }

  @Delete('epis/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async removeEpi(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteByType('epi', id, companyId);
  }

  // --- Benefícios corporativos ---

  @Get('benefits')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async listBenefits(
    @Tenant() companyId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listBenefits(companyId, {
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('benefits/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getBenefit(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.getBenefit(id, companyId);
  }

  @Post('benefits')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async createBenefit(@Body() body: any, @Tenant() companyId: string) {
    return this.service.createBenefit(body, companyId);
  }

  @Patch('benefits/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async updateBenefit(
    @Param('id') id: string,
    @Body() body: any,
    @Tenant() companyId: string,
  ) {
    return this.service.updateBenefit(id, body, companyId);
  }

  @Delete('benefits/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async deleteBenefit(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteBenefit(id, companyId);
  }

  // --- Serviços, workspace e comunicações ---

  @Get('benefit-services')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async listBenefitServices(
    @Tenant() companyId: string,
    @Query('kind') kind?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listBenefitServices(companyId, {
      kind,
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('benefit-services/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getBenefitService(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.getBenefitService(id, companyId);
  }

  @Post('benefit-services')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async createBenefitService(@Body() body: any, @Tenant() companyId: string) {
    return this.service.createBenefitService(body, companyId);
  }

  @Patch('benefit-services/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async updateBenefitService(
    @Param('id') id: string,
    @Body() body: any,
    @Tenant() companyId: string,
  ) {
    return this.service.updateBenefitService(id, body, companyId);
  }

  @Delete('benefit-services/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async deleteBenefitService(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteBenefitService(id, companyId);
  }

  // --- Controles de benefícios ---

  @Get('benefit-controls')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async listBenefitControls(
    @Tenant() companyId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listBenefitControls(companyId, limit ? Number(limit) : undefined);
  }

  @Get('benefit-controls/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getBenefitControl(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.getBenefitControl(id, companyId);
  }

  @Post('benefit-controls')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async createBenefitControl(@Body() body: any, @Tenant() companyId: string) {
    return this.service.createBenefitControl(body, companyId);
  }

  @Patch('benefit-controls/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async updateBenefitControl(
    @Param('id') id: string,
    @Body() body: any,
    @Tenant() companyId: string,
  ) {
    return this.service.updateBenefitControl(id, body, companyId);
  }

  @Delete('benefit-controls/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async deleteBenefitControl(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteBenefitControl(id, companyId);
  }

  @Get()
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findAll(@Tenant() companyId: string) {
    return this.service.findByType('accident', companyId, 100);
  }

  @Get(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findOne(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.findByTypeAndId('accident', id, companyId);
  }

  @Post()
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async create(@Body() createDto: any, @Tenant() companyId: string) {
    return this.service.createByType('accident', createDto, companyId);
  }

  @Put(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async update(
    @Param('id') id: string,
    @Body() updateDto: any,
    @Tenant() companyId: string
  ) {
    return this.service.updateByType('accident', id, updateDto, companyId);
  }

  @Delete(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async remove(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteByType('accident', id, companyId);
  }
}
