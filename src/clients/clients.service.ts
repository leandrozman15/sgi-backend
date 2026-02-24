import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ClientService {
  private prisma: PrismaService;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  private normalizeExtraData(input: any): Record<string, any> {
    const base = input?.data && typeof input.data === 'object' ? input.data : {};

    return {
      ...base,
      ...(input?.nomeFantasia !== undefined ? { nomeFantasia: input.nomeFantasia } : {}),
      ...(input?.cnpjCpf !== undefined ? { cnpjCpf: input.cnpjCpf } : {}),
      ...(input?.cnpj_cpf !== undefined ? { cnpjCpf: input.cnpj_cpf } : {}),
      ...(input?.inscricaoEstadual !== undefined ? { inscricaoEstadual: input.inscricaoEstadual } : {}),
      ...(input?.formasPagamento !== undefined ? { formasPagamento: input.formasPagamento } : {}),
      ...(input?.cidade !== undefined ? { cidade: input.cidade } : {}),
      ...(input?.uf !== undefined ? { uf: input.uf } : {}),
      ...(input?.endereco !== undefined ? { endereco: input.endereco } : {}),
      ...(input?.contacts !== undefined ? { contacts: input.contacts } : {}),
    };
  }

  private toClient(entity: any) {
    const extra = entity?.data && typeof entity.data === 'object' ? entity.data : {};

    return {
      ...entity,
      nome: entity.nome,
      nomeFantasia: extra.nomeFantasia ?? null,
      cnpjCpf: extra.cnpjCpf ?? null,
      inscricaoEstadual: extra.inscricaoEstadual ?? null,
      formasPagamento: extra.formasPagamento ?? null,
      cidade: extra.cidade ?? null,
      uf: extra.uf ?? null,
      endereco: extra.endereco ?? null,
      contacts: Array.isArray(extra.contacts) ? extra.contacts : [],
    };
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return [];
    }

    const rows = await this.prisma.clients.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.toClient(row));
  }

  async findById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    const row = await this.prisma.clients.findFirst({
      where: {
        id,
        companyId,
      },
    });

    return row ? this.toClient(row) : null;
  }

  async createItem(data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const extra = this.normalizeExtraData(data);

    const created = await this.prisma.clients.create({
      data: {
        id: randomUUID(),
        companyId,
        nome: data?.nome || data?.nomeFantasia || 'Cliente',
        data: Object.keys(extra).length > 0 ? extra : null,
        updatedAt: new Date(),
      },
    });

    return this.toClient(created);
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.prisma.clients.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Cliente não encontrado');
    }

    const extra = {
      ...(existing?.data && typeof existing.data === 'object' ? existing.data : {}),
      ...this.normalizeExtraData(data),
    };

    const updated = await this.prisma.clients.update({
      where: { id },
      data: {
        ...(data?.nome !== undefined ? { nome: data.nome } : {}),
        ...(data?.data !== undefined ? { data: data.data } : {}),
        ...(data?.data === undefined ? { data: Object.keys(extra).length > 0 ? extra : null } : {}),
        updatedAt: new Date(),
      },
    });

    return this.toClient(updated);
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const deleted = await this.prisma.clients.deleteMany({
      where: {
        id,
        companyId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Cliente não encontrado');
    }

    return { id };
  }
}
