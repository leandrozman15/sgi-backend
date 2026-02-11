import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class QualityService {
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

  // --- Inspeções ---
  async listInspections(req: { companyId: string }, limit = 200) {
    const rows = await this.prisma.qualityInspection.findMany({
      where: { companyId: req.companyId, deletedAt: null },
      orderBy: { inspectionDate: "desc" },
      take: limit,
    });
    return rows.map((r) => this.toPublic(r));
  }

  async getInspectionById(req: { companyId: string }, id: string) {
    const row = await this.prisma.qualityInspection.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });
    if (!row) throw new NotFoundException("Inspeção não encontrada.");
    return this.toPublic(row);
  }

  async createInspection(req: { companyId: string }, dto: any) {
    const { inspectionDate, productName, status, result, ...rest } = dto;
    const row = await this.prisma.qualityInspection.create({
      data: {
        companyId: req.companyId,
        inspectionDate: new Date(inspectionDate),
        productName,
        status: status || "Agendada",
        result,
        data: rest,
      },
    });
    return this.toPublic(row);
  }

  async updateInspection(req: { companyId: string }, id: string, dto: any) {
    const exists = await this.prisma.qualityInspection.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException("Inspeção não encontrada.");

    const { inspectionDate, productName, status, result, ...rest } = dto;
    const existingData = (exists.data as any) || {};
    const finalData = { ...existingData, ...rest };

    const row = await this.prisma.qualityInspection.update({
      where: { id },
      data: {
        inspectionDate: inspectionDate ? new Date(inspectionDate) : undefined,
        productName: productName ?? undefined,
        status: status ?? undefined,
        result: result ?? undefined,
        data: finalData,
      },
    });
    return this.toPublic(row);
  }

  async removeInspection(req: { companyId: string }, id: string) {
    await this.prisma.qualityInspection.updateMany({
      where: { id, companyId: req.companyId },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  // --- Reclamações ---
  async listComplaints(req: { companyId: string }, limit = 200) {
    const rows = await this.prisma.complaint.findMany({
      where: { companyId: req.companyId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => this.toPublic(r));
  }

  async createComplaint(req: { companyId: string }, dto: any) {
    const { numeroReclamacao, relacionadoNome, status, ...rest } = dto;
    const row = await this.prisma.complaint.create({
      data: {
        companyId: req.companyId,
        numeroReclamacao,
        relacionadoNome,
        status: status || "Aberta",
        data: rest,
      },
    });
    return this.toPublic(row);
  }

  async updateComplaint(req: { companyId: string }, id: string, dto: any) {
    const exists = await this.prisma.complaint.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException("Reclamação não encontrada.");

    const { numeroReclamacao, relacionadoNome, status, ...rest } = dto;
    const existingData = (exists.data as any) || {};
    const finalData = { ...existingData, ...rest };

    const row = await this.prisma.complaint.update({
      where: { id },
      data: {
        numeroReclamacao: numeroReclamacao ?? undefined,
        relacionadoNome: relacionadoNome ?? undefined,
        status: status ?? undefined,
        data: finalData,
      },
    });
    return this.toPublic(row);
  }

  async removeComplaint(req: { companyId: string }, id: string) {
    await this.prisma.complaint.updateMany({
      where: { id, companyId: req.companyId },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  // --- Calibrações ---
  async listCalibrations(req: { companyId: string }, limit = 200) {
    const rows = await this.prisma.calibration.findMany({
      where: { companyId: req.companyId, deletedAt: null },
      orderBy: { nextCalibrationDate: "asc" },
      take: limit,
    });
    return rows.map((r) => this.toPublic(r));
  }

  async createCalibration(req: { companyId: string }, dto: any) {
    const { instrumentName, instrumentId, nextCalibrationDate, status, ...rest } = dto;
    const row = await this.prisma.calibration.create({
      data: {
        companyId: req.companyId,
        instrumentName,
        instrumentId,
        nextCalibrationDate: new Date(nextCalibrationDate),
        status: status || "Pendente",
        data: rest,
      },
    });
    return this.toPublic(row);
  }

  async updateCalibration(req: { companyId: string }, id: string, dto: any) {
    const exists = await this.prisma.calibration.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException("Calibração não encontrada.");

    const { instrumentName, instrumentId, nextCalibrationDate, status, ...rest } = dto;
    const existingData = (exists.data as any) || {};
    const finalData = { ...existingData, ...rest };

    const row = await this.prisma.calibration.update({
      where: { id },
      data: {
        instrumentName: instrumentName ?? undefined,
        instrumentId: instrumentId ?? undefined,
        nextCalibrationDate: nextCalibrationDate ? new Date(nextCalibrationDate) : undefined,
        status: status ?? undefined,
        data: finalData,
      },
    });
    return this.toPublic(row);
  }
}
