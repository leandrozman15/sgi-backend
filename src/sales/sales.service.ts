import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SalesService {
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
    const rows = await this.prisma.sale.findMany({
      where: { companyId: req.companyId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => this.toPublic(r));
  }

  async getById(req: { companyId: string }, id: string) {
    const row = await this.prisma.sale.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });
    if (!row) throw new NotFoundException("Venda não encontrada.");
    return this.toPublic(row);
  }

  async create(req: { companyId: string }, dto: any) {
    const { numeroDocumento, ...rest } = dto;
    const dataJson = {
      ...rest,
      ...(numeroDocumento !== undefined ? { numeroDocumento: numeroDocumento.toString() } : {}),
    };
    
    const row = await this.prisma.sale.create({
      data: {
        companyId: req.companyId,
        data: dataJson,
      },
    });
    return this.toPublic(row);
  }

  async update(req: { companyId: string }, id: string, dto: any) {
    const exists = await this.prisma.sale.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException("Venda não encontrada.");

    const { numeroDocumento, ...rest } = dto;
    const existingData = (exists.data as any) || {};
    const dataJson = { 
      ...existingData, 
      ...rest,
      ...(numeroDocumento !== undefined ? { numeroDocumento: numeroDocumento.toString() } : {}),
    };

    const row = await this.prisma.sale.update({
      where: { id },
      data: {
        data: dataJson,
      },
    });
    return this.toPublic(row);
  }

  async remove(req: { companyId: string }, id: string) {
    const result = await this.prisma.sale.updateMany({
      where: { id, companyId: req.companyId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException("Venda não encontrada.");
    return { ok: true };
  }

  async getTaxSummary(req: { companyId: string }, startDate: Date, endDate: Date) {
    const sales = await this.prisma.sale.findMany({
      where: {
        companyId: req.companyId,
        createdAt: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
    });

    const taxes = {
      icms: 0,
      ipi: 0,
      pis: 0,
      cofins: 0,
      totalBase: 0,
      totalExento: 0,
      totalOutros: 0,
    };

    sales.forEach((s: any) => {
      const d = s.data || {};
      taxes.totalBase += parseFloat(d.valorTotal || 0);
      taxes.icms += parseFloat(d.valorICMS || 0);
      taxes.ipi += parseFloat(d.valorIPI || 0);
      taxes.pis += parseFloat(d.valorPIS || 0);
      taxes.cofins += parseFloat(d.valorCOFINS || 0);
    });

    return taxes;
  }

  async getSalesJournal(req: { companyId: string }, startDate: Date, endDate: Date) {
    const sales = await this.prisma.sale.findMany({
      where: {
        companyId: req.companyId,
        createdAt: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
    });

    return sales.map(s => this.toPublic(s));
  }
}
