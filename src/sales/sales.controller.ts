import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { SaleService } from './sales.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../types/roles';
import { Tenant } from '../common/decorators/tenant.decorator';

@Controller('sales')
@UseGuards(AuthGuard, RolesGuard)
export class SaleController {
  constructor(private readonly service: SaleService) {}

  @Get()
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findAll(@Tenant() companyId: string) {
    return this.service.findByCompany(companyId);
  }

  @Get('lookup/access-key/:accessKey')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findByAccessKey(@Param('accessKey') accessKey: string, @Tenant() companyId: string) {
    return this.service.findByAccessKey(accessKey, companyId);
  }

  @Get(':id/fiscal-history')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getFiscalHistory(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.getFiscalHistory(id, companyId);
  }

  @Post(':id/fiscal-document')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async upsertFiscalDocument(
    @Param('id') id: string,
    @Body() payload: any,
    @Tenant() companyId: string
  ) {
    return this.service.upsertFiscalDocument(id, companyId, payload);
  }

  @Post(':id/fiscal-event')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async createFiscalEvent(
    @Param('id') id: string,
    @Body() payload: any,
    @Tenant() companyId: string
  ) {
    return this.service.createFiscalEvent(id, companyId, payload);
  }

  @Post(':id/nfe/emit')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async emitNfe(
    @Param('id') id: string,
    @Body() payload: any,
    @Tenant() companyId: string
  ) {
    return this.service.emitNfe(id, companyId, payload);
  }

  @Post(':id/nfe/cancel')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async cancelNfe(
    @Param('id') id: string,
    @Body('justificativa') justificativa: string,
    @Tenant() companyId: string
  ) {
    return this.service.cancelNfe(id, companyId, justificativa);
  }

  @Post(':id/nfe/complement')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async emitNfeComplement(
    @Param('id') id: string,
    @Body() payload: any,
    @Tenant() companyId: string
  ) {
    return this.service.emitNfeComplementar(id, companyId, payload);
  }

  @Post('nfse/transmit')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async transmitNfse(
    @Body() payload: any,
    @Tenant() companyId: string
  ) {
    return this.service.transmitNfse(companyId, payload);
  }

  @Post('nfse/status')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getNfseStatus(
    @Body() payload: any,
    @Tenant() companyId: string
  ) {
    return this.service.getNfseStatus(companyId, payload);
  }

  @Post('nfse/cancel')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async cancelNfse(
    @Body() payload: any,
    @Tenant() companyId: string
  ) {
    return this.service.cancelNfse(companyId, payload);
  }

  @Post('sped/generate')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async generateSped(
    @Body() payload: any,
    @Tenant() companyId: string
  ) {
    return this.service.generateSped(companyId, payload);
  }

  @Post('sped/unify')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async unifySped(
    @Body() payload: any,
    @Tenant() companyId: string
  ) {
    return this.service.unifySped(companyId, payload);
  }

  @Post('sped/recreate/:codigo')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async recreateSped(
    @Param('codigo') codigo: string,
    @Tenant() companyId: string
  ) {
    return this.service.recreateSped(companyId, codigo);
  }

  @Post('sped/get/:codigo')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getSped(
    @Param('codigo') codigo: string,
    @Tenant() companyId: string
  ) {
    return this.service.getSped(companyId, codigo);
  }

  @Post('sintegra/generate')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async generateSintegra(
    @Body() payload: any,
    @Tenant() companyId: string
  ) {
    return this.service.generateSintegra(companyId, payload);
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
