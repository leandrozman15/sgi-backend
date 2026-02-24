import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ProductionOrderService {
  private prisma: PrismaService;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return [];
    }

    return this.prisma.production_orders.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    return this.prisma.production_orders.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });
  }

  async createItem(data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    if (!data?.number || !data?.product_id || data?.quantity === undefined) {
      throw new NotFoundException('Campos obrigatórios: number, product_id, quantity');
    }

    return this.prisma.production_orders.create({
      data: {
        id: randomUUID(),
        number: data.number,
        product_id: data.product_id,
        quantity: Number(data.quantity),
        status: data?.status ?? 'pending',
        company_id: companyId,
        updated_at: new Date(),
      },
    });
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.prisma.production_orders.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Ordem de produção não encontrada');
    }

    return this.prisma.production_orders.update({
      where: { id },
      data: {
        ...(data?.number !== undefined ? { number: data.number } : {}),
        ...(data?.product_id !== undefined ? { product_id: data.product_id } : {}),
        ...(data?.quantity !== undefined ? { quantity: Number(data.quantity) } : {}),
        ...(data?.status !== undefined ? { status: data.status } : {}),
        updated_at: new Date(),
      },
    });
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const deleted = await this.prisma.production_orders.deleteMany({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Ordem de produção não encontrada');
    }

    return { id };
  }
}
