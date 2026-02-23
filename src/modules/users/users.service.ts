import { Injectable, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaClient } from '@prisma/client';
import { UserRole, UserClaims } from '../../types/roles';

@Injectable()
export class UsersService {
  private auth: admin.auth.Auth;
  private prisma: PrismaClient;

  constructor() {
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
    this.prisma = new PrismaClient();
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
    } catch (error) {
      throw new NotFoundException('Usuário não encontrado');
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

  async getUserCompanies(uid: string): Promise<Array<{
    id: string;
    name: string;
    role: string;
    roles: string[];
  }>> {
    try {
      const memberships = await this.prisma.user_companies.findMany({
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
    } catch (error) {
      throw new Error(`Erro ao obter empresas do usuário: ${error.message}`);
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
