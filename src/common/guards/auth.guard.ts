import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token de autenticação ausente');
    }

    // Garantir que o Firebase Admin está inicializado
    if (admin.apps.length === 0) {
      throw new UnauthorizedException('Firebase Admin não inicializado. Verifique as credenciais.');
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log('✅ Token válido para:', decodedToken.email);
      
      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: decodedToken.role || null,
        companyId: decodedToken.companyId || null,
      };
      return true;
    } catch (error) {
      console.error('❌ Erro validando token:', error.message);
      throw new UnauthorizedException('Token inválido: ' + error.message);
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }
}