import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class PurchaseOrderService {
  private prisma: PrismaService;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

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
}
