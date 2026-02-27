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

    let variantId: string | null = null;
    if (data?.variant_id !== undefined && data?.variant_id !== null && String(data.variant_id).trim() !== '') {
      const variant = await this.prisma.product_variants.findFirst({
        where: {
          id: String(data.variant_id),
          company_id: companyId,
        },
      });

      if (!variant) {
        throw new NotFoundException('Variante não encontrada para esta empresa');
      }

      if (variant.product_id !== String(data.product_id)) {
        throw new NotFoundException('A variante selecionada não pertence ao produto informado');
      }

      variantId = variant.id;
    }

    return this.prisma.production_orders.create({
      data: {
        id: randomUUID(),
        number: data.number,
        product_id: data.product_id,
        variant_id: variantId,
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

    const nextProductId = data?.product_id !== undefined ? String(data.product_id) : existing.product_id;

    let nextVariantId: string | null | undefined = undefined;
    if (data?.variant_id !== undefined) {
      if (data.variant_id === null || String(data.variant_id).trim() === '') {
        nextVariantId = null;
      } else {
        const variant = await this.prisma.product_variants.findFirst({
          where: {
            id: String(data.variant_id),
            company_id: companyId,
          },
        });

        if (!variant) {
          throw new NotFoundException('Variante não encontrada para esta empresa');
        }

        if (variant.product_id !== nextProductId) {
          throw new NotFoundException('A variante selecionada não pertence ao produto informado');
        }

        nextVariantId = variant.id;
      }
    }

    return this.prisma.production_orders.update({
      where: { id },
      data: {
        ...(data?.number !== undefined ? { number: data.number } : {}),
        ...(data?.product_id !== undefined ? { product_id: data.product_id } : {}),
        ...(nextVariantId !== undefined ? { variant_id: nextVariantId } : {}),
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
