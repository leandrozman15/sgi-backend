import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class WorkTeamService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCompany(companyId: string) {
    if (!companyId) return [];
    return this.prisma.work_teams.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findById(id: string, companyId: string) {
    if (!companyId) return null;
    return this.prisma.work_teams.findFirst({
      where: { id, company_id: companyId },
    });
  }

  async createItem(data: any, companyId: string) {
    if (!companyId) throw new NotFoundException('Empresa não encontrada');
    if (!data?.name) throw new NotFoundException('Nome da equipe é obrigatório');

    return this.prisma.work_teams.create({
      data: {
        company_id: companyId,
        name: data.name,
        area: data.area ?? null,
        leader_id: data.leader_id ?? data.leaderId ?? null,
        leader_name: data.leader_name ?? data.leaderName ?? null,
        member_ids: data.member_ids ?? data.memberIds ?? [],
        member_names: data.member_names ?? data.memberNames ?? [],
        data: data.data ?? null,
      },
    });
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) throw new NotFoundException('Empresa não encontrada');

    const existing = await this.prisma.work_teams.findFirst({
      where: { id, company_id: companyId },
    });
    if (!existing) throw new NotFoundException('Equipe não encontrada');

    return this.prisma.work_teams.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.area !== undefined ? { area: data.area } : {}),
        ...(data.leader_id ?? data.leaderId ? { leader_id: data.leader_id ?? data.leaderId } : {}),
        ...(data.leader_name ?? data.leaderName ? { leader_name: data.leader_name ?? data.leaderName } : {}),
        ...(data.member_ids ?? data.memberIds ? { member_ids: data.member_ids ?? data.memberIds } : {}),
        ...(data.member_names ?? data.memberNames ? { member_names: data.member_names ?? data.memberNames } : {}),
        ...(data.data !== undefined ? { data: data.data } : {}),
        updated_at: new Date(),
      },
    });
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) throw new NotFoundException('Empresa não encontrada');

    const existing = await this.prisma.work_teams.findFirst({
      where: { id, company_id: companyId },
    });
    if (!existing) throw new NotFoundException('Equipe não encontrada');

    return this.prisma.work_teams.delete({ where: { id } });
  }
}
