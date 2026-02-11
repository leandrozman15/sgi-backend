import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TaxPaymentsService {
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
    const rows = await this.prisma.taxServicePayment.findMany({
      where: { companyId: req.companyId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => this.toPublic(r));
  }

  async create(req: { companyId: string }, dto: any) {
    const row = await this.prisma.taxServicePayment.create({
      data: {
        companyId: req.companyId,
        data: dto,
      },
    });
    return this.toPublic(row);
  }

  async update(req: { companyId: string }, id: string, dto: any) {
    const exists = await this.prisma.taxServicePayment.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException("Lançamento não encontrado.");

    const existingData = (exists.data as any) || {};
    const finalData = { ...existingData, ...dto };

    const row = await this.prisma.taxServicePayment.update({
      where: { id },
      data: { data: finalData },
    });
    return this.toPublic(row);
  }

  async remove(req: { companyId: string }, id: string) {
    await this.prisma.taxServicePayment.updateMany({
      where: { id, companyId: req.companyId },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }
}