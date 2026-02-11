import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SuppliersService {
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
    const rows = await this.prisma.supplier.findMany({
      where: { companyId: req.companyId, deletedAt: null },
      orderBy: { nome: "asc" },
      take: limit,
    });
    return rows.map((r) => this.toPublic(r));
  }

  async getById(req: { companyId: string }, id: string) {
    const row = await this.prisma.supplier.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });
    if (!row) throw new NotFoundException("Fornecedor não encontrado.");
    return this.toPublic(row);
  }

  async create(req: { companyId: string }, dto: any) {
    const { nome, ...rest } = dto;
    const row = await this.prisma.supplier.create({
      data: {
        companyId: req.companyId,
        nome: nome || "Fornecedor Sem Nome",
        data: rest,
      },
    });
    return this.toPublic(row);
  }

  async update(req: { companyId: string }, id: string, dto: any) {
    const exists = await this.prisma.supplier.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException("Fornecedor não encontrado.");

    const { nome, ...rest } = dto;
    const existingData = (exists.data as any) || {};
    const finalData = { ...existingData, ...rest };

    const row = await this.prisma.supplier.update({
      where: { id },
      data: {
        nome: nome ?? undefined,
        data: finalData,
      },
    });
    return this.toPublic(row);
  }

  async remove(req: { companyId: string }, id: string) {
    const result = await this.prisma.supplier.updateMany({
      where: { id, companyId: req.companyId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException("Fornecedor não encontrado.");
    return { ok: true };
  }
}
