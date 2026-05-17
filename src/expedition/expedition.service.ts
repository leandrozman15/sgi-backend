import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NumberSequenceService } from '../number-sequences/number-sequences.service';
import { InventoryApplicationService } from '../inventory/inventory-application.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ExpeditionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberSequences: NumberSequenceService,
    private readonly inventoryApplication: InventoryApplicationService,
  ) {}

  async findByCompany(companyId: string, limit?: number) {
    if (!companyId) return [];
    const take = Math.min(Math.max(Number(limit) || 200, 1), 1000);
    const rows = await this.prisma.expeditions.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return rows.map((r) => this.serialize(r));
  }

  async findById(id: string, companyId: string) {
    if (!companyId) return null;
    const row = await this.prisma.expeditions.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!row) {
      throw new NotFoundException('Expedição não encontrada.');
    }
    return this.serialize(row);
  }

  async createItem(data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }
    if (!data?.clienteNome) {
      throw new BadRequestException('clienteNome é obrigatório.');
    }
    if (!data?.tipoEnvio) {
      throw new BadRequestException('tipoEnvio é obrigatório.');
    }

    const now = new Date();
    let numeroGuia = data.numeroGuia ?? null;
    if (!numeroGuia) {
      try {
        const allocated = await this.numberSequences.allocate(
          companyId,
          'expedition',
          data.createdBy ?? null,
        );
        numeroGuia = allocated.formatted;
      } catch {
        // leave null
      }
    }
    const created = await this.prisma.expeditions.create({
      data: {
        id: randomUUID(),
        companyId,
        pedidoRef: data.pedidoRef ?? null,
        pedidoId: data.pedidoId ?? null,
        clienteNome: String(data.clienteNome),
        dataExpedicao: data.dataExpedicao ? new Date(data.dataExpedicao) : now,
        status: data.status ?? 'Pendente',
        tipoEnvio: String(data.tipoEnvio),
        transportadoraNome: data.transportadoraNome ?? null,
        numeroGuia,
        modalidadeFrete: data.modalidadeFrete ?? null,
        placaVeiculo: data.placaVeiculo ?? null,
        observacoes: data.observacoes ?? null,
        tipoDocumentoFiscal: data.tipoDocumentoFiscal ?? null,
        nfeNumero: data.nfeNumero ?? null,
        nfeStatus: data.nfeStatus ?? null,
        items: this.asJsonArray(data.items),
        bultos: this.asJsonArray(data.bultos),
        historico: this.asJsonArray(data.historico),
        createdAt: now,
        updatedAt: now,
        createdBy: data.createdBy ?? null,
      },
    });

    // Se já criada como "Despachado", aplica saída de estoque
    try {
      if (String(created.status || '').toLowerCase() === 'despachado') {
        await this.inventoryApplication.applyExpeditionDelivery(created.id, companyId);
      }
    } catch (err) {
      console.error('Falha ao aplicar estoque para expedição criada já despachada:', err);
    }

    return this.serialize(created);
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }
    const existing = await this.prisma.expeditions.findFirst({
      where: { id, companyId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!existing) {
      throw new NotFoundException('Expedição não encontrada.');
    }

    const updateData: any = { updatedAt: new Date() };
    const scalarFields = [
      'pedidoRef',
      'pedidoId',
      'clienteNome',
      'status',
      'tipoEnvio',
      'transportadoraNome',
      'numeroGuia',
      'modalidadeFrete',
      'placaVeiculo',
      'observacoes',
      'tipoDocumentoFiscal',
      'nfeNumero',
      'nfeStatus',
      'createdBy',
    ];
    for (const k of scalarFields) {
      if (k in data) updateData[k] = data[k] ?? null;
    }
    if ('dataExpedicao' in data && data.dataExpedicao) {
      updateData.dataExpedicao = new Date(data.dataExpedicao);
    }
    if ('items' in data) updateData.items = this.asJsonArray(data.items);
    if ('bultos' in data) updateData.bultos = this.asJsonArray(data.bultos);
    if ('historico' in data) updateData.historico = this.asJsonArray(data.historico);

    const updated = await this.prisma.expeditions.update({
      where: { id },
      data: updateData,
    });

    // Aplica saída de estoque quando expedição passa a "Despachado"
    try {
      const becameDespachado =
        String(updated.status || '').toLowerCase() === 'despachado' &&
        String(existing.status || '').toLowerCase() !== 'despachado';
      if (becameDespachado) {
        await this.inventoryApplication.applyExpeditionDelivery(updated.id, companyId);
      }
      // Reverte estoque se uma expedição já despachada for revertida (cancelada/erro/pendente)
      const wasDespachado = String(existing.status || '').toLowerCase() === 'despachado';
      const isDespachado = String(updated.status || '').toLowerCase() === 'despachado';
      if (wasDespachado && !isDespachado) {
        await this.inventoryApplication.reverseExpeditionDelivery(updated.id, companyId);
      }
    } catch (err) {
      console.error('Falha ao aplicar/reverter estoque para expedição:', err);
    }

    return this.serialize(updated);
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }
    const existing = await this.prisma.expeditions.findFirst({
      where: { id, companyId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!existing) {
      throw new NotFoundException('Expedição não encontrada.');
    }
    await this.prisma.expeditions.update({
      where: { id },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
    // Se a expedição já tinha sido despachada, reverte saída de estoque
    try {
      if (String(existing.status || '').toLowerCase() === 'despachado') {
        await this.inventoryApplication.reverseExpeditionDelivery(id, companyId);
      }
    } catch (err) {
      console.error('Falha ao reverter estoque na exclusão da expedição:', err);
    }
    return { success: true };
  }

  private asJsonArray(value: any): any {
    if (Array.isArray(value)) return value;
    return [];
  }

  private serialize(row: any) {
    if (!row) return row;
    return {
      id: row.id,
      pedidoRef: row.pedidoRef ?? undefined,
      pedidoId: row.pedidoId ?? undefined,
      clienteNome: row.clienteNome,
      dataExpedicao: row.dataExpedicao?.toISOString?.() ?? row.dataExpedicao,
      status: row.status,
      tipoEnvio: row.tipoEnvio,
      transportadoraNome: row.transportadoraNome ?? undefined,
      numeroGuia: row.numeroGuia ?? undefined,
      modalidadeFrete: row.modalidadeFrete ?? undefined,
      placaVeiculo: row.placaVeiculo ?? undefined,
      observacoes: row.observacoes ?? undefined,
      tipoDocumentoFiscal: row.tipoDocumentoFiscal ?? undefined,
      nfeNumero: row.nfeNumero ?? undefined,
      nfeStatus: row.nfeStatus ?? undefined,
      items: Array.isArray(row.items) ? row.items : [],
      bultos: Array.isArray(row.bultos) ? row.bultos : [],
      historico: Array.isArray(row.historico) ? row.historico : [],
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
      updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
      createdBy: row.createdBy ?? undefined,
    };
  }
}
