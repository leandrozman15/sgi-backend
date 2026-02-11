import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class InventoryService {
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

  async listMovements(req: { companyId: string }, limit = 200) {
    const rows = await this.prisma.inventoryMovement.findMany({
      where: { companyId: req.companyId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => this.toPublic(r));
  }

  async createMovement(req: { companyId: string }, dto: any) {
    const row = await this.prisma.inventoryMovement.create({
      data: {
        companyId: req.companyId,
        data: dto,
      },
    });
    return this.toPublic(row);
  }
}
