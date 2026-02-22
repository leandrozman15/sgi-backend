import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { UsersService } from './users.service';  // ✅ Importación correcta (con S)
import { User } from '@prisma/client';

@Controller('users')
export class UserController {
  constructor(private readonly usersService: UsersService) {}  // ✅ Nombre consistente

  @Get('me')
  async getMe(@Body('userId') userId: string) {
    return this.usersService.getUserRole(userId);
  }

  @Get()
  async findAll(@Body('companyId') companyId: string) {
    return this.usersService.getUsersByCompany(companyId);
  }

  @Get('all')
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.getUserRole(id);
  }

  @Post()
  async create(@Body() createDto: any) {
    // Implementar creación de usuario si es necesario
    return { message: 'Método no implementado' };
  }

  @Put('role/:id')
  async updateRole(
    @Param('id') id: string,
    @Body('role') role: string,
    @Body('companyId') companyId: string,
  ) {
    return this.usersService.setUserRole(id, role as any, companyId);
  }

  @Put('permissions/:id')
  async updatePermissions(
    @Param('id') id: string,
    @Body('permissions') permissions: string[],
  ) {
    await this.usersService.updateUserPermissions(id, permissions);
    return { message: 'Permissões atualizadas' };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    // Implementar deleção se necessário
    return { message: 'Método não implementado' };
  }
}