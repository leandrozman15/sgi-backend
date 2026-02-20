import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../types/roles';

@Controller('companies')
@UseGuards(AuthGuard, RolesGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.MASTER)
  async create(@Body() createCompanyDto: any) {
    return this.companiesService.create(createCompanyDto);
  }

  @Put(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateCompanyDto: any) {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @Roles(UserRole.MASTER)
  async delete(@Param('id') id: string) {
    return this.companiesService.delete(id);
  }

  @Post(':id/activate')
  @Roles(UserRole.MASTER)
  async activate(@Param('id') id: string) {
    return this.companiesService.activate(id);
  }

  @Post(':id/deactivate')
  @Roles(UserRole.MASTER)
  async deactivate(@Param('id') id: string) {
    return this.companiesService.deactivate(id);
  }
}
