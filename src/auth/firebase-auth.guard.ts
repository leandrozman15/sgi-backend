import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(private reflector: Reflector) {}

  private ensureFirebaseAdminInit() {
    if (admin.apps.length > 0) return;

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.error('❌ Firebase Admin env vars missing');
      this.logger.error(`FIREBASE_PROJECT_ID: ${projectId ? '✅' : '❌'}`);
      this.logger.error(`FIREBASE_CLIENT_EMAIL: ${clientEmail ? '✅' : '❌'}`);
      this.logger.error(`FIREBASE_PRIVATE_KEY: ${privateKey ? '✅' : '❌'}`);
      throw new Error('Firebase Admin credentials missing');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

    this.logger.log(`✅ Firebase Admin initialized (projectId=${projectId})`);
  }

  /**
   * Decodifica el payload del JWT SIN verificar firma.
   * Solo para diagnóstico (aud/iss/exp).
   */
  private decodeJwtPayload(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;

      const payload = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');

      const json = Buffer.from(payload, 'base64').toString('utf8');
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

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

    const token = authHeader.substring(7).trim();

    // Diagnóstico rápido (sin exponer token)
    const payload = this.decodeJwtPayload(token);
    if (payload) {
      this.logger.debug(`Backend FIREBASE_PROJECT_ID=${process.env.FIREBASE_PROJECT_ID}`);
      this.logger.debug(`JWT aud=${payload.aud}`);
      this.logger.debug(`JWT iss=${payload.iss}`);
      this.logger.debug(`JWT sub=${payload.sub}`);
      this.logger.debug(`JWT iat=${payload.iat} exp=${payload.exp}`);
    } else {
      this.logger.debug('No pude decodificar el payload del JWT');
    }

    try {
      // 1) Garantizar init antes de verifyIdToken
      this.ensureFirebaseAdminInit();

      // 2) Verificar con Firebase Admin
      const decoded = await admin.auth().verifyIdToken(token);

      request.user = {
        uid: decoded.uid,
        email: decoded.email,
        role: (decoded as any).role || null, // por si luego usás custom claims
        claims: decoded,
      };

      return true;
    } catch (err: any) {
      const msg = err?.message || String(err);
      const code = err?.code || err?.errorInfo?.code || '';

      // Logs útiles (Render logs)
      this.logger.warn(`verifyIdToken failed: ${code} ${msg}`);

      if (err?.errorInfo) {
        try {
          this.logger.warn(`verifyIdToken errorInfo: ${JSON.stringify(err.errorInfo)}`);
        } catch {}
      }

      // IMPORTANTÍSIMO: devolvemos la causa real para destrabar
      throw new UnauthorizedException(`Token inválido: ${code} ${msg}`);
    }
  }
}