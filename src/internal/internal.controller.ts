import { Controller, Post, Body, Get } from '@nestjs/common';
import { InternalService } from './internal.service';
import { BootstrapCompanyDto } from './dto/bootstrap-company.dto';

@Controller('internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Post('bootstrap-company')
  async bootstrapCompany(@Body() dto: BootstrapCompanyDto) {
    return this.internalService.bootstrapCompany(dto);
  }

  @Get('users')
  async getUsers() {
    return this.internalService.getUsers();
  }

  @Get('companies')
  async getCompanies() {
    return this.internalService.getCompanies();
  }
}
