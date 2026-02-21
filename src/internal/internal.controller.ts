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

  // --- INICIO DEL CÓDIGO AÑADIDO ---
  // Este es el nuevo método para corregir el rol de un usuario en Firebase.
  @Post('fix-user-role')
  async fixUserRole(@Body() body: { uid: string; role: string }) {
    // Llama al servicio que realmente hace el trabajo.
    this.internalService.fixUserRole(body.uid, body.role);
    // Devuelve un mensaje inmediato para confirmar que la solicitud fue recibida.
    return { message: `Tentativa de definir role '${body.role}' para o usuário ${body.uid} enviada.` };
  }
  // --- FIN DEL CÓDIGO AÑADIDO ---
}