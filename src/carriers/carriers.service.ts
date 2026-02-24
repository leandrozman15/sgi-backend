import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class CarrierService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  private normalizeExtraData(input: any): Record<string, any> {
    const base = input?.data && typeof input.data === 'object' ? input.data : {};

    return {
      ...base,
      ...(input?.cnpj !== undefined ? { cnpj: input.cnpj } : {}),
      ...(input?.ie !== undefined ? { ie: input.ie } : {}),
      ...(input?.contacts !== undefined ? { contacts: input.contacts } : {}),
      ...(input?.endereco !== undefined ? { endereco: input.endereco } : {}),
    };
  }

  private toClientCarrier(entity: any) {
    const extra = entity?.data && typeof entity.data === 'object' ? entity.data : {};

    return {
      ...entity,
      cnpj: entity.cnpj ?? extra.cnpj ?? null,
      ie: entity.ie ?? extra.ie ?? null,
      contacts: entity.contacts ?? extra.contacts ?? [],
      endereco: entity.endereco ?? extra.endereco ?? null,
    };
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return [];
    }

    const rows = await this.prisma.carriers.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.toClientCarrier(row));
  }

  async findById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    const row = await this.prisma.carriers.findFirst({
      where: {
        id,
        companyId,
      },
    });

    return row ? this.toClientCarrier(row) : null;
  }

  async createItem(data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    if (!data?.nome) {
      throw new NotFoundException('Nome da transportadora é obrigatório');
    }

    const extra = this.normalizeExtraData(data);

    const created = await this.prisma.carriers.create({
      data: {
        id: randomUUID(),
        companyId,
        nome: data.nome,
        cnpj: data?.cnpj ?? null,
        ie: data?.ie ?? null,
        contacts: data?.contacts ?? null,
        endereco: data?.endereco ?? null,
        data: Object.keys(extra).length > 0 ? extra : undefined,
        updatedAt: new Date(),
      },
    });

    return this.toClientCarrier(created);
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.prisma.carriers.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Transportadora não encontrada');
    }

    const extra = {
      ...(existing?.data && typeof existing.data === 'object' ? existing.data : {}),
      ...this.normalizeExtraData(data),
    };

    const updated = await this.prisma.carriers.update({
      where: { id },
      data: {
        ...(data?.nome !== undefined ? { nome: data.nome } : {}),
        ...(data?.cnpj !== undefined ? { cnpj: data.cnpj } : {}),
        ...(data?.ie !== undefined ? { ie: data.ie } : {}),
        ...(data?.contacts !== undefined ? { contacts: data.contacts } : {}),
        ...(data?.endereco !== undefined ? { endereco: data.endereco } : {}),
        data: Object.keys(extra).length > 0 ? extra : undefined,
        updatedAt: new Date(),
      },
    });

    return this.toClientCarrier(updated);
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const deleted = await this.prisma.carriers.deleteMany({
      where: {
        id,
        companyId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Transportadora não encontrada');
    }

    return { id };
  }
}
