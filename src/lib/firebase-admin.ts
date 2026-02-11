import * as admin from "firebase-admin";
import type { Auth } from "firebase-admin/auth";
import * as fs from "fs";
import * as path from "path";

/**
 * Inicializa o Firebase Admin SDK de forma robusta.
 * Tenta carregar a chave de serviço do local padrão ou do ambiente.
 */
function initFirebaseAdmin() {
  if (admin.apps.length) return;

  // Tenta localizar o arquivo de chaves no diretório de chaves do projeto
  const serviceAccountPath = path.join(process.cwd(), "keys", "firebase-admin.json");
  const envPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("✅ Firebase Admin inicializado via keys/firebase-admin.json");
      return;
    } catch (error: any) {
      console.error("❌ Erro ao ler keys/firebase-admin.json:", error.message);
    }
  }

  if (envPath && fs.existsSync(envPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(envPath, "utf8"));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("✅ Firebase Admin inicializado via FIREBASE_SERVICE_ACCOUNT_PATH");
      return;
    } catch (error: any) {
      console.error("❌ Erro ao ler service account do ENV:", error.message);
    }
  }

  // Fallback para credenciais padrão do Google Cloud
  console.warn("⚠️ Firebase Admin inicializado com Google Application Default Credentials");
  admin.initializeApp();
}

/**
 * Retorna a instância de autenticação do Firebase Admin.
 */
export function getAdminAuth(): Auth {
  initFirebaseAdmin();
  return admin.auth();
}
