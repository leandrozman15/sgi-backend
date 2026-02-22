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

    if (user && user.role === 'MASTER') {
      return true;
    }

    const userRole = user?.role;

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