import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ExpenseProjectionService } from '../expense-projection/expense-projection.service';

@Injectable()
export class PurchaseOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expenseProjection: ExpenseProjectionService,
  ) {}

  private normalizeExtraData(input: any): Record<string, any> {
    const base = input?.data && typeof input.data === 'object' ? input.data : {};

    return {
      ...base,
      ...(input?.numeroOrdem !== undefined ? { numeroOrdem: input.numeroOrdem } : {}),
      ...(input?.solicitudId !== undefined ? { solicitudId: input.solicitudId } : {}),
      ...(input?.proveedorId !== undefined ? { proveedorId: input.proveedorId } : {}),
      ...(input?.solicitanteNome !== undefined ? { solicitanteNome: input.solicitanteNome } : {}),
      ...(input?.prazoEntrega !== undefined ? { prazoEntrega: input.prazoEntrega } : {}),
      ...(input?.formaPagamento !== undefined ? { formaPagamento: input.formaPagamento } : {}),
      ...(input?.transportadoraId !== undefined ? { transportadoraId: input.transportadoraId } : {}),
      ...(input?.observacoes !== undefined ? { observacoes: input.observacoes } : {}),
      ...(input?.produtos !== undefined ? { produtos: input.produtos } : {}),
      ...(input?.estado !== undefined ? { estado: input.estado } : {}),
      ...(input?.fechaOrden !== undefined ? { fechaOrden: input.fechaOrden } : {}),
      // Soft-archive flags (kept inside the JSONB blob since the relational
      // schema has no dedicated columns). Without this the PUT silently drops
      // them and the frontend Archivar button appears to do nothing.
      ...(input?.archived !== undefined ? { archived: !!input.archived } : {}),
      ...(input?.archivedAt !== undefined ? { archivedAt: input.archivedAt } : {}),
      // Budget linkage (no dedicated column either — lives in JSONB).
      ...(input?.costCenterId !== undefined ? { costCenterId: input.costCenterId } : {}),
      ...(input?.scheduledPaymentDate !== undefined ? { scheduledPaymentDate: input.scheduledPaymentDate } : {}),
      ...(input?.proveedorNome !== undefined ? { proveedorNome: input.proveedorNome } : {}),
    };
  }

  private toClient(entity: any) {
    const extra = entity?.data && typeof entity.data === 'object' ? entity.data : {};

    return {
      ...entity,
      numeroOrdem: entity.numero_ordem ?? extra.numeroOrdem ?? null,
      solicitudId: entity.solicitud_id ?? extra.solicitudId ?? null,
      proveedorId: entity.proveedor_id ?? extra.proveedorId ?? null,
      solicitanteNome: entity.solicitante_nome ?? extra.solicitanteNome ?? null,
      prazoEntrega: entity.prazo_entrega ?? extra.prazoEntrega ?? null,
      formaPagamento: entity.forma_pagamento ?? extra.formaPagamento ?? null,
      transportadoraId: entity.transportadora_id ?? extra.transportadoraId ?? null,
      observacoes: entity.observacoes ?? extra.observacoes ?? null,
      produtos: entity.produtos ?? extra.produtos ?? [],
      estado: entity.estado ?? extra.estado ?? null,
      fechaOrden: entity.fecha_orden ?? extra.fechaOrden ?? null,
      archived: !!extra.archived,
      archivedAt: extra.archivedAt ?? null,
      costCenterId: extra.costCenterId ?? null,
      scheduledPaymentDate: extra.scheduledPaymentDate ?? null,
      proveedorNome: extra.proveedorNome ?? null,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return [];
    }

    const rows = await this.prisma.purchase_orders.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });

    return rows.map((row) => this.toClient(row));
  }

  async findById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    const row = await this.prisma.purchase_orders.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    return row ? this.toClient(row) : null;
  }

  async createItem(data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const extra = this.normalizeExtraData(data);
    const parsedPrazo = data?.prazoEntrega ? new Date(data.prazoEntrega) : null;
    const prazoEntrega = parsedPrazo && !Number.isNaN(parsedPrazo.getTime()) ? parsedPrazo : null;
    const parsedFecha = data?.fechaOrden ? new Date(data.fechaOrden) : null;
    const fechaOrden = parsedFecha && !Number.isNaN(parsedFecha.getTime()) ? parsedFecha : new Date();

    const created = await this.prisma.purchase_orders.create({
      data: {
        company_id: companyId,
        numero_ordem: data?.numeroOrdem ?? null,
        solicitud_id: data?.solicitudId ?? null,
        proveedor_id: data?.proveedorId ?? null,
        solicitante_nome: data?.solicitanteNome ?? null,
        prazo_entrega: prazoEntrega,
        forma_pagamento: data?.formaPagamento ?? null,
        transportadora_id: data?.transportadoraId ?? null,
        observacoes: data?.observacoes ?? null,
        produtos: data?.produtos ?? null,
        estado: data?.estado ?? null,
        fecha_orden: fechaOrden,
        data: Object.keys(extra).length > 0 ? extra : undefined,
      },
    });

    await this.syncBudgetCommitments(created, companyId).catch((err) => {
      // No bloquear la creación si la sincronización con presupuesto falla
      // eslint-disable-next-line no-console
      console.warn('[purchase-orders] budget sync failed:', err?.message || err);
    });

    return this.toClient(created);
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.prisma.purchase_orders.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Ordem de compra não encontrada');
    }

    const extra = {
      ...(existing?.data && typeof existing.data === 'object' ? existing.data : {}),
      ...this.normalizeExtraData(data),
    };

    const parsedPrazo = data?.prazoEntrega ? new Date(data.prazoEntrega) : null;
    const prazoEntrega = parsedPrazo && !Number.isNaN(parsedPrazo.getTime()) ? parsedPrazo : null;
    const parsedFecha = data?.fechaOrden ? new Date(data.fechaOrden) : null;
    const fechaOrden = parsedFecha && !Number.isNaN(parsedFecha.getTime()) ? parsedFecha : null;

    const updated = await this.prisma.purchase_orders.update({
      where: { id },
      data: {
        ...(data?.numeroOrdem !== undefined ? { numero_ordem: data.numeroOrdem } : {}),
        ...(data?.solicitudId !== undefined ? { solicitud_id: data.solicitudId } : {}),
        ...(data?.proveedorId !== undefined ? { proveedor_id: data.proveedorId } : {}),
        ...(data?.solicitanteNome !== undefined ? { solicitante_nome: data.solicitanteNome } : {}),
        ...(data?.prazoEntrega !== undefined ? { prazo_entrega: prazoEntrega } : {}),
        ...(data?.formaPagamento !== undefined ? { forma_pagamento: data.formaPagamento } : {}),
        ...(data?.transportadoraId !== undefined ? { transportadora_id: data.transportadoraId } : {}),
        ...(data?.observacoes !== undefined ? { observacoes: data.observacoes } : {}),
        ...(data?.produtos !== undefined ? { produtos: data.produtos } : {}),
        ...(data?.estado !== undefined ? { estado: data.estado } : {}),
        ...(data?.fechaOrden !== undefined ? { fecha_orden: fechaOrden } : {}),
        data: Object.keys(extra).length > 0 ? extra : undefined,
        updated_at: new Date(),
      },
    });

    await this.syncBudgetCommitments(updated, companyId).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[purchase-orders] budget sync failed:', err?.message || err);
    });

    return this.toClient(updated);
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const deleted = await this.prisma.purchase_orders.deleteMany({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Ordem de compra não encontrada');
    }

    return { id };
  }

  // ─── Budget integration ──────────────────────────────────────────────
  /**
   * Devuelve el monto total de la OC sumando produtos[].quantidade * precioUnitario.
   * Tolera diferentes nombres (precio, precioUnitario, precoUnitario, valorUnitario).
   */
  private computePoAmount(entity: any): number {
    const extra = entity?.data && typeof entity.data === 'object' ? entity.data : {};
    const produtos = entity?.produtos ?? extra.produtos ?? [];
    if (!Array.isArray(produtos)) return 0;
    let total = 0;
    for (const p of produtos) {
      if (!p || typeof p !== 'object') continue;
      const qty = Number(p.quantidade ?? p.quantity ?? p.cantidad ?? 1) || 0;
      const unit = Number(
        p.precioUnitario ?? p.precoUnitario ?? p.valorUnitario ?? p.precio ?? p.preco ?? p.price ?? 0,
      ) || 0;
      total += qty * unit;
    }
    return total;
  }

  private mapEstadoToTipo(estado: string | null | undefined): 'comprometido' | 'recibido' | 'pagado' | null {
    if (!estado) return null;
    const e = String(estado).toLowerCase();
    if (e === 'pagado' || e === 'pago' || e === 'paid') return 'pagado';
    if (e === 'recibido' || e === 'recibida' || e === 'received' || e === 'entregue' || e === 'entregado') return 'recibido';
    return null;
  }

  /**
   * Sincroniza la OC con el módulo de Proyección de Gastos:
   *  - Siempre registra (de forma idempotente) un commitment 'comprometido'.
   *  - Si el estado de la OC indica recepción o pago, registra los tipos correspondientes.
   * Dedup: una OC solo genera un commitment por (ref_type='po', ref_id=poId, tipo).
   */
  private async syncBudgetCommitments(entity: any, companyId: string) {
    if (!entity?.id || !companyId) return;
    const extra = entity?.data && typeof entity.data === 'object' ? entity.data : {};
    const costCenterId = (extra.costCenterId ?? entity.cost_center_id ?? null) as string | null;
    if (!costCenterId) return; // sin centro de costo no podemos imputar

    const amount = this.computePoAmount(entity);
    if (!amount || amount <= 0) return;

    const fechaOrden: Date = entity.fecha_orden ? new Date(entity.fecha_orden) : new Date();
    if (Number.isNaN(fechaOrden.getTime())) return;

    // Buscar o resolver el período presupuestario (año/mes/plant) — usa el primero abierto que matchee.
    const cc = await this.prisma.cost_centers.findFirst({
      where: { id: costCenterId, company_id: companyId },
    });
    const plant = cc?.plant ?? null;

    const period = await this.prisma.budget_periods.findFirst({
      where: {
        company_id: companyId,
        year: fechaOrden.getFullYear(),
        month: fechaOrden.getMonth() + 1,
        plant,
        status: { in: ['borrador', 'aprobado'] },
      },
    });
    if (!period) return; // sin período abierto no se registra

    const refId = entity.id as string;
    const refLabel = (entity.numero_ordem ?? extra.numeroOrdem ?? refId) as string;
    const supplierName = (extra.proveedorNome ?? null) as string | null;
    const scheduledAt = extra.scheduledPaymentDate ? new Date(extra.scheduledPaymentDate) : null;
    const scheduledSafe = scheduledAt && !Number.isNaN(scheduledAt.getTime()) ? scheduledAt : null;

    const ensureCommitment = async (tipo: 'comprometido' | 'recibido' | 'pagado') => {
      const existing = await this.prisma.budget_commitments.findFirst({
        where: {
          company_id: companyId,
          period_id: period.id,
          ref_type: 'po',
          ref_id: refId,
          tipo,
        },
      });
      if (existing) return;
      await this.expenseProjection.recordCommitment({
        companyId,
        periodId: period.id,
        costCenterId,
        tipo,
        amount,
        currency: 'BRL',
        refType: 'po',
        refId,
        refLabel,
        supplierName: supplierName ?? undefined,
        occurredAt: fechaOrden,
        scheduledAt: scheduledSafe,
      });
    };

    // Siempre 'comprometido'
    await ensureCommitment('comprometido');

    // Si el estado lo amerita, añadir recibido/pagado
    const tipoExtra = this.mapEstadoToTipo(entity.estado ?? extra.estado);
    if (tipoExtra === 'recibido') {
      await ensureCommitment('recibido');
    } else if (tipoExtra === 'pagado') {
      await ensureCommitment('recibido');
      await ensureCommitment('pagado');
    }
  }
}
