import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ShiftService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCompany(companyId: string) {
    if (!companyId) return [];
    return this.prisma.shifts.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findById(id: string, companyId: string) {
    if (!companyId) return null;
    return this.prisma.shifts.findFirst({
      where: { id, company_id: companyId },
    });
  }

  async createItem(data: any, companyId: string) {
    if (!companyId) throw new NotFoundException('Empresa não encontrada');
    if (!data?.name) throw new NotFoundException('Nome do turno é obrigatório');

    return this.prisma.shifts.create({
      data: {
        company_id: companyId,
        name: data.name,
        start_time: data.start_time ?? data.startTime ?? '',
        end_time: data.end_time ?? data.endTime ?? '',
        area: data.area ?? null,
        supervisor_id: data.supervisor_id ?? data.supervisorId ?? null,
        supervisor_name: data.supervisor_name ?? data.supervisorName ?? null,
        worker_count: data.worker_count ?? data.workerCount ?? 0,
        assigned_team_ids: data.assigned_team_ids ?? data.assignedTeamIds ?? [],
        expected_production: data.expected_production ?? data.expectedProduction ?? 0,
        actual_production: data.actual_production ?? data.actualProduction ?? 0,
        status: data.status ?? 'Ativo',
        data: data.data ?? null,
      },
    });
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) throw new NotFoundException('Empresa não encontrada');

    const existing = await this.prisma.shifts.findFirst({
      where: { id, company_id: companyId },
    });
    if (!existing) throw new NotFoundException('Turno não encontrado');

    return this.prisma.shifts.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.start_time ?? data.startTime ? { start_time: data.start_time ?? data.startTime } : {}),
        ...(data.end_time ?? data.endTime ? { end_time: data.end_time ?? data.endTime } : {}),
        ...(data.area !== undefined ? { area: data.area } : {}),
        ...(data.supervisor_id ?? data.supervisorId ? { supervisor_id: data.supervisor_id ?? data.supervisorId } : {}),
        ...(data.supervisor_name ?? data.supervisorName ? { supervisor_name: data.supervisor_name ?? data.supervisorName } : {}),
        ...(data.worker_count ?? data.workerCount ? { worker_count: data.worker_count ?? data.workerCount } : {}),
        ...(data.assigned_team_ids ?? data.assignedTeamIds ? { assigned_team_ids: data.assigned_team_ids ?? data.assignedTeamIds } : {}),
        ...(data.expected_production ?? data.expectedProduction ? { expected_production: data.expected_production ?? data.expectedProduction } : {}),
        ...(data.actual_production ?? data.actualProduction ? { actual_production: data.actual_production ?? data.actualProduction } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.data !== undefined ? { data: data.data } : {}),
        updated_at: new Date(),
      },
    });
  }

  async updateProduction(id: string, data: any, companyId: string) {
    if (!companyId) throw new NotFoundException('Empresa não encontrada');

    const existing = await this.prisma.shifts.findFirst({
      where: { id, company_id: companyId },
    });
    if (!existing) throw new NotFoundException('Turno não encontrado');

    return this.prisma.shifts.update({
      where: { id },
      data: {
        actual_production: data.actual_production ?? data.actualProduction ?? existing.actual_production,
        updated_at: new Date(),
      },
    });
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) throw new NotFoundException('Empresa não encontrada');

    const existing = await this.prisma.shifts.findFirst({
      where: { id, company_id: companyId },
    });
    if (!existing) throw new NotFoundException('Turno não encontrado');

    return this.prisma.shifts.delete({ where: { id } });
  }
}
