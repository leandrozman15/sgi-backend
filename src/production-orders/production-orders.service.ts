import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
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

    // Verify product exists in DB
    const product = await this.prisma.products.findFirst({
      where: { id: String(payload.product_id), company_id: companyId },
    });
    if (!product) {
      throw new BadRequestException(
        `Produto não encontrado (id: ${payload.product_id}). O produto pode não ter sido migrado para o banco de dados.`,
      );
    }

    // Check for duplicate order number within this company
    const existingOrder = await this.prisma.production_orders.findFirst({
      where: { number: payload.number, company_id: companyId },
    });
    if (existingOrder) {
      throw new ConflictException(
        `Já existe uma ordem de produção com o número ${payload.number}.`,
      );
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

    // Check for duplicate order number within this company (on number change)
    if (payload?.number !== undefined && payload.number !== existing.number) {
      const duplicate = await this.prisma.production_orders.findFirst({
        where: { number: payload.number, company_id: companyId },
      });
      if (duplicate) {
        throw new ConflictException(
          `Já existe uma ordem de produção com o número ${payload.number}.`,
        );
      }
    }

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

  // ─── Bultos (Embalagem) ────────────────────────────────────────────────────

  private async _getOrder(id: string, companyId: string) {
    const order = await this.prisma.production_orders.findFirst({
      where: { id, company_id: companyId },
    });
    if (!order) throw new NotFoundException('Ordem de produção não encontrada');
    return order;
  }

  async addBulto(orderId: string, bultoDto: any, companyId: string) {
    const order = await this._getOrder(orderId, companyId);

    const existingData: any =
      order.data && typeof order.data === 'object' ? order.data : {};

    if (existingData.packagingLocked) {
      throw new BadRequestException('Embalagem já confirmada. Não é possível adicionar bultos.');
    }

    const bultos: any[] = Array.isArray(existingData.bultos) ? existingData.bultos : [];

    const newBulto = {
      id: randomUUID(),
      code: `BX-${String(bultos.length + 1).padStart(3, '0')}`,
      tipo: bultoDto.tipo ?? 'Caixa',
      productId: bultoDto.productId ?? null,
      productName: bultoDto.productName ?? null,
      quantidade: Number(bultoDto.quantidade ?? 0),
      pesoBruto: Number(bultoDto.pesoBruto ?? 0),
      pesoLiquido: bultoDto.pesoLiquido !== undefined ? Number(bultoDto.pesoLiquido) : null,
      largura: Number(bultoDto.largura ?? 0),
      altura: Number(bultoDto.altura ?? 0),
      profundidade: Number(bultoDto.profundidade ?? 0),
      createdAt: new Date().toISOString(),
    };

    bultos.push(newBulto);

    const updatedData = {
      ...existingData,
      bultos,
      packagingStatus: existingData.packagingStatus === 'Embalado' ? 'Embalado' : 'Em embalagem',
    };

    return this.prisma.production_orders.update({
      where: { id: orderId },
      data: { data: updatedData, updated_at: new Date() },
    });
  }

  async removeBulto(orderId: string, bultoId: string, companyId: string) {
    const order = await this._getOrder(orderId, companyId);

    const existingData: any =
      order.data && typeof order.data === 'object' ? order.data : {};

    if (existingData.packagingLocked) {
      throw new BadRequestException('Embalagem já confirmada. Não é possível remover bultos.');
    }

    const bultos: any[] = Array.isArray(existingData.bultos) ? existingData.bultos : [];
    const filtered = bultos.filter((b: any) => b.id !== bultoId);

    if (filtered.length === bultos.length) {
      throw new NotFoundException('Bulto não encontrado');
    }

    // Re-sequence codes
    const resequenced = filtered.map((b: any, i: number) => ({
      ...b,
      code: `BX-${String(i + 1).padStart(3, '0')}`,
    }));

    const updatedData = {
      ...existingData,
      bultos: resequenced,
      packagingStatus: resequenced.length === 0 ? 'Pendente' : existingData.packagingStatus,
    };

    return this.prisma.production_orders.update({
      where: { id: orderId },
      data: { data: updatedData, updated_at: new Date() },
    });
  }

  async confirmarEmbalagem(orderId: string, companyId: string) {
    const order = await this._getOrder(orderId, companyId);

    const existingData: any =
      order.data && typeof order.data === 'object' ? order.data : {};

    const bultos: any[] = Array.isArray(existingData.bultos) ? existingData.bultos : [];

    if (bultos.length === 0) {
      throw new BadRequestException('Adicione ao menos um bulto antes de confirmar a embalagem.');
    }

    const updatedData = {
      ...existingData,
      bultos,
      packagingStatus: 'Embalado',
      packagingLocked: true,
      packagingConfirmedAt: new Date().toISOString(),
    };

    return this.prisma.production_orders.update({
      where: { id: orderId },
      data: { data: updatedData, updated_at: new Date() },
    });
  }
}
