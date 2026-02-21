import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'fs';

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_APP',
      useFactory: () => {
        console.log('📌 Inicializando Firebase Admin (singleton)...');

        if (admin.apps.length > 0) {
          console.log('✅ Firebase Admin ya estaba inicializado');
          return admin.app();
        }

        // 1) Prefer Render Secret File
        const secretPath = '/etc/secrets/firebase-admin.json';
        if (fs.existsSync(secretPath)) {
          const raw = fs.readFileSync(secretPath, 'utf8');
          const serviceAccount = JSON.parse(raw);

          const app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id,
          });

          console.log('✅ Firebase Admin inicializado via Secret File');
          console.log('📌 Project ID:', serviceAccount.project_id);
          console.log('📌 Client Email:', serviceAccount.client_email);

          return app;
        }

        // 2) Fallback ENV vars
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

        if (!projectId || !clientEmail || !privateKeyRaw) {
          console.error('❌ Variables de Firebase faltantes y no existe Secret File:');
          console.error('FIREBASE_PROJECT_ID:', projectId ? '✅' : '❌');
          console.error('FIREBASE_CLIENT_EMAIL:', clientEmail ? '✅' : '❌');
          console.error('FIREBASE_PRIVATE_KEY:', privateKeyRaw ? '✅' : '❌');
          throw new Error('Credenciales de Firebase incompletas');
        }

        const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

        const app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          projectId,
        });

        console.log('✅ Firebase Admin inicializado via ENV');
        console.log('📌 Project ID:', projectId);
        console.log('📌 Client Email:', clientEmail);

        return app;
      },
    },

    {
      provide: 'FIREBASE_AUTH',
      useFactory: (app: admin.app.App) => {
        // Ensure app exists; return auth bound to that app
        return app.auth();
      },
      inject: ['FIREBASE_APP'],
    },
  ],
  exports: ['FIREBASE_APP', 'FIREBASE_AUTH'],
})
export class FirebaseModule {}