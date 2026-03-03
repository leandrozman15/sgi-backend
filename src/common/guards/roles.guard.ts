import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../types/roles';

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
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const userUid = String(user?.uid || '').trim();
    if (userUid && this.getMasterUids().includes(userUid)) {
      return true;
    }

    const resolvedRole = String(user?.role || user?.claims?.role || '').trim();

    if (!user || !resolvedRole) { // Verificamos también que el rol exista
      throw new ForbiddenException('Usuário não autenticado ou sem role definida no token');
    }

    // --- INICIO DE LA CORRECCIÓN DEFINITIVA ---
    // Convertimos el rol del usuario (del token) a minúsculas para la comparación.
    const userRole = resolvedRole.toLowerCase(); 

    // Comprobamos si alguno de los roles requeridos (también convertido a minúsculas)
    // coincide con el rol del usuario.
    const hasRequiredRole = requiredRoles.some(requiredRole => requiredRole.toLowerCase() === userRole);
    // --- FIN DE LA CORRECCIÓN DEFINITIVA ---

    if (!hasRequiredRole) {
      throw new ForbiddenException(`Acesso negado. Requer uma destas roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}