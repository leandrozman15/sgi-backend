import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { CalibrationService } from './quality.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../types/roles';
import { Tenant } from '../common/decorators/tenant.decorator';

@Controller('quality')
@UseGuards(AuthGuard, RolesGuard)
export class CalibrationController {
  constructor(private readonly service: CalibrationService) {}

  @Get()
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findAll(@Tenant() companyId: string) {
    return this.service.findByCompany(companyId);
  }

  @Get('products/:productId/history')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findByProduct(
    @Param('productId') productId: string,
    @Tenant() companyId: string,
    @Query('productCode') productCode?: string,
    @Query('productName') productName?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = Number(limit);
    return this.service.findByProduct(companyId, productId, {
      productCode,
      productName,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : 300,
    });
  }

  @Get(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findOne(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.findById(id, companyId);
  }

  @Post()
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async create(@Body() createDto: any, @Tenant() companyId: string) {
    return this.service.createItem(createDto, companyId);
  }

  @Put(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
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
}
