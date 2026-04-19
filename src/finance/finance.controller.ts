import { Controller, Get, Post, Body, Param, Put, Delete, Patch, Query, UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../types/roles';
import { Tenant } from '../common/decorators/tenant.decorator';

@Controller('finance')
@UseGuards(AuthGuard, RolesGuard)
export class TaxServicePaymentController {
  constructor(private readonly service: FinanceService) {}

  @Get('bank-transactions')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findBankTransactions(@Tenant() companyId: string, @Query('limit') limit?: string) {
    return this.service.findByResource('bank-transactions', companyId, Number(limit || 200));
  }

  @Get('bank-transactions/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findBankTransactionById(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.findOneByResource('bank-transactions', id, companyId);
  }

  @Post('bank-transactions')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async createBankTransaction(@Body() payload: any, @Tenant() companyId: string) {
    return this.service.createByResource('bank-transactions', payload, companyId);
  }

  @Patch('bank-transactions/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async patchBankTransaction(@Param('id') id: string, @Body() payload: any, @Tenant() companyId: string) {
    return this.service.updateByResource('bank-transactions', id, payload, companyId);
  }

  @Put('bank-transactions/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async putBankTransaction(@Param('id') id: string, @Body() payload: any, @Tenant() companyId: string) {
    return this.service.updateByResource('bank-transactions', id, payload, companyId);
  }

  @Delete('bank-transactions/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async removeBankTransaction(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteByResource('bank-transactions', id, companyId);
  }

  @Get('tax-payments')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findTaxPayments(@Tenant() companyId: string, @Query('limit') limit?: string) {
    return this.service.findByResource('tax-payments', companyId, Number(limit || 200));
  }

  @Get('tax-payments/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findTaxPaymentById(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.findOneByResource('tax-payments', id, companyId);
  }

  @Post('tax-payments')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async createTaxPayment(@Body() payload: any, @Tenant() companyId: string) {
    return this.service.createByResource('tax-payments', payload, companyId);
  }

  @Patch('tax-payments/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async patchTaxPayment(@Param('id') id: string, @Body() payload: any, @Tenant() companyId: string) {
    return this.service.updateByResource('tax-payments', id, payload, companyId);
  }

  @Put('tax-payments/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async putTaxPayment(@Param('id') id: string, @Body() payload: any, @Tenant() companyId: string) {
    return this.service.updateByResource('tax-payments', id, payload, companyId);
  }

  @Delete('tax-payments/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async removeTaxPayment(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteByResource('tax-payments', id, companyId);
  }

  @Get('salary-payments')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findSalaryPayments(@Tenant() companyId: string, @Query('limit') limit?: string) {
    return this.service.findByResource('salary-payments', companyId, Number(limit || 200));
  }

  @Get('salary-payments/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findSalaryPaymentById(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.findOneByResource('salary-payments', id, companyId);
  }

  @Post('salary-payments')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async createSalaryPayment(@Body() payload: any, @Tenant() companyId: string) {
    return this.service.createByResource('salary-payments', payload, companyId);
  }

  @Patch('salary-payments/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async patchSalaryPayment(@Param('id') id: string, @Body() payload: any, @Tenant() companyId: string) {
    return this.service.updateByResource('salary-payments', id, payload, companyId);
  }

  @Put('salary-payments/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async putSalaryPayment(@Param('id') id: string, @Body() payload: any, @Tenant() companyId: string) {
    return this.service.updateByResource('salary-payments', id, payload, companyId);
  }

  @Delete('salary-payments/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async removeSalaryPayment(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteByResource('salary-payments', id, companyId);
  }

  // ── Fixed Expenses (gastos fijos recurrentes) ──

  @Get('fixed-expenses')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findFixedExpenses(@Tenant() companyId: string, @Query('limit') limit?: string) {
    return this.service.findByResource('fixed-expenses', companyId, Number(limit || 200));
  }

  @Get('fixed-expenses/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findFixedExpenseById(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.findOneByResource('fixed-expenses', id, companyId);
  }

  @Post('fixed-expenses')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async createFixedExpense(@Body() payload: any, @Tenant() companyId: string) {
    return this.service.createByResource('fixed-expenses', payload, companyId);
  }

  @Patch('fixed-expenses/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async patchFixedExpense(@Param('id') id: string, @Body() payload: any, @Tenant() companyId: string) {
    return this.service.updateByResource('fixed-expenses', id, payload, companyId);
  }

  @Put('fixed-expenses/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async putFixedExpense(@Param('id') id: string, @Body() payload: any, @Tenant() companyId: string) {
    return this.service.updateByResource('fixed-expenses', id, payload, companyId);
  }

  @Delete('fixed-expenses/:id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async removeFixedExpense(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteByResource('fixed-expenses', id, companyId);
  }

  @Get()
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findAll(@Tenant() companyId: string) {
    return this.service.findByResource('tax-payments', companyId, 200);
  }

  @Get(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findOne(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.findOneByResource('tax-payments', id, companyId);
  }

  @Post()
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async create(@Body() createDto: any, @Tenant() companyId: string) {
    return this.service.createByResource('tax-payments', createDto, companyId);
  }

  @Put(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateDto: any,
    @Tenant() companyId: string
  ) {
    return this.service.updateByResource('tax-payments', id, updateDto, companyId);
  }

  @Delete(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async remove(@Param('id') id: string, @Tenant() companyId: string) {
    return this.service.deleteByResource('tax-payments', id, companyId);
  }
}
