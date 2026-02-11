import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SaleQuotesService {
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
    const rows = await this.prisma.saleQuote.findMany({
      where: { companyId: req.companyId, deletedAt: null },
      orderBy: { orcamentoNumero: "desc" },
      take: limit,
    });
    return rows.map((r) => this.toPublic(r));
  }

  async getById(req: { companyId: string }, id: string) {
    const row = await this.prisma.saleQuote.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });
    if (!row) throw new NotFoundException("Orçamento não encontrado.");
    return this.toPublic(row);
  }

  async create(req: { companyId: string }, dto: any) {
    const { orcamentoNumero, clienteNome, status, ...rest } = dto;
    const row = await this.prisma.saleQuote.create({
      data: {
        companyId: req.companyId,
        orcamentoNumero: orcamentoNumero || `ORC-${Date.now()}`,
        clienteNome: clienteNome || "Consumidor",
        status: status || "Pendente",
        data: rest,
      },
    });
    return this.toPublic(row);
  }

  async update(req: { companyId: string }, id: string, dto: any) {
    const exists = await this.prisma.saleQuote.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException("Orçamento não encontrado.");

    const { orcamentoNumero, clienteNome, status, ...rest } = dto;
    const existingData = (exists.data as any) || {};
    const finalData = { ...existingData, ...rest };

    const row = await this.prisma.saleQuote.update({
      where: { id },
      data: {
        orcamentoNumero: orcamentoNumero ?? undefined,
        clienteNome: clienteNome ?? undefined,
        status: status ?? undefined,
        data: finalData,
      },
    });
    return this.toPublic(row);
  }

  async remove(req: { companyId: string }, id: string) {
    const result = await this.prisma.saleQuote.updateMany({
      where: { id, companyId: req.companyId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException("Orçamento não encontrado.");
    return { ok: true };
  }
}