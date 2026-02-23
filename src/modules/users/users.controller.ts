import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '../../auth/decorators/user.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @Get('session-init')
  async getSessionInit(@User() user: any) {
    const [claims, companies] = await Promise.all([
      this.usersService.getUserRole(user.uid),
      this.usersService.getUserCompanies(user.uid),
    ]);

    const activeCompanyId = claims?.companyId || user?.companyId || null;

    return {
      user: {
        uid: user.uid,
        email: user.email || claims?.email || '',
        role: claims?.role || user?.role || null,
        companyId: activeCompanyId,
        permissions: claims?.permissions || user?.permissions || [],
      },
      companies,
      activeCompanyId,
      requiresCompanySelection: !activeCompanyId && companies.length > 0,
    };
  }

  @Get('me')
  async getMe(@User() user: any) {
    const claims = await this.usersService.getUserRole(user.uid);
    return {
      uid: user.uid,
      email: user.email || claims?.email || '',
      role: claims?.role || user?.role || null,
      companyId: claims?.companyId || user?.companyId || null,
      permissions: claims?.permissions || user?.permissions || [],
      hasCompanyId: Boolean(claims?.companyId || user?.companyId),
    };
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
    return { message: 'Método no implementado' };
  }
}