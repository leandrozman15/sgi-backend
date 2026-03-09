import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { CompanyService } from './companies.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../types/roles';
import { Tenant } from '../common/decorators/tenant.decorator';
import { UpdateNfeCredentialsDto } from './dto/update-nfe-credentials.dto';
import { User } from '../auth/decorators/user.decorator';

@Controller('companies')
@UseGuards(AuthGuard, RolesGuard)
export class CompanyController {
  constructor(private readonly service: CompanyService) {}

  @Get('admin/overview')
  @Roles(UserRole.MASTER)
  async getAdminOverview() {
    return this.service.getAdminOverview();
  }

  @Get('admin/:id/details')
  @Roles(UserRole.MASTER)
  async getAdminDetails(@Param('id') id: string) {
    return this.service.getAdminDetails(id);
  }

  @Post('admin/bootstrap')
  @Roles(UserRole.MASTER)
  async bootstrapAdminCompany(
    @Body()
    payload: {
      name: string;
      cnpj?: string;
      adminEmail: string;
      adminName?: string;
      plan?: string;
      trial?: boolean;
      trialDays?: number;
    },
  ) {
    return this.service.bootstrapAdminCompany(payload);
  }

  @Post('admin/:id/pause')
  @Roles(UserRole.MASTER)
  async pauseCompany(@Param('id') id: string) {
    return this.service.pauseCompany(id);
  }

  @Post('admin/:id/reactivate')
  @Roles(UserRole.MASTER)
  async reactivateCompany(@Param('id') id: string) {
    return this.service.reactivateCompany(id);
  }

  @Delete('admin/:id')
  @Roles(UserRole.MASTER)
  async softDeleteCompany(@Param('id') id: string) {
    return this.service.softDeleteCompany(id);
  }

  @Get()
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE, UserRole.SUPERVISOR, UserRole.OPERADOR, UserRole.CONSULTOR)
  async findAll(@Tenant() companyId: string, @User() user: any) {
    return this.service.findByCompany(companyId, user?.uid || null, user?.role || user?.claims?.role || null);
  }

  @Get('integrations/nfe/credentials')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async getBrasilNfeCredentials(@Tenant() companyId: string) {
    return this.service.getBrasilNfeCredentials(companyId);
  }

  @Put('integrations/nfe/credentials')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async updateBrasilNfeCredentials(
    @Body() payload: UpdateNfeCredentialsDto,
    @Tenant() companyId: string
  ) {
    return this.service.updateBrasilNfeCredentials(companyId, payload || {});
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
