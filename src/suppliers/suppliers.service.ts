import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class SupplierService {
  private prisma: PrismaService;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  private normalizeExtraData(input: any): Record<string, any> {
    const base = input?.data && typeof input.data === 'object' ? input.data : {};

    return {
      ...base,
      ...(input?.nomeFantasia !== undefined ? { nomeFantasia: input.nomeFantasia } : {}),
      ...(input?.cnpj !== undefined ? { cnpj: input.cnpj } : {}),
      ...(input?.inscricaoEstadual !== undefined ? { inscricaoEstadual: input.inscricaoEstadual } : {}),
      ...(input?.tipoFornecedor !== undefined ? { tipoFornecedor: input.tipoFornecedor } : {}),
      ...(input?.active !== undefined ? { active: !!input.active } : {}),
      ...(input?.ativo !== undefined ? { active: !!input.ativo } : {}),
      ...(input?.observacoes !== undefined ? { observacoes: input.observacoes } : {}),
      ...(input?.condicaoPagamento !== undefined ? { condicaoPagamento: input.condicaoPagamento } : {}),
      ...(input?.moedaPadrao !== undefined ? { moedaPadrao: input.moedaPadrao } : {}),
      ...(input?.prazoEntrega !== undefined ? { prazoEntrega: input.prazoEntrega } : {}),
      ...(input?.avaliacao !== undefined ? { avaliacao: input.avaliacao } : {}),
      ...(input?.dadosBancarios !== undefined ? { dadosBancarios: input.dadosBancarios } : {}),
      ...(input?.contacts !== undefined ? { contacts: input.contacts } : {}),
      ...(input?.endereco !== undefined ? { endereco: input.endereco } : {}),
    };
  }

  private toIntOrNull(value: any): number | null {
    if (value === undefined || value === null || value === '') return null;
    const parsed = parseInt(String(value), 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private toClientSupplier(entity: any) {
    const extra = entity?.data && typeof entity.data === 'object' ? entity.data : {};

    return {
      ...entity,
      nomeFantasia: entity.nomeFantasia ?? extra.nomeFantasia ?? null,
      cnpj: entity.cnpj ?? extra.cnpj ?? null,
      inscricaoEstadual: entity.inscricaoEstadual ?? extra.inscricaoEstadual ?? null,
      tipoFornecedor: entity.tipoFornecedor ?? extra.tipoFornecedor ?? null,
      active: entity.active ?? extra.active ?? true,
      ativo: entity.active ?? extra.active ?? true,
      observacoes: entity.observacoes ?? extra.observacoes ?? null,
      condicaoPagamento: entity.condicaoPagamento ?? extra.condicaoPagamento ?? null,
      moedaPadrao: entity.moedaPadrao ?? extra.moedaPadrao ?? null,
      prazoEntrega: entity.prazoEntrega ?? extra.prazoEntrega ?? null,
      avaliacao: entity.avaliacao ?? extra.avaliacao ?? null,
      dadosBancarios: entity.dadosBancarios ?? extra.dadosBancarios ?? null,
      contacts: entity.contacts ?? extra.contacts ?? [],
      endereco: entity.endereco ?? extra.endereco ?? null,
    };
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return [];
    }

    const rows = await this.prisma.suppliers.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.toClientSupplier(row));
  }

  async findById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    const row = await this.prisma.suppliers.findFirst({
      where: {
        id,
        companyId,
      },
    });

    return row ? this.toClientSupplier(row) : null;
  }

  async createItem(data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const extra = this.normalizeExtraData(data);

    const created = await this.prisma.suppliers.create({
      data: {
        id: randomUUID(),
        companyId,
        nome: data?.nome,
        nomeFantasia: data?.nomeFantasia ?? null,
        cnpj: data?.cnpj ?? null,
        inscricaoEstadual: data?.inscricaoEstadual ?? null,
        tipoFornecedor: data?.tipoFornecedor ?? null,
        active: data?.active !== undefined ? !!data.active : data?.ativo !== undefined ? !!data.ativo : true,
        observacoes: data?.observacoes ?? null,
        condicaoPagamento: data?.condicaoPagamento ?? null,
        moedaPadrao: data?.moedaPadrao ?? null,
        prazoEntrega: this.toIntOrNull(data?.prazoEntrega),
        avaliacao: this.toIntOrNull(data?.avaliacao),
        dadosBancarios: data?.dadosBancarios ?? null,
        contacts: data?.contacts ?? null,
        endereco: data?.endereco ?? null,
        data: Object.keys(extra).length > 0 ? extra : undefined,
        updatedAt: new Date(),
      },
    });

    return this.toClientSupplier(created);
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.prisma.suppliers.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Fornecedor não encontrado');
    }

    const extra = {
      ...(existing?.data && typeof existing.data === 'object' ? existing.data : {}),
      ...this.normalizeExtraData(data),
    };

    const updated = await this.prisma.suppliers.update({
      where: { id },
      data: {
        ...(data?.nome !== undefined ? { nome: data.nome } : {}),
        ...(data?.nomeFantasia !== undefined ? { nomeFantasia: data.nomeFantasia } : {}),
        ...(data?.cnpj !== undefined ? { cnpj: data.cnpj } : {}),
        ...(data?.inscricaoEstadual !== undefined ? { inscricaoEstadual: data.inscricaoEstadual } : {}),
        ...(data?.tipoFornecedor !== undefined ? { tipoFornecedor: data.tipoFornecedor } : {}),
        ...(data?.active !== undefined ? { active: !!data.active } : data?.ativo !== undefined ? { active: !!data.ativo } : {}),
        ...(data?.observacoes !== undefined ? { observacoes: data.observacoes } : {}),
        ...(data?.condicaoPagamento !== undefined ? { condicaoPagamento: data.condicaoPagamento } : {}),
        ...(data?.moedaPadrao !== undefined ? { moedaPadrao: data.moedaPadrao } : {}),
        ...(data?.prazoEntrega !== undefined ? { prazoEntrega: this.toIntOrNull(data.prazoEntrega) } : {}),
        ...(data?.avaliacao !== undefined ? { avaliacao: this.toIntOrNull(data.avaliacao) } : {}),
        ...(data?.dadosBancarios !== undefined ? { dadosBancarios: data.dadosBancarios } : {}),
        ...(data?.contacts !== undefined ? { contacts: data.contacts } : {}),
        ...(data?.endereco !== undefined ? { endereco: data.endereco } : {}),
        data: Object.keys(extra).length > 0 ? extra : undefined,
        updatedAt: new Date(),
      },
    });

    return this.toClientSupplier(updated);
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const deleted = await this.prisma.suppliers.deleteMany({
      where: {
        id,
        companyId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Fornecedor não encontrado');
    }

    return { id };
  }
}
