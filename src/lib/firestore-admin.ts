import * as admin from "firebase-admin";

/**
 * Retorna a instância do Firestore do Firebase Admin.
 * A inicialização é garantida pelo getAdminAuth no ciclo de vida da app.
 */
export function getAdminDb() {
  return admin.firestore();
}
