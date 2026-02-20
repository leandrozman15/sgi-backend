import * as admin from 'firebase-admin';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';

@Injectable()
export class FirebaseAdminConfig implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminConfig.name);

  onModuleInit() {
    if (admin.apps.length === 0) {
      try {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!projectId || !clientEmail || !privateKey) {
          this.logger.error('❌ Firebase Admin credentials missing in .env');
          this.logger.error('Project ID:', projectId ? '✅' : '❌');
          this.logger.error('Client Email:', clientEmail ? '✅' : '❌');
          this.logger.error('Private Key:', privateKey ? '✅' : '❌');
          return;
        }

        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });

        this.logger.log('✅ Firebase Admin inicializado com sucesso');
        this.logger.log(`📌 Projeto: ${projectId}`);
      } catch (error) {
        this.logger.error('❌ Erro ao inicializar Firebase Admin:', error);
      }
    }
  }

  getAuth() {
    return admin.auth();
  }
}
