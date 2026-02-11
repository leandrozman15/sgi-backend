import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MachinesService {
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
    const rows = await this.prisma.machine.findMany({
      where: { companyId: req.companyId, deletedAt: null },
      orderBy: { name: "asc" },
      take: limit,
    });
    return rows.map((r) => this.toPublic(r));
  }

  async getById(req: { companyId: string }, id: string) {
    const row = await this.prisma.machine.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });
    if (!row) throw new NotFoundException("Máquina não encontrada.");
    return this.toPublic(row);
  }

  async create(req: { companyId: string }, dto: any) {
    const { name, nome, ...rest } = dto;
    const finalName = name || nome || "Máquina Sem Nome";

    const row = await this.prisma.machine.create({
      data: {
        companyId: req.companyId,
        name: finalName,
        data: rest,
      },
    });
    return this.toPublic(row);
  }

  async update(req: { companyId: string }, id: string, dto: any) {
    const exists = await this.prisma.machine.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException("Máquina não encontrada.");

    const { name, nome, ...rest } = dto;
    const finalName = name || nome;
    const existingData = (exists.data as any) || {};
    const finalData = { ...existingData, ...rest };

    const row = await this.prisma.machine.update({
      where: { id },
      data: {
        ...(finalName !== undefined ? { name: finalName } : {}),
        data: finalData,
      },
    });
    return this.toPublic(row);
  }

  async remove(req: { companyId: string }, id: string) {
    const result = await this.prisma.machine.updateMany({
      where: { id, companyId: req.companyId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException("Máquina não encontrada.");
    return { ok: true };
  }
}
