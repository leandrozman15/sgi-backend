import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject } from '@nestjs/common';
import { app } from 'firebase-admin';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject('FIREBASE_ADMIN') private firebaseApp: app.App) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token de autenticação ausente');
    }

    try {
      const decodedToken = await this.firebaseApp.auth().verifyIdToken(token);
      console.log('✅ Token válido para:', decodedToken.email);
      
      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: decodedToken.role || null,
        companyId: decodedToken.companyId || null,
      };
      return true;
    } catch (error) {
      console.error('❌ Error validando token:', error.message);
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
