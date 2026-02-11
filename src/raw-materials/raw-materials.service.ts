import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RawMaterialsService {
  constructor(private prisma: PrismaService) {}

  private toPublic(row: any) {
    if (!row) return null;
    const { data, ...rest } = row;
    const jsonData = (data ?? {}) as Record<string, any>;
    return {
      ...jsonData,
      ...rest,
      data: undefined,
    };
  }

  async list(req: { companyId: string }, limit = 200) {
    const rows = await this.prisma.rawMaterial.findMany({
      where: { companyId: req.companyId, deletedAt: null },
      orderBy: { nome: "asc" },
      take: Math.min(limit, 500),
    });
    return rows.map(r => this.toPublic(r));
  }

  async getById(req: { companyId: string }, id: string) {
    const row = await this.prisma.rawMaterial.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });
    if (!row) throw new NotFoundException("Matéria-prima não encontrada.");
    return this.toPublic(row);
  }

  async create(req: { companyId: string }, dto: any) {
    const { nome, name, ...rest } = dto;
    const finalNome = nome || name || "Matéria-prima Sem Nome";
    
    const row = await this.prisma.rawMaterial.create({
      data: {
        companyId: req.companyId,
        nome: finalNome,
        data: rest,
      },
    });
    return this.toPublic(row);
  }

  async update(req: { companyId: string }, id: string, dto: any) {
    const exists = await this.prisma.rawMaterial.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException("Matéria-prima não encontrada.");

    const { nome, name, data, ...rest } = dto;
    const existingData = (exists.data as any) || {};
    const finalData = { ...existingData, ...(data || {}), ...rest };

    const row = await this.prisma.rawMaterial.update({
      where: { id },
      data: {
        nome: nome || name || undefined,
        data: finalData,
      },
    });
    return this.toPublic(row);
  }

  async remove(req: { companyId: string }, id: string) {
    const result = await this.prisma.rawMaterial.updateMany({
      where: { id, companyId: req.companyId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException("Matéria-prima não encontrada.");
    return { ok: true };
  }
}
