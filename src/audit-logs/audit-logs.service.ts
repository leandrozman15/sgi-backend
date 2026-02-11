import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async list(req: { companyId: string }, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { companyId: req.companyId },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
  }

  async create(req: { companyId: string }, dto: any) {
    const { user, module, action, ...rest } = dto;
    return this.prisma.auditLog.create({
      data: {
        companyId: req.companyId,
        user: user || "system",
        module: module || "system",
        action: action || "action",
        data: rest,
      },
    });
  }
}
