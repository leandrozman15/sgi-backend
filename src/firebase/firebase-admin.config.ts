import * as admin from 'firebase-admin';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class FirebaseAdminConfig implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminConfig.name);

  onModuleInit() {
    if (admin.apps.length > 0) {
      this.logger.log('ℹ️ Firebase Admin já está inicializado');
      return;
    }

    try {
      // Render Secret Files mount here:
      const secretPath = '/etc/secrets/firebase-admin.json';

      if (fs.existsSync(secretPath)) {
        const raw = fs.readFileSync(secretPath, 'utf8');
        const serviceAccount = JSON.parse(raw);

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id,
        });

        this.logger.log('✅ Firebase Admin inicializado via /etc/secrets/firebase-admin.json');
        this.logger.log(`📌 Projeto: ${serviceAccount.project_id}`);
        return;
      }

      // Fallback to env vars (works too, but easier to break with formatting)
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.error('❌ Firebase Admin credentials missing (secret file not found and env vars incomplete)');
        this.logger.error(`Project ID: ${projectId ? '✅' : '❌'}`);
        this.logger.error(`Client Email: ${clientEmail ? '✅' : '❌'}`);
        this.logger.error(`Private Key: ${privateKey ? '✅' : '❌'}`);
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

      this.logger.log('✅ Firebase Admin inicializado via ENV');
      this.logger.log(`📌 Projeto: ${projectId}`);
    } catch (error) {
      this.logger.error('❌ Erro ao inicializar Firebase Admin:', error as any);
    }
  }

  getAuth() {
    // Safety: if someone calls getAuth before onModuleInit, ensure initialization
    if (admin.apps.length === 0) this.onModuleInit();
    return admin.auth();
  }
}