import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class EmployeesService {
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
    const rows = await this.prisma.employee.findMany({
      where: { companyId: req.companyId, deletedAt: null },
      orderBy: { name: "asc" },
      take: limit,
    });
    return rows.map((r) => this.toPublic(r));
  }

  async getById(req: { companyId: string }, id: string) {
    const row = await this.prisma.employee.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });
    if (!row) throw new NotFoundException("Funcionário não encontrado.");
    return this.toPublic(row);
  }

  async create(req: { companyId: string }, dto: any) {
    const { name, email, role, accessLevel, hasAccess, ...rest } = dto;
    const row = await this.prisma.employee.create({
      data: {
        companyId: req.companyId,
        name: name || "Sem Nome",
        email: email || "",
        role: role || "Operador",
        accessLevel: accessLevel || "operador",
        hasAccess: hasAccess ?? false,
        data: rest,
      },
    });
    return this.toPublic(row);
  }

  async update(req: { companyId: string }, id: string, dto: any) {
    const exists = await this.prisma.employee.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException("Funcionário não encontrado.");

    const { name, email, role, accessLevel, hasAccess, ...rest } = dto;
    const existingData = (exists.data as any) || {};
    const finalData = { ...existingData, ...rest };

    const row = await this.prisma.employee.update({
      where: { id },
      data: {
        name: name ?? undefined,
        email: email ?? undefined,
        role: role ?? undefined,
        accessLevel: accessLevel ?? undefined,
        hasAccess: hasAccess ?? undefined,
        data: finalData,
      },
    });
    return this.toPublic(row);
  }

  async remove(req: { companyId: string }, id: string) {
    const result = await this.prisma.employee.updateMany({
      where: { id, companyId: req.companyId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException("Funcionário não encontrado.");
    return { ok: true };
  }
}
