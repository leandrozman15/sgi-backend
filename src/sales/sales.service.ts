import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class SaleService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return [];
    }

    return this.prisma.sales.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    return this.prisma.sales.findFirst({
      where: {
        id,
        companyId,
      },
    });
  }

  async createItem(data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return this.prisma.sales.create({
      data: {
        id: randomUUID(),
        companyId,
        data: data?.data ?? data ?? null,
        updatedAt: new Date(),
      },
    });
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

    return this.prisma.sales.update({
      where: { id },
      data: {
        ...(data?.data !== undefined ? { data: data.data } : { data: data ?? existing.data }),
        updatedAt: new Date(),
      },
    });
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
