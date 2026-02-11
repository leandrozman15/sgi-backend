import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PurchaseRequestsService {
  constructor(private prisma: PrismaService) {}

  private toPublic(row: any) {
    if (!row) return null;
    const { data, ...rest } = row;
    return {
      ...((data || {}) as Record<string, any>),
      ...rest,
      data: undefined,
    };
  }

  async list(req: { companyId: string }, limit = 200) {
    const rows = await this.prisma.purchaseRequest.findMany({
      where: { companyId: req.companyId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(r => this.toPublic(r));
  }

  async getById(req: { companyId: string }, id: string) {
    const row = await this.prisma.purchaseRequest.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });
    if (!row) throw new NotFoundException("Solicitação não encontrada.");
    return this.toPublic(row);
  }

  async create(req: { companyId: string }, dto: any) {
    const { numeroSolicitacao, solicitanteNome, status, ...rest } = dto;
    const row = await this.prisma.purchaseRequest.create({
      data: {
        companyId: req.companyId,
        numeroSolicitacao: numeroSolicitacao || `SOL-${Date.now()}`,
        solicitanteNome: solicitanteNome || "Sistema",
        status: status || "Pendente",
        data: rest,
      },
    });
    return this.toPublic(row);
  }

  async update(req: { companyId: string }, id: string, dto: any) {
    const exists = await this.prisma.purchaseRequest.findFirst({ where: { id, companyId: req.companyId } });
    if (!exists) throw new NotFoundException("Solicitação não encontrada.");

    const { status, ...rest } = dto;
    const existingData = (exists.data as any) || {};
    const finalData = { ...existingData, ...rest };

    const row = await this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: status ?? undefined,
        data: finalData,
      },
    });
    return this.toPublic(row);
  }

  async remove(req: { companyId: string }, id: string) {
    await this.prisma.purchaseRequest.updateMany({
      where: { id, companyId: req.companyId },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }
}
