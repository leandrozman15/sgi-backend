import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InternalService } from './internal.service';
import { BootstrapCompanyDto } from './dto/bootstrap-company.dto';
import { Public } from '../auth/decorators/public.decorator';
import { InternalApiGuard } from '../auth/guards/internal-api.guard';

@Controller('internal')
@Throttle({ default: { ttl: 60000, limit: 10 } }) // Stricter: 10 req/min for internal endpoints
@UseGuards(InternalApiGuard) // Requires x-internal-secret header
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Post('bootstrap-company')
  @Public()
  async bootstrapCompany(@Body() dto: BootstrapCompanyDto) {
    return this.internalService.bootstrapCompany(dto);
  }

  @Get('users')
  @Public()
  async getUsers() {
    return this.internalService.getUsers();
  }

  @Get('companies')
  @Public()
  async getCompanies() {
    return this.internalService.getCompanies();
  }

  @Post('fix-user-role')
  @Public()
  async fixUserRole(@Body() body: { uid: string; role: string }) {
    await this.internalService.fixUserRole(body.uid, body.role);
    return { message: `Role '${body.role}' definido com sucesso para ${body.uid}` };
  }
}