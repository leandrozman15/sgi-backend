import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class SaleService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  private normalizeData(input: any): Record<string, any> {
    if (input?.data && typeof input.data === 'object') {
      return input.data;
    }

    const {
      id,
      companyId,
      createdAt,
      updatedAt,
      ...rest
    } = input || {};

    return rest;
  }

  private toClient(entity: any) {
    const extra = entity?.data && typeof entity.data === 'object' ? entity.data : {};

    return {
      ...entity,
      ...extra,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return [];
    }

    const rows = await this.prisma.sales.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.toClient(row));
  }

  async findById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    const row = await this.prisma.sales.findFirst({
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

    const normalized = this.normalizeData(data);

    const created = await this.prisma.sales.create({
      data: {
        id: randomUUID(),
        companyId,
        data: normalized,
        updatedAt: new Date(),
      },
    });

    return this.toClient(created);
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.prisma.sales.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Venda não encontrada');
    }

    const merged = {
      ...(existing?.data && typeof existing.data === 'object' ? existing.data : {}),
      ...this.normalizeData(data),
    };

    const updated = await this.prisma.sales.update({
      where: { id },
      data: {
        data: merged,
        updatedAt: new Date(),
      },
    });

    return this.toClient(updated);
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const deleted = await this.prisma.sales.deleteMany({
      where: {
        id,
        companyId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Venda não encontrada');
    }

    return { id };
  }
}
