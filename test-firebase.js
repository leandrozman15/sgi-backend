const admin = require('firebase-admin');
require('dotenv').config();

console.log('📌 Variables de entorno:');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID || '❌ NO DEFINIDO');
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL || '❌ NO DEFINIDO');
console.log('FIREBASE_PRIVATE_KEY existe:', !!process.env.FIREBASE_PRIVATE_KEY);

if (process.env.FIREBASE_PRIVATE_KEY) {
  console.log('Longitud de private key:', process.env.FIREBASE_PRIVATE_KEY.length);
}

try {
  console.log('\n📌 Inicializando Firebase Admin...');
  
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  const credential = admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  });
  
  admin.initializeApp({ credential });
  console.log('✅ Firebase Admin inicializado correctamente');
  
  // Probar listar usuarios
  admin.auth().listUsers(1)
    .then(result => {
      console.log('✅ Conexión con Firebase exitosa');
      console.log('Total usuarios:', result.users.length);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Error al listar usuarios:', err.message);
      process.exit(1);
    });
} catch (err) {
  console.error('❌ Error al inicializar:', err.message);
  process.exit(1);
}
