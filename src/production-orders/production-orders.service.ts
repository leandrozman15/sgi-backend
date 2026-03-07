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

  async createItem(payload: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    if (!payload?.number || !payload?.product_id || payload?.quantity === undefined) {
      throw new NotFoundException('Campos obrigatórios: number, product_id, quantity');
    }

    let variantId: string | null = null;
    if (payload?.variant_id !== undefined && payload?.variant_id !== null && String(payload.variant_id).trim() !== '') {
      const variant = await this.prisma.product_variants.findFirst({
        where: {
          id: String(payload.variant_id),
          company_id: companyId,
        },
      });

      if (!variant) {
        throw new NotFoundException('Variante não encontrada para esta empresa');
      }

      if (variant.product_id !== String(payload.product_id)) {
        throw new NotFoundException('A variante selecionada não pertence ao produto informado');
      }

      variantId = variant.id;
    }

    return this.prisma.production_orders.create({
      data: {
        id: randomUUID(),
        number: payload.number,
        product_id: payload.product_id,
        variant_id: variantId,
        quantity: Number(payload.quantity),
        status: payload?.status ?? 'pending',
        company_id: companyId,
        data: payload,
        updated_at: new Date(),
      },
    });
  }

  async updateItem(id: string, payload: any, companyId: string) {
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

    const nextProductId = payload?.product_id !== undefined ? String(payload.product_id) : existing.product_id;

    let nextVariantId: string | null | undefined = undefined;
    if (payload?.variant_id !== undefined) {
      if (payload.variant_id === null || String(payload.variant_id).trim() === '') {
        nextVariantId = null;
      } else {
        const variant = await this.prisma.product_variants.findFirst({
          where: {
            id: String(payload.variant_id),
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

    const existingData = existing?.data && typeof existing.data === 'object' ? existing.data : {};
    const nextData = payload && typeof payload === 'object' ? { ...existingData, ...payload } : existingData;

    return this.prisma.production_orders.update({
      where: { id },
      data: {
        ...(payload?.number !== undefined ? { number: payload.number } : {}),
        ...(payload?.product_id !== undefined ? { product_id: payload.product_id } : {}),
        ...(nextVariantId !== undefined ? { variant_id: nextVariantId } : {}),
        ...(payload?.quantity !== undefined ? { quantity: Number(payload.quantity) } : {}),
        ...(payload?.status !== undefined ? { status: payload.status } : {}),
        ...(payload !== undefined ? { data: nextData } : {}),
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
