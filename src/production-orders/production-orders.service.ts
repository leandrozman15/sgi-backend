import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProductionOrdersService {
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

  async list(req: { companyId: string }, limit = 200, archived = false) {
    const rows = await this.prisma.productionOrder.findMany({
      where: { 
        companyId: req.companyId, 
        deletedAt: null,
        data: {
          path: ['archived'],
          equals: archived
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => this.toPublic(r));
  }

  async getById(req: { companyId: string }, id: string) {
    const row = await this.prisma.productionOrder.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });
    if (!row) throw new NotFoundException("Ordem de produção não encontrada.");
    return this.toPublic(row);
  }

  async create(req: { companyId: string }, dto: any) {
    const { orderNumber, batchNumber, client, status, priority, startDate, completionDate, ...rest } = dto;
    
    const row = await this.prisma.productionOrder.create({
      data: {
        companyId: req.companyId,
        orderNumber,
        batchNumber,
        client,
        status: status || "Pendente",
        priority: priority || "Média",
        startDate: startDate ? new Date(startDate) : null,
        completionDate: completionDate ? new Date(completionDate) : null,
        data: rest,
      },
    });
    return this.toPublic(row);
  }

  async update(req: { companyId: string }, id: string, dto: any) {
    const exists = await this.prisma.productionOrder.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException("Ordem de produção não encontrada ou acesso negado.");

    const { orderNumber, batchNumber, client, status, priority, startDate, completionDate, ...rest } = dto;
    
    const existingData = (exists.data as any) || {};
    const finalData = {
      ...existingData,
      ...rest
    };

    const row = await this.prisma.productionOrder.update({
      where: { id },
      data: {
        orderNumber: orderNumber ?? undefined,
        batchNumber: batchNumber ?? undefined,
        client: client ?? undefined,
        status: status ?? undefined,
        priority: priority ?? undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        completionDate: completionDate ? new Date(completionDate) : undefined,
        data: finalData,
      },
    });
    return this.toPublic(row);
  }

  async remove(req: { companyId: string }, id: string) {
    const result = await this.prisma.productionOrder.updateMany({
      where: { id, companyId: req.companyId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    
    if (result.count === 0) throw new NotFoundException("Ordem de produção não encontrada.");
    return { ok: true };
  }
}
