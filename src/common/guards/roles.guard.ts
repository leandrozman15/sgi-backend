import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../types/roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

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

    if (!user || !user.role) { // Verificamos también que el rol exista
      throw new ForbiddenException('Usuário não autenticado ou sem role definida no token');
    }

    // --- INICIO DE LA CORRECCIÓN DEFINITIVA ---
    // Convertimos el rol del usuario (del token) a minúsculas para la comparación.
    const userRole = user.role.toLowerCase(); 

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