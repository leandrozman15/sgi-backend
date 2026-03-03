import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  private getMasterUids(): string[] {
    const raw = process.env.SUPER_ADMIN_UIDS || process.env.MASTER_UIDS || process.env.MASTER_UID || 'HOR0BYhNFjSyJmrPKWySk8vdz6y2';
    return String(raw)
      .split(',')
      .map((uid) => uid.trim())
      .filter(Boolean);
  }

  canActivate(context: ExecutionContext): boolean {
    // ✅ VERIFICAR SI LA RUTA ES PÚBLICA
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const isMasterByUid = this.getMasterUids().includes(String(user?.uid || '').trim());

    if (isMasterByUid) {
      return true;
    }

    if (user && user.role === 'MASTER') {
      return true;
    }

    const userRole = user?.role || user?.claims?.role;

    if (!userRole) {
      throw new ForbiddenException('Acesso negado: O usuário não possui um role definido.');
    }

    const hasRole = requiredRoles.some(
      (requiredRole) => userRole.toUpperCase() === requiredRole.toUpperCase(),
    );

    if (!hasRole) {
      throw new ForbiddenException(`Acesso negado. Requer uma destas roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}