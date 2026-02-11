import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HrExtrasService {
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

  // --- Férias ---
  async listVacations(req: { companyId: string }, limit = 200) {
    const rows = await this.prisma.vacation.findMany({
      where: { companyId: req.companyId, deletedAt: null },
      orderBy: { startDate: "desc" },
      take: limit,
    });
    return rows.map(r => this.toPublic(r));
  }

  async createVacation(req: { companyId: string }, dto: any) {
    const { employeeId, employeeName, startDate, endDate, status, ...rest } = dto;
    const row = await this.prisma.vacation.create({
      data: {
        companyId: req.companyId,
        employeeId,
        employeeName,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status || "Agendada",
        data: rest,
      },
    });
    return this.toPublic(row);
  }

  async updateVacation(req: { companyId: string }, id: string, dto: any) {
    const exists = await this.prisma.vacation.findFirst({ where: { id, companyId: req.companyId } });
    if (!exists) throw new NotFoundException("Férias não encontradas.");
    
    const { startDate, endDate, ...rest } = dto;
    const existingData = (exists.data as any) || {};
    const finalData = { ...existingData, ...rest };

    const row = await this.prisma.vacation.update({
      where: { id },
      data: {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status: dto.status,
        data: finalData,
      },
    });
    return this.toPublic(row);
  }

  async removeVacation(req: { companyId: string }, id: string) {
    await this.prisma.vacation.updateMany({
      where: { id, companyId: req.companyId },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  // --- EPIs ---
  async listEpiDeliveries(req: { companyId: string }, limit = 200) {
    const rows = await this.prisma.epiDelivery.findMany({
      where: { companyId: req.companyId, deletedAt: null },
      orderBy: { deliveryDate: "desc" },
      take: limit,
    });
    return rows.map(r => this.toPublic(r));
  }

  async createEpiDelivery(req: { companyId: string }, dto: any) {
    const { employeeId, employeeName, deliveryDate, ...rest } = dto;
    const row = await this.prisma.epiDelivery.create({
      data: {
        companyId: req.companyId,
        employeeId,
        employeeName,
        deliveryDate: new Date(deliveryDate),
        data: rest,
      },
    });
    return this.toPublic(row);
  }

  // --- Faltas ---
  async listAttendance(req: { companyId: string }, limit = 500) {
    const rows = await this.prisma.attendanceRecord.findMany({
      where: { companyId: req.companyId, deletedAt: null },
      orderBy: { date: "desc" },
      take: limit,
    });
    return rows.map(r => this.toPublic(r));
  }

  async createAttendance(req: { companyId: string }, dto: any) {
    const { employeeId, employeeName, date, status, ...rest } = dto;
    const row = await this.prisma.attendanceRecord.create({
      data: {
        companyId: req.companyId,
        employeeId,
        employeeName,
        date: new Date(date),
        status,
        data: rest,
      },
    });
    return this.toPublic(row);
  }

  // --- Acidentes ---
  async listAccidents(req: { companyId: string }, limit = 100) {
    const rows = await this.prisma.workAccident.findMany({
      where: { companyId: req.companyId, deletedAt: null },
      orderBy: { accidentDate: "desc" },
      take: limit,
    });
    return rows.map(r => this.toPublic(r));
  }

  async createAccident(req: { companyId: string }, dto: any) {
    const { employeeId, employeeName, accidentDate, severity, ...rest } = dto;
    const row = await this.prisma.workAccident.create({
      data: {
        companyId: req.companyId,
        employeeId,
        employeeName,
        accidentDate: new Date(accidentDate),
        severity,
        data: rest,
      },
    });
    return this.toPublic(row);
  }
}
