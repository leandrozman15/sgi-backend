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

    // ✅ INICIALIZAR Firebase Admin si no está inicializado
    if (admin.apps.length === 0) {
      try {
        console.log('📌 Inicializando Firebase Admin en AuthGuard...');
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
        console.log('✅ Firebase Admin inicializado en AuthGuard');
      } catch (error) {
        console.error('❌ Error inicializando Firebase Admin:', error);
        throw new UnauthorizedException('Error en configuración de autenticación');
      }
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
      console.error('❌ Error validando token:', error.message);
      throw new UnauthorizedException('Token inválido ou expirado');
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