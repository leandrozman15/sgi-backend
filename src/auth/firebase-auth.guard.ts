import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getAuth } from 'firebase-admin/auth';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticação ausente');
    }

    const token = authHeader.substring(7);

    try {
      const auth = getAuth();
      const decodedToken = await auth.verifyIdToken(token);
      
      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
