import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../types/roles';

@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post(':uid/role')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async setUserRole(
    @Param('uid') uid: string,
    @Body() body: { role: UserRole; companyId: string }
  ) {
    return this.usersService.setUserRole(uid, body.role, body.companyId);
  }

  @Get(':uid/role')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async getUserRole(@Param('uid') uid: string) {
    return this.usersService.getUserRole(uid);
  }

  @Get('company/:companyId')
  @Roles(UserRole.MASTER, UserRole.ADMIN, UserRole.GERENTE)
  async getUsersByCompany(@Param('companyId') companyId: string) {
    return this.usersService.getUsersByCompany(companyId);
  }

  @Get()
  @Roles(UserRole.MASTER)
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Post(':uid/permissions')
  @Roles(UserRole.MASTER, UserRole.ADMIN)
  async updatePermissions(
    @Param('uid') uid: string,
    @Body() body: { permissions: string[] }
  ) {
    await this.usersService.updateUserPermissions(uid, body.permissions);
    return { message: 'Permissões atualizadas com sucesso' };
  }
}
