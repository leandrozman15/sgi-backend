import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant;

    if (!tenant || !tenant.roles || !Array.isArray(tenant.roles)) {
      // Modificado para también verificar que roles sea un array
      throw new ForbiddenException('Informações de tenant ou roles não encontradas no token');
    }

    // ===== INICIO DE LA CORRECCIÓN =====
    // Convertimos los roles del usuario a mayúsculas para una comparación insensible.
    const userRoles = tenant.roles.map(role => String(role).toUpperCase());

    // Comparamos si alguno de los roles requeridos (también en mayúsculas) está en la lista de roles del usuario.
    const hasRole = requiredRoles.some(requiredRole => userRoles.includes(requiredRole.toUpperCase()));
    // ===== FIN DE LA CORRECCIÓN =====
    
    if (!hasRole) {
      // Mensaje de error mejorado para depuración
      throw new ForbiddenException(`Acesso negado. Requer uma destas roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}