import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();

    // ⚠️ Roles são por empresa. Se ainda não há companyId/tenant (ex: /companies),
    // não dá para avaliar roles aqui — deixamos passar.
    if (!req.tenant?.companyId) return true;

    const roles: string[] = req.tenant.roles ?? [];
    
    const hasRole = required.some((role) => roles.includes(role));
    
    if (!hasRole) {
      throw new ForbiddenException("Acesso negado: permissões insuficientes.");
    }

    return true;
  }
}
