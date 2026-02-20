import { Injectable, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { UserRole, UserClaims } from '../../types/roles';

@Injectable()
export class UsersService {
  private auth: admin.auth.Auth;

  constructor() {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
    this.auth = admin.auth();
  }

  async setUserRole(uid: string, role: UserRole, companyId: string): Promise<UserClaims> {
    try {
      const permissions = this.getPermissionsForRole(role);
      
      await this.auth.setCustomUserClaims(uid, {
        role,
        companyId,
        permissions
      });

      const user = await this.auth.getUser(uid);
      
      return {
        uid,
        email: user.email || '',
        role,
        companyId,
        permissions
      };
    } catch (error) {
      throw new Error(`Erro ao definir role: ${error.message}`);
    }
  }

  async getUserRole(uid: string): Promise<UserClaims | null> {
    try {
      const user = await this.auth.getUser(uid);
      
      if (!user.customClaims) {
        return null;
      }

      return {
        uid,
        email: user.email || '',
        role: user.customClaims.role as UserRole,
        companyId: user.customClaims.companyId as string,
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

  async updateUserPermissions(uid: string, permissions: string[]): Promise<void> {
    try {
      const user = await this.auth.getUser(uid);
      const currentClaims = user.customClaims || {};
      
      await this.auth.setCustomUserClaims(uid, {
        ...currentClaims,
        permissions
      });
    } catch (error) {
      throw new Error(`Erro ao atualizar permissões: ${error.message}`);
    }
  }

  private getPermissionsForRole(role: UserRole): string[] {
    const permissionsMap: Record<UserRole, string[]> = {
      [UserRole.MASTER]: ['*:*'],
      [UserRole.ADMIN]: [
        'companies:read', 'companies:write', 'companies:delete',
        'users:manage', 'users:read', 'users:write',
        'production:read', 'production:write',
        'financial:read', 'financial:approve',
        'reports:read', 'reports:export',
        'settings:read', 'settings:write'
      ],
      [UserRole.GERENTE]: [
        'production:read', 'production:write',
        'reports:read',
        'rh:read',
        'financial:read',
        'quality:read',
        'purchases:approve'
      ],
      [UserRole.SUPERVISOR]: [
        'production:read', 'production:write',
        'quality:read', 'quality:write',
        'maintenance:read', 'maintenance:write',
        'team:read'
      ],
      [UserRole.OPERADOR]: [
        'production:read', 'production:write',
        'tasks:read', 'tasks:write',
        'epi:read', 'epi:write',
        'quality:read'
      ],
      [UserRole.CONSULTOR]: [
        'reports:read',
        'production:read',
        'dashboards:read'
      ]
    };

    return permissionsMap[role] || [];
  }
}
