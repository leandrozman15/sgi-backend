import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
  Logger,
  HttpException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { UserRole, UserClaims } from '../../types/roles';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private auth: admin.auth.Auth;

  constructor(private readonly prisma: PrismaService) {
    if (admin.apps.length === 0) {
      try {
        console.log('🔧 Inicializando UsersService...');
        
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        if (privateKey) {
          privateKey = privateKey.trim();
          privateKey = privateKey.replace(/\\\\n/g, '\n');
          privateKey = privateKey.replace(/^\"|\"$/g, '');
        }
        
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
          }),
        });
        
        console.log('✅ Firebase Admin inicializado');
      } catch (error) {
        console.error('❌ Error al inicializar Firebase:', error);
        throw error;
      }
    }
    this.auth = admin.auth();
  }

  async setUserRole(uid: string, role: UserRole, companyId: string): Promise<UserClaims> {
    try {
      const permissions = this.getPermissionsForRole(role);
      await this.auth.setCustomUserClaims(uid, { role, companyId, permissions });
      const user = await this.auth.getUser(uid);
      return { uid, email: user.email || '', role, companyId, permissions };
    } catch (error) {
      throw new Error(`Erro ao definir role: ${error.message}`);
    }
  }

  async getUserRole(uid: string): Promise<UserClaims | null> {
    try {
      const user = await this.auth.getUser(uid);
      if (!user.customClaims) return null;
      return {
        uid,
        email: user.email || '',
        role: user.customClaims.role as UserRole,
        companyId: user.customClaims.companyId as string || '',
        permissions: user.customClaims.permissions as string[] || []
      };
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') {
        return null;
      }
      // Do not re-throw raw Firebase/network errors — they would become 500.
      // Return null so callers can fall back to token claims.
      console.error(`getUserRole failed for uid=${uid}:`, error?.code || error?.message || error);
      return null;
    }
  }

  async getUsersByCompany(companyId: string): Promise<UserClaims[]> {
    try {
      const listUsersResult = await this.auth.listUsers();
      return listUsersResult.users
        .filter(user => user.customClaims?.companyId === companyId)
        .map(user => ({
          uid: user.uid,
          email: user.email || '',
          role: user.customClaims?.role as UserRole,
          companyId: user.customClaims?.companyId as string,
          permissions: user.customClaims?.permissions as string[] || []
        }));
    } catch (error) {
      throw new Error(`Erro ao listar usuários: ${error.message}`);
    }
  }

  async getAllUsers(): Promise<UserClaims[]> {
    try {
      const listUsersResult = await this.auth.listUsers();
      return listUsersResult.users.map(user => ({
        uid: user.uid,
        email: user.email || '',
        role: user.customClaims?.role as UserRole || UserRole.CONSULTOR,
        companyId: user.customClaims?.companyId as string || '',
        permissions: user.customClaims?.permissions as string[] || []
      }));
    } catch (error) {
      throw new Error(`Erro ao listar todos os usuários: ${error.message}`);
    }
  }

  async setActiveCompany(uid: string, companyId: string): Promise<{ uid: string; companyId: string; updated: true }> {
    const normalizedUid = String(uid || '').trim();
    const normalizedCompanyId = String(companyId || '').trim();

    if (!normalizedUid) {
      throw new BadRequestException('uid é obrigatório');
    }

    if (!normalizedCompanyId) {
      throw new BadRequestException('companyId é obrigatório');
    }

    try {
      const targetCompany = await this.prisma.companies.findUnique({
        where: { id: normalizedCompanyId },
        select: { id: true, active: true },
      });

      if (!targetCompany) {
        throw new NotFoundException('Empresa não encontrada');
      }

      if (targetCompany.active === false) {
        throw new ForbiddenException('Empresa inativa não pode ser selecionada');
      }

      const user = await this.auth.getUser(normalizedUid);
      const currentClaims = (user.customClaims || {}) as Record<string, any>;

      const role = String(currentClaims?.role || '').trim().toUpperCase();
      const isMasterByRole = role === 'MASTER' || role === 'SUPER_ADMIN' || role === 'SUPERADMIN';
      const isMasterByUid = this.getMasterUids().includes(normalizedUid);
      const isMaster = isMasterByRole || isMasterByUid;

      if (!isMaster) {
        const membership = await this.prisma.user_companies.findFirst({
          where: {
            user_id: normalizedUid,
            company_id: normalizedCompanyId,
          },
          select: { id: true },
        });

        if (!membership) {
          throw new ForbiddenException('Usuário não pertence à empresa informada');
        }
      }

      await this.auth.setCustomUserClaims(normalizedUid, {
        ...currentClaims,
        companyId: normalizedCompanyId,
      });

      return { uid: normalizedUid, companyId: normalizedCompanyId, updated: true };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      const code = String(error?.code || '').trim();
      const message = String(error?.message || 'unknown error');
      this.logger.error(
        `setActiveCompany failed uid=${normalizedUid} companyId=${normalizedCompanyId} code=${code} message=${message}`,
        error?.stack,
      );

      if (code.startsWith('auth/')) {
        throw new ServiceUnavailableException('Falha ao atualizar sessão no Firebase. Tente novamente em instantes.');
      }

      throw new InternalServerErrorException('Não foi possível definir a empresa ativa no momento.');
    }
  }

  private getMasterUids(): string[] {
    const raw =
      process.env.SUPER_ADMIN_UIDS ||
      process.env.MASTER_UIDS ||
      process.env.MASTER_UID ||
      'HOR0BYhNFjSyJmrPKWySk8vdz6y2';

    return String(raw)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  async getUserCompanies(uid: string): Promise<Array<{
    id: string;
    name: string;
    role: string;
    roles: string[];
  }>> {
    try {
      let memberships = await this.prisma.user_companies.findMany({
        where: {
          user_id: uid,
        },
        include: {
          companies: true,
        },
        orderBy: {
          companies: {
            name: 'asc',
          },
        },
      });

      // Self-heal path for legacy/orphan users: if membership is missing but users.company_id
      // exists, rebuild user_companies so the user can access their company again.
      if (memberships.length === 0) {
        const dbUser = await this.prisma.users.findUnique({
          where: { id: uid },
          select: {
            company_id: true,
            role: true,
          },
        });

        const fallbackCompanyId = String(dbUser?.company_id || '').trim();
        if (fallbackCompanyId) {
          const fallbackRole = String(dbUser?.role || 'CONSULTOR').trim() || 'CONSULTOR';

          await this.prisma.user_companies.upsert({
            where: {
              user_id_company_id: {
                user_id: uid,
                company_id: fallbackCompanyId,
              },
            },
            update: {
              role: fallbackRole,
            },
            create: {
              user_id: uid,
              company_id: fallbackCompanyId,
              role: fallbackRole,
            },
          });

          memberships = await this.prisma.user_companies.findMany({
            where: {
              user_id: uid,
            },
            include: {
              companies: true,
            },
            orderBy: {
              companies: {
                name: 'asc',
              },
            },
          });
        }
      }

      return memberships.map((membership) => {
        const role = typeof membership.role === 'string' && membership.role.length > 0
          ? membership.role
          : 'CONSULTOR';

        return {
          id: membership.companies.id,
          name: membership.companies.name,
          role,
          roles: [role],
        };
      });
    } catch (error: any) {
      // Return empty list on DB/network error rather than throwing a raw Error
      // which NestJS would turn into a 500.
      console.error(`getUserCompanies failed for uid=${uid}:`, error?.message || error);
      return [];
    }
  }

  async updateUserPermissions(uid: string, permissions: string[]): Promise<void> {
    try {
      const user = await this.auth.getUser(uid);
      const currentClaims = user.customClaims || {};
      await this.auth.setCustomUserClaims(uid, { ...currentClaims, permissions });
    } catch (error) {
      throw new Error(`Erro ao atualizar permissões: ${error.message}`);
    }
  }

  /**
   * Retorna TODAS las empresas del sistema (para usuarios MASTER).
   * Se usa cuando el MASTER no tiene registros en user_companies.
   */
  async getAllCompaniesForMaster(): Promise<Array<{
    id: string;
    name: string;
    role: string;
    roles: string[];
  }>> {
    try {
      const allCompanies = await this.prisma.companies.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      });

      return allCompanies.map((company) => ({
        id: company.id,
        name: company.name,
        role: 'MASTER',
        roles: ['MASTER'],
      }));
    } catch (error) {
      console.error('Erro ao buscar todas as empresas para MASTER:', error);
      return [];
    }
  }

  async findById(id: string, companyId?: string): Promise<UserClaims | null> {
    try {
      const user = await this.auth.getUser(id);
      if (companyId && user.customClaims?.companyId !== companyId) {
        throw new NotFoundException('Usuário não encontrado nesta empresa');
      }
      return {
        uid: user.uid,
        email: user.email || '',
        role: user.customClaims?.role as UserRole || UserRole.CONSULTOR,
        companyId: user.customClaims?.companyId as string || '',
        permissions: user.customClaims?.permissions as string[] || []
      };
    } catch (error) {
      throw new NotFoundException('Usuário não encontrado');
    }
  }

  async findByCompany(companyId: string): Promise<UserClaims[]> {
    return this.getUsersByCompany(companyId);
  }

  async deleteItem(id: string): Promise<any> {
    try {
      await this.auth.deleteUser(id);
      return { message: 'Usuário deletado com sucesso' };
    } catch (error) {
      throw new Error(`Erro ao deletar usuário: ${error.message}`);
    }
  }

  private getPermissionsForRole(role: UserRole): string[] {
    const permissionsMap: Record<UserRole, string[]> = {
      [UserRole.MASTER]: ['*:*'],
      [UserRole.ADMIN]: ['companies:read', 'companies:write', 'companies:delete', 'users:manage', 'users:read', 'users:write'],
      [UserRole.GERENTE]: ['production:read', 'production:write', 'reports:read'],
      [UserRole.SUPERVISOR]: ['production:read', 'production:write', 'quality:read'],
      [UserRole.OPERADOR]: ['production:read', 'production:write', 'tasks:read'],
      [UserRole.CONSULTOR]: ['reports:read', 'production:read', 'dashboards:read']
    };
    return permissionsMap[role] || [];
  }
}
