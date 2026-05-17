import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { randomUUID } from 'crypto';

/**
 * InventoryApplicationService
 *
 * Aplica efeitos de estoque a partir de operações de negócio:
 *  - Conclusão de Ordem de Produção (entrada do produto + consumo de matérias-primas)
 *  - Despacho de Expedição (saída de produto)
 *
 * Cada movimento gerado armazena `referenceType` e `referenceId` em `data`,
 * permitindo idempotência (mesma operação não duplica movimentos nem estoque).
 */
@Injectable()
export class InventoryApplicationService {
  private readonly logger = new Logger(InventoryApplicationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Public API ──────────────────────────────────────────────────────────

  async applyProductionCompletion(orderId: string, companyId: string) {
    if (!orderId || !companyId) return;

    const order = await this.prisma.production_orders.findFirst({
      where: { id: orderId, company_id: companyId },
    });
    if (!order) return;

    const referenceType = 'production_order';
    const referenceId = orderId;

    // Idempotência: se já existem movimentos para esta OP, não faz nada.
    if (await this.hasMovementsForReference(companyId, referenceType, referenceId)) {
      this.logger.log(`OP ${orderId} já aplicada ao estoque — ignorando.`);
      return;
    }

    const data: any = (order.data as any) || {};
    const products: any[] = Array.isArray(data.products)
      ? data.products
      : [{ productId: order.product_id, quantity: Number(order.quantity || 0) }];

    for (const p of products) {
      const productId = String(p?.productId || p?.product_id || order.product_id || '');
      const qty = Number(p?.quantity ?? 0);
      if (!productId || !qty || qty <= 0) continue;

      // (1) Entrada do produto fabricado
      await this.applyProductDelta(companyId, productId, +qty);
      await this.createMovement(companyId, {
        type: 'PRODUCTION_IN',
        productId,
        productName: p?.name || null,
        quantity: qty,
        unit: 'un',
        referenceType,
        referenceId,
        orderNumber: order.number,
        notes: `Entrada por conclusão de OP ${order.number}`,
      });

      // (2) Consumo de matérias-primas (baseado em product.raw_materials)
      const productRow = await this.prisma.products.findFirst({
        where: { id: productId, company_id: companyId },
        select: { raw_materials: true, name: true },
      });
      const rawMaterials: any[] = Array.isArray(productRow?.raw_materials)
        ? (productRow!.raw_materials as any[])
        : [];

      for (const rm of rawMaterials) {
        const rmId = String(rm?.id || '');
        const unitConsumption = Number(rm?.quantity ?? 0);
        if (!rmId || !Number.isFinite(unitConsumption) || unitConsumption <= 0) continue;
        const totalConsumption = unitConsumption * qty;

        await this.applyRawMaterialDelta(companyId, rmId, -totalConsumption);
        await this.createMovement(companyId, {
          type: 'RAW_OUT',
          rawMaterialId: rmId,
          rawMaterialName: rm?.name || null,
          quantity: totalConsumption,
          unit: 'un',
          referenceType,
          referenceId,
          orderNumber: order.number,
          relatedProductId: productId,
          notes: `Consumo na produção da OP ${order.number}`,
        });
      }
    }
  }

  async applyExpeditionDelivery(expeditionId: string, companyId: string) {
    if (!expeditionId || !companyId) return;
    const exp = await this.prisma.expeditions.findFirst({
      where: { id: expeditionId, companyId, deletedAt: null },
    });
    if (!exp) return;

    const referenceType = 'expedition';
    const referenceId = expeditionId;
    if (await this.hasMovementsForReference(companyId, referenceType, referenceId)) {
      this.logger.log(`Expedição ${expeditionId} já aplicada ao estoque — ignorando.`);
      return;
    }

    const items: any[] = Array.isArray(exp.items) ? (exp.items as any[]) : [];
    for (const it of items) {
      const productId = String(it?.productId || it?.product_id || '');
      const qty = Number(it?.quantidade ?? it?.quantity ?? 0);
      if (!productId || !qty || qty <= 0) continue;

      await this.applyProductDelta(companyId, productId, -qty);
      await this.createMovement(companyId, {
        type: 'SALE_OUT',
        productId,
        productName: it?.descricao || it?.name || null,
        quantity: qty,
        unit: 'un',
        referenceType,
        referenceId,
        guideNumber: exp.numeroGuia,
        notes: `Saída por despacho da expedição ${exp.numeroGuia || expeditionId}`,
      });
    }
  }

  /**
   * Reverte os movimentos aplicados para uma referência (OP reaberta ou expedição cancelada).
   * Lê todos os movimentos originais e aplica deltas opostos no estoque.
   * Idempotente: se já existir reversão registrada, não faz nada.
   */
  async reverseProductionCompletion(orderId: string, companyId: string) {
    return this.reverseReference(companyId, 'production_order', orderId, `OP ${orderId}`);
  }

  async reverseExpeditionDelivery(expeditionId: string, companyId: string) {
    return this.reverseReference(companyId, 'expedition', expeditionId, `Expedição ${expeditionId}`);
  }

  private async reverseReference(
    companyId: string,
    referenceType: string,
    referenceId: string,
    label: string,
  ) {
    // Idempotência: se já houver reversão, não faz nada
    const alreadyReversed = await this.prisma.inventory_movements.findFirst({
      where: {
        companyId,
        AND: [
          { data: { path: ['referenceType'], equals: referenceType } },
          { data: { path: ['referenceId'], equals: referenceId } },
          { data: { path: ['reversal'], equals: true } },
        ],
      },
      select: { id: true },
    });
    if (alreadyReversed) {
      this.logger.log(`${label} já revertida — ignorando.`);
      return;
    }

    const movements = await this.prisma.inventory_movements.findMany({
      where: {
        companyId,
        AND: [
          { data: { path: ['referenceType'], equals: referenceType } },
          { data: { path: ['referenceId'], equals: referenceId } },
        ],
      },
    });
    if (!movements.length) {
      this.logger.log(`${label} sem movimentos para reverter.`);
      return;
    }

    for (const mv of movements) {
      const payload = (mv.data as any) || {};
      if (payload.reversal) continue;
      const type = String(payload.type || '');
      const qty = Number(payload.quantity ?? 0);
      if (!qty || qty <= 0) continue;

      // Calcula delta inverso por tipo de movimento original
      if (type === 'PRODUCTION_IN' && payload.productId) {
        await this.applyProductDelta(companyId, String(payload.productId), -qty);
      } else if (type === 'SALE_OUT' && payload.productId) {
        await this.applyProductDelta(companyId, String(payload.productId), +qty);
      } else if (type === 'RAW_OUT' && payload.rawMaterialId) {
        await this.applyRawMaterialDelta(companyId, String(payload.rawMaterialId), +qty);
      } else {
        continue;
      }

      await this.createMovement(companyId, {
        type: `${type}_REVERSAL`,
        productId: payload.productId || null,
        rawMaterialId: payload.rawMaterialId || null,
        productName: payload.productName || null,
        rawMaterialName: payload.rawMaterialName || null,
        quantity: qty,
        unit: payload.unit || 'un',
        referenceType,
        referenceId,
        reversal: true,
        originalMovementId: mv.id,
        notes: `Reversão automática (${label})`,
      });

      // Marca o movimento original como revertido (para que hasMovementsForReference o ignore)
      await this.prisma.inventory_movements.update({
        where: { id: mv.id },
        data: {
          data: { ...payload, reversed: true, reversedAt: new Date().toISOString() },
          updatedAt: new Date(),
        },
      });
    }
  }

  // ─── Internals ───────────────────────────────────────────────────────────

  private async hasMovementsForReference(
    companyId: string,
    referenceType: string,
    referenceId: string,
  ): Promise<boolean> {
    // Considera apenas movimentos "ativos" (não reversais e não revertidos)
    const rows = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM inventory_movements
       WHERE "companyId" = $1
         AND data->>'referenceType' = $2
         AND data->>'referenceId' = $3
         AND COALESCE((data->>'reversal')::text, '') <> 'true'
         AND COALESCE((data->>'reversed')::text, '') <> 'true'
       LIMIT 1`,
      companyId,
      referenceType,
      referenceId,
    );
    return rows.length > 0;
  }

  private async createMovement(companyId: string, payload: Record<string, any>) {
    await this.prisma.inventory_movements.create({
      data: {
        id: randomUUID(),
        companyId,
        data: { ...payload, occurredAt: new Date().toISOString() },
        updatedAt: new Date(),
      },
    });
  }

  private async applyProductDelta(companyId: string, productId: string, delta: number) {
    if (!delta) return;
    const product = await this.prisma.products.findFirst({
      where: { id: productId, company_id: companyId },
      select: { id: true, current_stock: true },
    });
    if (!product) {
      this.logger.warn(`Produto ${productId} não encontrado — delta ignorado.`);
      return;
    }
    const current = Number(product.current_stock ?? 0);
    const next = Math.max(0, current + delta);
    await this.prisma.products.update({
      where: { id: productId },
      data: { current_stock: Math.round(next) },
    });
  }

  private async applyRawMaterialDelta(companyId: string, rmId: string, delta: number) {
    if (!delta) return;
    const rm = await this.prisma.raw_materials.findFirst({
      where: { id: rmId, companyId, deletedAt: null },
      select: { id: true, currentStock: true },
    });
    if (!rm) {
      this.logger.warn(`Matéria-prima ${rmId} não encontrada — delta ignorado.`);
      return;
    }
    const current = Number(rm.currentStock ?? 0);
    const next = current + delta; // permitir negativo (alerta de consumo sem estoque)
    await this.prisma.raw_materials.update({
      where: { id: rmId },
      data: { currentStock: next as any, updatedAt: new Date() },
    });
  }
}
