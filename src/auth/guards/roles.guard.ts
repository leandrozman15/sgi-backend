import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si la ruta no requiere ningún rol específico, permitir el acceso.
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // El usuario lo adjunta el FirebaseAuthGuard

    // --- LÓGICA DEL ROL MASTER ---
    // Si el usuario es MASTER, tiene acceso a todo y se salta la verificación.
    if (user && user.role === 'MASTER') {
      return true;
    }
    // --- FIN DE LA LÓGICA DEL ROL MASTER ---

    // El rol del usuario viene como un string en el token (ej: 'ADMIN').
    const userRole = user?.role;

    if (!userRole) {
      throw new ForbiddenException(
        'Acesso negado: O usuário não possui um role definido.',
      );
    }

    // Comparamos si el rol del usuario es uno de los requeridos (ignorando mayúsculas/minúsculas).
    const hasRole = requiredRoles.some(
      (requiredRole) => userRole.toUpperCase() === requiredRole.toUpperCase(),
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Acesso negado. Requer uma destas roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}