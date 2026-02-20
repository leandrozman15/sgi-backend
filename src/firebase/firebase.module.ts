import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: () => {
        console.log('📌 Inicializando Firebase Admin (una sola vez)...');
        
        // Verificar si ya está inicializado
        if (admin.apps.length > 0) {
          console.log('✅ Firebase Admin ya estaba inicializado');
          return admin.app();
        }

        try {
          // Verificar que las variables de entorno existen
          const projectId = process.env.FIREBASE_PROJECT_ID;
          const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
          const privateKey = process.env.FIREBASE_PRIVATE_KEY;

          if (!projectId || !clientEmail || !privateKey) {
            console.error('❌ Variables de Firebase faltantes:');
            console.error('FIREBASE_PROJECT_ID:', projectId ? '✅' : '❌');
            console.error('FIREBASE_CLIENT_EMAIL:', clientEmail ? '✅' : '❌');
            console.error('FIREBASE_PRIVATE_KEY:', privateKey ? '✅' : '❌');
            throw new Error('Credenciales de Firebase incompletas');
          }

          // Formatear la private key
          const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
          
          console.log('✅ Variables de Firebase OK');
          console.log('Project ID:', projectId);
          console.log('Client Email:', clientEmail);
          console.log('Private Key length:', formattedPrivateKey.length);

          // Inicializar Firebase Admin
          const credential = admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: formattedPrivateKey,
          });
          
          const app = admin.initializeApp({ credential });
          console.log('✅ Firebase Admin inicializado globalmente');
          
          // Probar la conexión
          admin.auth().listUsers(1)
            .then(() => console.log('✅ Conexión con Firebase verificada'))
            .catch(err => console.error('⚠️ Error verificando conexión:', err.message));
          
          return app;
        } catch (error) {
          console.error('❌ Error inicializando Firebase Admin:', error.message);
          throw error;
        }
      },
    },
  ],
  exports: ['FIREBASE_ADMIN'],
})
export class FirebaseModule {}
