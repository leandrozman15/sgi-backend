import { Controller, Post, Body, Get } from '@nestjs/common';
import { InternalService } from './internal.service';
import { BootstrapCompanyDto } from './dto/bootstrap-company.dto';
import { Public } from '../auth/decorators/public.decorator'; // ✅ Cambiar a Public

@Controller('internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Post('bootstrap-company')
  @Public() // ✅ Usar Public
  async bootstrapCompany(@Body() dto: BootstrapCompanyDto) {
    return this.internalService.bootstrapCompany(dto);
  }

  @Get('users')
  @Public() // ✅ Usar Public
  async getUsers() {
    return this.internalService.getUsers();
  }

  @Get('companies')
  @Public() // ✅ Usar Public
  async getCompanies() {
    return this.internalService.getCompanies();
  }

  @Post('fix-user-role')
  @Public() // ✅ Usar Public
  async fixUserRole(@Body() body: { uid: string; role: string }) {
    await this.internalService.fixUserRole(body.uid, body.role);
    return { message: `Role '${body.role}' definido com sucesso para ${body.uid}` };
  }
}