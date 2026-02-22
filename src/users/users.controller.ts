import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { UserService } from './users.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/roles.enum'; // Ajusta según tu estructura
import { User } from '@prisma/client';

// Importaciones corregidas
import { IsPublic } from '../auth/decorators/is-public.decorator'; // Ruta común
import { AuthUser } from '../auth/decorators/auth-user.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly service: UserService) {}

  @Get('me')
  @IsPublic()
  async getMe(@AuthUser() user: User) {
    return user;
  }

  @Get()
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async findAll(@Body('companyId') companyId: string) {
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