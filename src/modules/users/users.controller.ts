import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../types/roles';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post(':uid/role')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async setUserRole(
    @Param('uid') uid: string,
    @Body() body: { role: UserRole; companyId: string }
  ) {
    return this.usersService.setUserRole(uid, body.role, body.companyId);
  }

  @Get(':uid/role')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async getUserRole(@Param('uid') uid: string) {
    return this.usersService.getUserRole(uid);
  }

  @Get('company/:companyId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getUsersByCompany(@Param('companyId') companyId: string) {
    return this.usersService.getUsersByCompany(companyId);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.MASTER)
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Post(':uid/permissions')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async updatePermissions(
    @Param('uid') uid: string,
    @Body() body: { permissions: string[] }
  ) {
    await this.usersService.updateUserPermissions(uid, body.permissions);
    return { message: 'Permissões atualizadas com sucesso' };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getCurrentUser(@Request() req) {
    console.log('📍 GET /users/me - Headers:', req.headers);
    console.log('📍 GET /users/me - User:', req.user);
    
    try {
      // Verificar si req.user existe
      if (!req.user) {
        console.log('❌ req.user es undefined');
        return {
          uid: null,
          email: null,
          name: null,
          role: null,
          companyId: null,
          permissions: [],
          error: 'Usuario no autenticado'
        };
      }

      // Verificar si req.user.uid existe
      if (!req.user.uid) {
        console.log('❌ req.user.uid es undefined');
        return {
          uid: req.user.sub || req.user.user_id || null,
          email: req.user.email || null,
          name: req.user.name || null,
          role: null,
          companyId: null,
          permissions: [],
        };
      }

      // Intentar obtener datos del usuario desde el servicio
      let userData = null;
      try {
        userData = await this.usersService.getUserRole(req.user.uid);
      } catch (serviceError) {
        console.log('⚠️ Error en getUserRole:', serviceError.message);
      }
      
      const response = {
        uid: req.user.uid,
        email: req.user.email,
        name: req.user.name || null,
        role: userData?.role || null,
        companyId: userData?.companyId || null,
        permissions: userData?.permissions || [],
      };
      
      console.log('✅ Respuesta:', response);
      return response;
    } catch (error) {
      console.error('❌ Error crítico:', error);
      return {
        uid: req.user?.uid || null,
        email: req.user?.email || null,
        name: req.user?.name || null,
        role: null,
        companyId: null,
        permissions: [],
        error: error.message
      };
    }
  }
}
