import { Injectable } from "@nestjs/common";
import { getAdminDb } from "../lib/firestore-admin";

@Injectable()
export class VendasService {
  async listar(companyId: string, limit = 50) {
    const db = getAdminDb();

    // Busca as vendas no Firestore isoladas pelo namespace da empresa
    const snap = await db
      .collection(`companies/${companyId}/vendas`)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}
