import { Controller, Get, Post, Body, Param, Put, Delete, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '../../auth/decorators/user.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @Get('session-init')
  async getSessionInit(@User() user: any) {
    if (!user?.uid) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    let claims: any = null;
    let userCompanies: any[] = [];

    try {
      [claims, userCompanies] = await Promise.all([
        this.usersService.getUserRole(user.uid),
        this.usersService.getUserCompanies(user.uid),
      ]);
    } catch (err: any) {
      // Degrade gracefully: use token claims only, so the frontend can still boot.
      console.error('[session-init] Failed to load Firebase/DB claims:', err?.message || err);
    }

    // Detectar si el usuario es MASTER (por UID o por custom claim)
    const masterUids = (process.env.SUPER_ADMIN_UIDS || process.env.MASTER_UIDS || process.env.MASTER_UID || 'HOR0BYhNFjSyJmrPKWySk8vdz6y2')
      .split(',').map(u => u.trim()).filter(Boolean);
    const isMaster = masterUids.includes(String(user.uid).trim()) ||
      String(claims?.role || user?.role || '').toUpperCase() === 'MASTER';

    // Para MASTER: si no tiene empresas via user_companies, cargar TODAS
    let companies = userCompanies;
    if (isMaster && companies.length === 0) {
      companies = await this.usersService.getAllCompaniesForMaster();
    }

    const activeCompanyId = claims?.companyId || user?.companyId || null;
    const selectedCompany = companies.find((company) => company.id === activeCompanyId);
    const selectedRoles = selectedCompany?.roles || (isMaster ? ['MASTER'] : []);

    return {
      user: {
        uid: user.uid,
        email: user.email || claims?.email || null,
        name: user.name || null,
        companyId: activeCompanyId,
        role: selectedCompany?.role || claims?.role || user?.role || (isMaster ? 'MASTER' : null),
        roles: selectedRoles,
      },
      companies,
      activeCompanyId,
      requiresCompanySelection: !activeCompanyId && companies.length > 0,
    };
  }

  @Get('me')
  async getMe(@User() user: any) {
    let claims: any = null;
    try {
      claims = await this.usersService.getUserRole(user.uid);
    } catch {
      // Firebase Admin lookup failed — fall back to token claims
    }
    return {
      uid: user.uid,
      email: user.email || claims?.email || '',
      role: claims?.role || user?.role || null,
      companyId: claims?.companyId || user?.companyId || null,
      permissions: claims?.permissions || user?.permissions || [],
      hasCompanyId: Boolean(claims?.companyId || user?.companyId),
    };
  }

  @Post('active-company')
  async setActiveCompany(
    @User() user: any,
    @Body('companyId') companyId: string,
  ) {
    if (!user?.uid) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    const nextCompanyId = String(companyId || '').trim();
    if (!nextCompanyId) {
      throw new BadRequestException('companyId é obrigatório');
    }

    return this.usersService.setActiveCompany(user.uid, nextCompanyId);
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