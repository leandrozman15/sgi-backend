import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { getAdminAuth } from "../../lib/firebase-admin";

/**
 * @fileOverview Guard básico de autenticação Firebase.
 * Verifica a validade do ID Token (Bearer) e injeta o objeto 'user' no Request.
 * Não realiza validações de tenant (delegado ao TenantMembershipGuard).
 */
@Injectable()
export class FirebaseTenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();

    const authHeader = req.headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token de autenticação ausente.");
    }
    const token = authHeader.slice("Bearer ".length).trim();

    try {
      const decoded = await getAdminAuth().verifyIdToken(token);
      
      // Injeta dados básicos do usuário. Roles e CompanyId serão resolvidos pelo próximo guard.
      req.user = {
        uid: decoded.uid,
        email: decoded.email ?? undefined,
      };
      
      return true;
    } catch (e: any) {
      console.error("FirebaseTenantGuard: Falha na verificação do token:", e.message);
      throw new UnauthorizedException("Token inválido ou expirado.");
    }
  }
}
