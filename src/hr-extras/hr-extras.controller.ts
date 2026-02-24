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
