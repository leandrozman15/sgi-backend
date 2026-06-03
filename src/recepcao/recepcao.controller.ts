import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RecepcaoService } from './recepcao.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Tenant } from '../common/decorators/tenant.decorator';
import { UserRole } from '../types/roles';

@Controller('recepcoes')
@UseGuards(AuthGuard, RolesGuard)
export class RecepcaoController {
  constructor(private readonly service: RecepcaoService) {}

  @Get()
  @Roles(
    UserRole.MASTER,
    UserRole.ADMIN,
    UserRole.GERENTE,
    UserRole.SUPERVISOR,
    UserRole.OPERADOR,
    UserRole.CONSULTOR,
  )
  async findAll(
    @Tenant() companyId: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('fornecedorId') fornecedorId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const data = await this.service.findByCompany(companyId, {
      limit: limit ? Number(limit) : undefined,
      status,
      fornecedorId,
      from,
      to,
    });
    return { data };
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
  async create(@Body() body: any, @Tenant() companyId: string) {
    return this.service.createItem(companyId, body);
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
    @Body() body: any,
    @Tenant() companyId: string,
  ) {
    return this.service.updateItem(companyId, id, body);
  }

  @Patch(':id')
  @Roles(
    UserRole.MASTER,
    UserRole.ADMIN,
    UserRole.GERENTE,
    UserRole.SUPERVISOR,
    UserRole.OPERADOR,
  )
  async patch(
    @Param('id') id: string,
    @Body() body: any,
    @Tenant() companyId: string,
  ) {
    return this.service.updateItem(companyId, id, body);
  }

  @Patch(':id/status')
  @Roles(
    UserRole.MASTER,
    UserRole.ADMIN,
    UserRole.GERENTE,
    UserRole.SUPERVISOR,
    UserRole.OPERADOR,
  )
  async patchStatus(
    @Param('id') id: string,
    @Body() body: any,
    @Tenant() companyId: string,
  ) {
    return this.service.patchStatus(companyId, id, String(body?.status));
  }

  @Delete(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async remove(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteItem(companyId, id);
  }
}
