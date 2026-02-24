import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class PurchaseRequestService {
  private prisma: PrismaService;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  private normalizeExtraData(input: any): Record<string, any> {
    const base = input?.data && typeof input.data === 'object' ? input.data : {};

    return {
      ...base,
      ...(input?.numeroSolicitacao !== undefined ? { numeroSolicitacao: input.numeroSolicitacao } : {}),
      ...(input?.solicitanteNome !== undefined ? { solicitanteNome: input.solicitanteNome } : {}),
      ...(input?.proveedorId !== undefined ? { proveedorId: input.proveedorId } : {}),
      ...(input?.tipo !== undefined ? { tipo: input.tipo } : {}),
      ...(input?.justificativa !== undefined ? { justificativa: input.justificativa } : {}),
      ...(input?.prioridade !== undefined ? { prioridade: input.prioridade } : {}),
      ...(input?.dataNecessidade !== undefined ? { dataNecessidade: input.dataNecessidade } : {}),
      ...(input?.moneda !== undefined ? { moneda: input.moneda } : {}),
      ...(input?.produtos !== undefined ? { produtos: input.produtos } : {}),
      ...(input?.status !== undefined ? { status: input.status } : {}),
      ...(input?.estado !== undefined ? { estado: input.estado } : {}),
      ...(input?.ordemCompraNumero !== undefined ? { ordemCompraNumero: input.ordemCompraNumero } : {}),
    };
  }

  private toClient(entity: any) {
    const extra = entity?.data && typeof entity.data === 'object' ? entity.data : {};

    return {
      ...entity,
      numeroSolicitacao: entity.numero_solicitacao ?? extra.numeroSolicitacao ?? null,
      solicitanteNome: entity.solicitante_nome ?? extra.solicitanteNome ?? null,
      proveedorId: entity.proveedor_id ?? extra.proveedorId ?? null,
      tipo: entity.tipo ?? extra.tipo ?? null,
      justificativa: entity.justificativa ?? extra.justificativa ?? null,
      prioridade: entity.prioridade ?? extra.prioridade ?? null,
      dataNecessidade: entity.data_necessidade ?? extra.dataNecessidade ?? null,
      moneda: entity.moneda ?? extra.moneda ?? null,
      produtos: entity.produtos ?? extra.produtos ?? [],
      status: entity.status ?? extra.status ?? null,
      estado: entity.estado ?? extra.estado ?? null,
      ordemCompraNumero: entity.ordem_compra_numero ?? extra.ordemCompraNumero ?? null,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return [];
    }

    const rows = await this.prisma.purchase_requests.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });

    return rows.map((row) => this.toClient(row));
  }

  async findById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    const row = await this.prisma.purchase_requests.findFirst({
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
    const parsedDate = data?.dataNecessidade ? new Date(data.dataNecessidade) : null;
    const dataNecessidade = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

    const created = await this.prisma.purchase_requests.create({
      data: {
        company_id: companyId,
        numero_solicitacao: data?.numeroSolicitacao ?? null,
        solicitante_nome: data?.solicitanteNome ?? null,
        proveedor_id: data?.proveedorId ?? null,
        tipo: data?.tipo ?? null,
        justificativa: data?.justificativa ?? null,
        prioridade: data?.prioridade ?? null,
        data_necessidade: dataNecessidade,
        moneda: data?.moneda ?? null,
        produtos: data?.produtos ?? null,
        status: data?.status ?? null,
        estado: data?.estado ?? null,
        ordem_compra_numero: data?.ordemCompraNumero ?? null,
        data: Object.keys(extra).length > 0 ? extra : undefined,
      },
    });

    return this.toClient(created);
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.prisma.purchase_requests.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Solicitação de compra não encontrada');
    }

    const extra = {
      ...(existing?.data && typeof existing.data === 'object' ? existing.data : {}),
      ...this.normalizeExtraData(data),
    };

    const parsedDate = data?.dataNecessidade ? new Date(data.dataNecessidade) : null;
    const dataNecessidade = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

    const updated = await this.prisma.purchase_requests.update({
      where: { id },
      data: {
        ...(data?.numeroSolicitacao !== undefined ? { numero_solicitacao: data.numeroSolicitacao } : {}),
        ...(data?.solicitanteNome !== undefined ? { solicitante_nome: data.solicitanteNome } : {}),
        ...(data?.proveedorId !== undefined ? { proveedor_id: data.proveedorId } : {}),
        ...(data?.tipo !== undefined ? { tipo: data.tipo } : {}),
        ...(data?.justificativa !== undefined ? { justificativa: data.justificativa } : {}),
        ...(data?.prioridade !== undefined ? { prioridade: data.prioridade } : {}),
        ...(data?.dataNecessidade !== undefined ? { data_necessidade: dataNecessidade } : {}),
        ...(data?.moneda !== undefined ? { moneda: data.moneda } : {}),
        ...(data?.produtos !== undefined ? { produtos: data.produtos } : {}),
        ...(data?.status !== undefined ? { status: data.status } : {}),
        ...(data?.estado !== undefined ? { estado: data.estado } : {}),
        ...(data?.ordemCompraNumero !== undefined ? { ordem_compra_numero: data.ordemCompraNumero } : {}),
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

    const deleted = await this.prisma.purchase_requests.deleteMany({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Solicitação de compra não encontrada');
    }

    return { id };
  }
}
