import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

function ensureFirebaseAdmin() {
  if (admin.apps.length > 0) return;

  const secretPath = '/etc/secrets/firebase-admin.json';

  // 1) Prefer Render Secret File
  if (fs.existsSync(secretPath)) {
    const raw = fs.readFileSync(secretPath, 'utf8');
    const serviceAccount = JSON.parse(raw);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    // Log mínimo (podés comentar luego)
    console.log('✅ Firebase Admin init via secret file:', serviceAccount.project_id);
    return;
  }

  // 2) Fallback: env vars
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Firebase Admin credentials missing (no secret file, env incomplete)');
    console.error('FIREBASE_PROJECT_ID:', projectId ? '✅' : '❌');
    console.error('FIREBASE_CLIENT_EMAIL:', clientEmail ? '✅' : '❌');
    console.error('FIREBASE_PRIVATE_KEY:', privateKey ? '✅' : '❌');
    // No tiramos error acá para no crashear todo, pero el verify fallará.
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
  });

  console.log('✅ Firebase Admin init via env:', projectId);
}

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
      ensureFirebaseAdmin();

      // IMPORTANT: use admin.auth() bound to initialized app
      const decodedToken = await admin.auth().verifyIdToken(token, true);

      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        // opcional: claims si querés
        role: (decodedToken as any).role,
      };

      return true;
    } catch (error: any) {
      // Log útil para debug (dejar durante el fix)
      console.error('❌ verifyIdToken failed:', error?.message);
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}