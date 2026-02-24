import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class RawMaterialService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  private toNumberOrNull(value: any): number | null {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private toIntOrNull(value: any): number | null {
    if (value === undefined || value === null || value === '') return null;
    const parsed = parseInt(String(value), 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private normalizeExtraData(input: any): Record<string, any> {
    const base = input?.data && typeof input.data === 'object' ? input.data : {};

    return {
      ...base,
      ...(input?.sku !== undefined ? { sku: input.sku } : {}),
      ...(input?.code !== undefined ? { code: input.code } : {}),
      ...(input?.gs1Code !== undefined ? { gs1Code: input.gs1Code } : {}),
      ...(input?.customerBarcode !== undefined ? { customerBarcode: input.customerBarcode } : {}),
      ...(input?.group !== undefined ? { group: input.group } : {}),
      ...(input?.lote !== undefined ? { lote: input.lote } : {}),
      ...(input?.minStock !== undefined ? { minStock: input.minStock } : {}),
      ...(input?.maxStock !== undefined ? { maxStock: input.maxStock } : {}),
      ...(input?.currentStock !== undefined ? { currentStock: input.currentStock } : {}),
      ...(input?.weight !== undefined ? { weight: input.weight } : {}),
      ...(input?.dangerousGoodsClass !== undefined ? { dangerousGoodsClass: input.dangerousGoodsClass } : {}),
      ...(input?.tipoMaterial !== undefined ? { tipoMaterial: input.tipoMaterial } : {}),
      ...(input?.unidadeConsumo !== undefined ? { unidadeConsumo: input.unidadeConsumo } : {}),
      ...(input?.fatorConversao !== undefined ? { fatorConversao: input.fatorConversao } : {}),
      ...(input?.validadeDias !== undefined ? { validadeDias: input.validadeDias } : {}),
      ...(input?.localizacaoEstoque !== undefined ? { localizacaoEstoque: input.localizacaoEstoque } : {}),
      ...(input?.obsTecnicas !== undefined ? { obsTecnicas: input.obsTecnicas } : {}),
      ...(input?.ncm !== undefined ? { ncm: input.ncm } : {}),
      ...(input?.cest !== undefined ? { cest: input.cest } : {}),
      ...(input?.cfop !== undefined ? { cfop: input.cfop } : {}),
      ...(input?.csosn !== undefined ? { csosn: input.csosn } : {}),
      ...(input?.unidadeTributavel !== undefined ? { unidadeTributavel: input.unidadeTributavel } : {}),
      ...(input?.origem !== undefined ? { origem: input.origem } : {}),
      ...(input?.ipiAliquota !== undefined ? { ipiAliquota: input.ipiAliquota } : {}),
      ...(input?.ipiSituacaoTributaria !== undefined ? { ipiSituacaoTributaria: input.ipiSituacaoTributaria } : {}),
      ...(input?.ipiCodEnquadramento !== undefined ? { ipiCodEnquadramento: input.ipiCodEnquadramento } : {}),
      ...(input?.icmsAliquota !== undefined ? { icmsAliquota: input.icmsAliquota } : {}),
      ...(input?.sujeitoIcmsSt !== undefined ? { sujeitoIcmsSt: !!input.sujeitoIcmsSt } : {}),
      ...(input?.mvaAliquota !== undefined ? { mvaAliquota: input.mvaAliquota } : {}),
      ...(input?.valorIcmsSt !== undefined ? { valorIcmsSt: input.valorIcmsSt } : {}),
      ...(input?.pisSituacaoTributaria !== undefined ? { pisSituacaoTributaria: input.pisSituacaoTributaria } : {}),
      ...(input?.pisAliquota !== undefined ? { pisAliquota: input.pisAliquota } : {}),
      ...(input?.cofinsSituacaoTributaria !== undefined ? { cofinsSituacaoTributaria: input.cofinsSituacaoTributaria } : {}),
      ...(input?.cofinsAliquota !== undefined ? { cofinsAliquota: input.cofinsAliquota } : {}),
      ...(input?.icmsModalidadeBC !== undefined ? { icmsModalidadeBC: input.icmsModalidadeBC } : {}),
      ...(input?.codClassificacaoTributaria !== undefined ? { codClassificacaoTributaria: input.codClassificacaoTributaria } : {}),
      ...(input?.aliquotaIBSUF !== undefined ? { aliquotaIBSUF: input.aliquotaIBSUF } : {}),
      ...(input?.aliquotaIBSMun !== undefined ? { aliquotaIBSMun: input.aliquotaIBSMun } : {}),
      ...(input?.aliquotaCBS !== undefined ? { aliquotaCBS: input.aliquotaCBS } : {}),
      ...(input?.fornecedores !== undefined ? { fornecedores: input.fornecedores } : {}),
    };
  }

  private toClientRawMaterial(entity: any) {
    const extra = entity?.data && typeof entity.data === 'object' ? entity.data : {};

    return {
      ...entity,
      name: entity.nome,
      code: entity.code ?? extra.code ?? entity.sku ?? null,
      sku: entity.sku ?? extra.sku ?? entity.code ?? null,
      gs1Code: entity.gs1Code ?? extra.gs1Code ?? null,
      customerBarcode: entity.customerBarcode ?? extra.customerBarcode ?? null,
      group: entity.group ?? extra.group ?? null,
      lote: entity.lote ?? extra.lote ?? null,
      minStock: entity.minStock ?? extra.minStock ?? null,
      maxStock: entity.maxStock ?? extra.maxStock ?? null,
      currentStock: entity.currentStock ?? extra.currentStock ?? null,
      weight: entity.weight ?? extra.weight ?? null,
      dangerousGoodsClass: entity.dangerousGoodsClass ?? extra.dangerousGoodsClass ?? null,
      tipoMaterial: entity.tipoMaterial ?? extra.tipoMaterial ?? null,
      unidadeConsumo: entity.unidadeConsumo ?? extra.unidadeConsumo ?? null,
      fatorConversao: entity.fatorConversao ?? extra.fatorConversao ?? null,
      validadeDias: entity.validadeDias ?? extra.validadeDias ?? null,
      localizacaoEstoque: entity.localizacaoEstoque ?? extra.localizacaoEstoque ?? null,
      obsTecnicas: entity.obsTecnicas ?? extra.obsTecnicas ?? null,
      ncm: entity.ncm ?? extra.ncm ?? null,
      cest: entity.cest ?? extra.cest ?? null,
      cfop: entity.cfop ?? extra.cfop ?? null,
      csosn: entity.csosn ?? extra.csosn ?? null,
      unidadeTributavel: entity.unidadeTributavel ?? extra.unidadeTributavel ?? null,
      origem: entity.origem ?? extra.origem ?? null,
      ipiAliquota: entity.ipiAliquota ?? extra.ipiAliquota ?? null,
      ipiSituacaoTributaria: entity.ipiSituacaoTributaria ?? extra.ipiSituacaoTributaria ?? null,
      ipiCodEnquadramento: entity.ipiCodEnquadramento ?? extra.ipiCodEnquadramento ?? null,
      icmsAliquota: entity.icmsAliquota ?? extra.icmsAliquota ?? null,
      sujeitoIcmsSt: entity.sujeitoIcmsSt ?? extra.sujeitoIcmsSt ?? false,
      mvaAliquota: entity.mvaAliquota ?? extra.mvaAliquota ?? null,
      valorIcmsSt: entity.valorIcmsSt ?? extra.valorIcmsSt ?? null,
      pisSituacaoTributaria: entity.pisSituacaoTributaria ?? extra.pisSituacaoTributaria ?? null,
      pisAliquota: entity.pisAliquota ?? extra.pisAliquota ?? null,
      cofinsSituacaoTributaria: entity.cofinsSituacaoTributaria ?? extra.cofinsSituacaoTributaria ?? null,
      cofinsAliquota: entity.cofinsAliquota ?? extra.cofinsAliquota ?? null,
      icmsModalidadeBC: entity.icmsModalidadeBC ?? extra.icmsModalidadeBC ?? null,
      codClassificacaoTributaria: entity.codClassificacaoTributaria ?? extra.codClassificacaoTributaria ?? null,
      aliquotaIBSUF: entity.aliquotaIBSUF ?? extra.aliquotaIBSUF ?? null,
      aliquotaIBSMun: entity.aliquotaIBSMun ?? extra.aliquotaIBSMun ?? null,
      aliquotaCBS: entity.aliquotaCBS ?? extra.aliquotaCBS ?? null,
      fornecedores: entity.fornecedores ?? extra.fornecedores ?? [],
    };
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return [];
    }

    const rows = await this.prisma.raw_materials.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.toClientRawMaterial(row));
  }

  async findById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    const row = await this.prisma.raw_materials.findFirst({
      where: {
        id,
        companyId,
      },
    });

    return row ? this.toClientRawMaterial(row) : null;
  }

  async createItem(data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const extra = this.normalizeExtraData(data);
    const created = await this.prisma.raw_materials.create({
      data: {
        id: randomUUID(),
        companyId,
        nome: data?.nome ?? data?.name,
        code: data?.code ?? data?.sku ?? null,
        sku: data?.sku ?? data?.code ?? null,
        gs1Code: data?.gs1Code ?? null,
        customerBarcode: data?.customerBarcode ?? null,
        group: data?.group ?? null,
        lote: data?.lote ?? null,
        minStock: this.toNumberOrNull(data?.minStock),
        maxStock: this.toNumberOrNull(data?.maxStock),
        currentStock: this.toNumberOrNull(data?.currentStock),
        weight: this.toNumberOrNull(data?.weight),
        dangerousGoodsClass: data?.dangerousGoodsClass ?? null,
        tipoMaterial: data?.tipoMaterial ?? null,
        unidadeConsumo: data?.unidadeConsumo ?? null,
        fatorConversao: this.toNumberOrNull(data?.fatorConversao),
        validadeDias: this.toIntOrNull(data?.validadeDias),
        localizacaoEstoque: data?.localizacaoEstoque ?? null,
        obsTecnicas: data?.obsTecnicas ?? null,
        ncm: data?.ncm ?? null,
        cest: data?.cest ?? null,
        cfop: data?.cfop ?? null,
        csosn: data?.csosn ?? null,
        unidadeTributavel: data?.unidadeTributavel ?? null,
        origem: data?.origem ?? null,
        ipiAliquota: this.toNumberOrNull(data?.ipiAliquota),
        ipiSituacaoTributaria: data?.ipiSituacaoTributaria ?? null,
        ipiCodEnquadramento: data?.ipiCodEnquadramento ?? null,
        icmsAliquota: this.toNumberOrNull(data?.icmsAliquota),
        sujeitoIcmsSt: data?.sujeitoIcmsSt !== undefined ? !!data.sujeitoIcmsSt : null,
        mvaAliquota: this.toNumberOrNull(data?.mvaAliquota),
        valorIcmsSt: this.toNumberOrNull(data?.valorIcmsSt),
        pisSituacaoTributaria: data?.pisSituacaoTributaria ?? null,
        pisAliquota: this.toNumberOrNull(data?.pisAliquota),
        cofinsSituacaoTributaria: data?.cofinsSituacaoTributaria ?? null,
        cofinsAliquota: this.toNumberOrNull(data?.cofinsAliquota),
        icmsModalidadeBC: data?.icmsModalidadeBC ?? null,
        codClassificacaoTributaria: data?.codClassificacaoTributaria ?? null,
        aliquotaIBSUF: this.toNumberOrNull(data?.aliquotaIBSUF),
        aliquotaIBSMun: this.toNumberOrNull(data?.aliquotaIBSMun),
        aliquotaCBS: this.toNumberOrNull(data?.aliquotaCBS),
        fornecedores: data?.fornecedores ?? null,
        data: Object.keys(extra).length > 0 ? extra : undefined,
        updatedAt: new Date(),
      },
    });

    return this.toClientRawMaterial(created);
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.prisma.raw_materials.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Matéria-prima não encontrada');
    }

    const extra = {
      ...(existing?.data && typeof existing.data === 'object' ? existing.data : {}),
      ...this.normalizeExtraData(data),
    };

    const updated = await this.prisma.raw_materials.update({
      where: { id },
      data: {
        ...(data?.nome !== undefined || data?.name !== undefined
          ? { nome: data?.nome ?? data?.name }
          : {}),
        ...(data?.code !== undefined || data?.sku !== undefined
          ? { code: data?.code ?? data?.sku ?? null }
          : {}),
        ...(data?.sku !== undefined || data?.code !== undefined
          ? { sku: data?.sku ?? data?.code ?? null }
          : {}),
        ...(data?.gs1Code !== undefined ? { gs1Code: data.gs1Code } : {}),
        ...(data?.customerBarcode !== undefined ? { customerBarcode: data.customerBarcode } : {}),
        ...(data?.group !== undefined ? { group: data.group } : {}),
        ...(data?.lote !== undefined ? { lote: data.lote } : {}),
        ...(data?.minStock !== undefined ? { minStock: this.toNumberOrNull(data.minStock) } : {}),
        ...(data?.maxStock !== undefined ? { maxStock: this.toNumberOrNull(data.maxStock) } : {}),
        ...(data?.currentStock !== undefined ? { currentStock: this.toNumberOrNull(data.currentStock) } : {}),
        ...(data?.weight !== undefined ? { weight: this.toNumberOrNull(data.weight) } : {}),
        ...(data?.dangerousGoodsClass !== undefined ? { dangerousGoodsClass: data.dangerousGoodsClass } : {}),
        ...(data?.tipoMaterial !== undefined ? { tipoMaterial: data.tipoMaterial } : {}),
        ...(data?.unidadeConsumo !== undefined ? { unidadeConsumo: data.unidadeConsumo } : {}),
        ...(data?.fatorConversao !== undefined ? { fatorConversao: this.toNumberOrNull(data.fatorConversao) } : {}),
        ...(data?.validadeDias !== undefined ? { validadeDias: this.toIntOrNull(data.validadeDias) } : {}),
        ...(data?.localizacaoEstoque !== undefined ? { localizacaoEstoque: data.localizacaoEstoque } : {}),
        ...(data?.obsTecnicas !== undefined ? { obsTecnicas: data.obsTecnicas } : {}),
        ...(data?.ncm !== undefined ? { ncm: data.ncm } : {}),
        ...(data?.cest !== undefined ? { cest: data.cest } : {}),
        ...(data?.cfop !== undefined ? { cfop: data.cfop } : {}),
        ...(data?.csosn !== undefined ? { csosn: data.csosn } : {}),
        ...(data?.unidadeTributavel !== undefined ? { unidadeTributavel: data.unidadeTributavel } : {}),
        ...(data?.origem !== undefined ? { origem: data.origem } : {}),
        ...(data?.ipiAliquota !== undefined ? { ipiAliquota: this.toNumberOrNull(data.ipiAliquota) } : {}),
        ...(data?.ipiSituacaoTributaria !== undefined ? { ipiSituacaoTributaria: data.ipiSituacaoTributaria } : {}),
        ...(data?.ipiCodEnquadramento !== undefined ? { ipiCodEnquadramento: data.ipiCodEnquadramento } : {}),
        ...(data?.icmsAliquota !== undefined ? { icmsAliquota: this.toNumberOrNull(data.icmsAliquota) } : {}),
        ...(data?.sujeitoIcmsSt !== undefined ? { sujeitoIcmsSt: !!data.sujeitoIcmsSt } : {}),
        ...(data?.mvaAliquota !== undefined ? { mvaAliquota: this.toNumberOrNull(data.mvaAliquota) } : {}),
        ...(data?.valorIcmsSt !== undefined ? { valorIcmsSt: this.toNumberOrNull(data.valorIcmsSt) } : {}),
        ...(data?.pisSituacaoTributaria !== undefined ? { pisSituacaoTributaria: data.pisSituacaoTributaria } : {}),
        ...(data?.pisAliquota !== undefined ? { pisAliquota: this.toNumberOrNull(data.pisAliquota) } : {}),
        ...(data?.cofinsSituacaoTributaria !== undefined ? { cofinsSituacaoTributaria: data.cofinsSituacaoTributaria } : {}),
        ...(data?.cofinsAliquota !== undefined ? { cofinsAliquota: this.toNumberOrNull(data.cofinsAliquota) } : {}),
        ...(data?.icmsModalidadeBC !== undefined ? { icmsModalidadeBC: data.icmsModalidadeBC } : {}),
        ...(data?.codClassificacaoTributaria !== undefined ? { codClassificacaoTributaria: data.codClassificacaoTributaria } : {}),
        ...(data?.aliquotaIBSUF !== undefined ? { aliquotaIBSUF: this.toNumberOrNull(data.aliquotaIBSUF) } : {}),
        ...(data?.aliquotaIBSMun !== undefined ? { aliquotaIBSMun: this.toNumberOrNull(data.aliquotaIBSMun) } : {}),
        ...(data?.aliquotaCBS !== undefined ? { aliquotaCBS: this.toNumberOrNull(data.aliquotaCBS) } : {}),
        ...(data?.fornecedores !== undefined ? { fornecedores: data.fornecedores } : {}),
        data: Object.keys(extra).length > 0 ? extra : undefined,
        updatedAt: new Date(),
      },
    });

    return this.toClientRawMaterial(updated);
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const deleted = await this.prisma.raw_materials.deleteMany({
      where: {
        id,
        companyId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Matéria-prima não encontrada');
    }

    return { id };
  }
}
