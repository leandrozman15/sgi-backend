import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { getAdminAuth } from '../lib/firebase-admin';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token não fornecido ou inválido");
    }

    const token = authHeader.slice("Bearer ".length).trim();

    try {
      // Utiliza o helper robusto para verificar o token
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || null,
      };
      return true;
    } catch (e: any) {
      // Log detalhado para diagnóstico no terminal do backend
      console.error("❌ verifyIdToken failed:", e?.code, e?.message);
      throw new UnauthorizedException("Token inválido ou expirado");
    }
  }
}
