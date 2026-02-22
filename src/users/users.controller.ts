import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { UserService } from './users.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/models/roles.enum'; // Asegúrate que la ruta a UserRole sea correcta
import { User } from '@prisma/client'; // O el tipo de dato de tu usuario

// --- DECORADORES IMPORTANTES ---
import { IsPublic } from '../auth/guards/tenant-membership.guard';
import { AuthUser } from '../auth/decorators/auth-user.decorator';

// Los @UseGuards() a nivel de Controller se eliminan, ya que se aplican globalmente en app.module.ts
@Controller('users')
export class UserController {
  constructor(private readonly service: UserService) {}

  // ==================================================================
  // === RUTA FALTANTE (/me) AÑADIDA ===
  // ==================================================================
  @Get('me')
  @IsPublic() // ¡MUY IMPORTANTE! Esto desactiva el TenantMembershipGuard para esta ruta.
  async getMe(@AuthUser() user: User) {
    // El FirebaseAuthGuard ya ha validado al usuario y lo ha adjuntado a la petición.
    // Simplemente devolvemos la información del usuario que el frontend necesita.
    // En el futuro, puedes usar this.service para enriquecer este objeto
    // con más datos de la base de datos si es necesario.
    return user;
  }
  // ==================================================================

  @Get()
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findAll(@Body('companyId') companyId: string) { // Asumiendo que companyId viene en el body o header
    return this.service.findByCompany(companyId);
  }

  @Get(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findOne(@Param('id') id: string, @Body('companyId') companyId: string) {
    return this.service.findById(id, companyId);
  }

  @Post()
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async create(@Body() createDto: any, @Body('companyId') companyId: string) {
    return this.service.createItem(createDto, companyId);
  }

  @Put(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateDto: any,
    @Body('companyId') companyId: string,
  ) {
    return this.service.updateItem(id, updateDto, companyId);
  }

  @Delete(':id')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async remove(@Param('id') id: string, @Body('companyId') companyId: string) {
    return this.service.deleteItem(id, companyId);
  }
}