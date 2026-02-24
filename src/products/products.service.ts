import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ProductService {
  private prisma: PrismaService;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
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
      ...(input?.published !== undefined ? { published: !!input.published } : {}),
      ...(input?.gs1Code !== undefined ? { gs1Code: input.gs1Code } : {}),
      ...(input?.customerBarcode !== undefined ? { customerBarcode: input.customerBarcode } : {}),
      ...(input?.type !== undefined ? { type: input.type } : {}),
      ...(input?.currentStock !== undefined ? { currentStock: input.currentStock } : {}),
      ...(input?.weight !== undefined ? { weight: input.weight } : {}),
      ...(input?.dangerousGoodsClass !== undefined ? { dangerousGoodsClass: input.dangerousGoodsClass } : {}),
      ...(input?.countryOfOrigin !== undefined ? { countryOfOrigin: input.countryOfOrigin } : {}),
      ...(input?.ncm !== undefined ? { ncm: input.ncm } : {}),
      ...(input?.cest !== undefined ? { cest: input.cest } : {}),
      ...(input?.cfop !== undefined ? { cfop: input.cfop } : {}),
      ...(input?.csosn !== undefined ? { csosn: input.csosn } : {}),
      ...(input?.ipiAliquota !== undefined ? { ipiAliquota: input.ipiAliquota } : {}),
      ...(input?.ipiSituacaoTributaria !== undefined ? { ipiSituacaoTributaria: input.ipiSituacaoTributaria } : {}),
      ...(input?.ipiCodEnquadramento !== undefined ? { ipiCodEnquadramento: input.ipiCodEnquadramento } : {}),
      ...(input?.icmsAliquota !== undefined ? { icmsAliquota: input.icmsAliquota } : {}),
      ...(input?.sujeitoIcmsSt !== undefined ? { sujeitoIcmsSt: !!input.sujeitoIcmsSt } : {}),
      ...(input?.mvaAliquota !== undefined ? { mvaAliquota: input.mvaAliquota } : {}),
      ...(input?.valorIcmsSt !== undefined ? { valorIcmsSt: input.valorIcmsSt } : {}),
      ...(input?.origemMercadoria !== undefined ? { origemMercadoria: input.origemMercadoria } : {}),
      ...(input?.unidadeTributavel !== undefined ? { unidadeTributavel: input.unidadeTributavel } : {}),
      ...(input?.pisSituacaoTributaria !== undefined ? { pisSituacaoTributaria: input.pisSituacaoTributaria } : {}),
      ...(input?.pisAliquota !== undefined ? { pisAliquota: input.pisAliquota } : {}),
      ...(input?.cofinsSituacaoTributaria !== undefined ? { cofinsSituacaoTributaria: input.cofinsSituacaoTributaria } : {}),
      ...(input?.cofinsAliquota !== undefined ? { cofinsAliquota: input.cofinsAliquota } : {}),
      ...(input?.icmsModalidadeBC !== undefined ? { icmsModalidadeBC: input.icmsModalidadeBC } : {}),
      ...(input?.codClassificacaoTributaria !== undefined ? { codClassificacaoTributaria: input.codClassificacaoTributaria } : {}),
      ...(input?.aliquotaIBSUF !== undefined ? { aliquotaIBSUF: input.aliquotaIBSUF } : {}),
      ...(input?.aliquotaIBSMun !== undefined ? { aliquotaIBSMun: input.aliquotaIBSMun } : {}),
      ...(input?.aliquotaCBS !== undefined ? { aliquotaCBS: input.aliquotaCBS } : {}),
      ...(input?.imageUrls !== undefined ? { imageUrls: input.imageUrls } : {}),
      ...(input?.variants !== undefined ? { variants: input.variants } : {}),
      ...(input?.rawMaterials !== undefined ? { rawMaterials: input.rawMaterials } : {}),
      ...(input?.stages !== undefined ? { stages: input.stages } : {}),
      ...(input?.technicalSpecs !== undefined ? { technicalSpecs: input.technicalSpecs } : {}),
    };
  }

  private toClientProduct(entity: any) {
    const extra = entity?.data && typeof entity.data === 'object' ? entity.data : {};

    return {
      ...entity,
      nome: entity.name,
      sku: entity.sku ?? extra.sku ?? entity.code ?? null,
      published: entity.published ?? extra.published ?? false,
      gs1Code: entity.gs1_code ?? extra.gs1Code ?? null,
      customerBarcode: entity.customer_barcode ?? extra.customerBarcode ?? null,
      type: entity.type ?? extra.type ?? null,
      currentStock: entity.current_stock ?? extra.currentStock ?? 0,
      weight: entity.weight ?? extra.weight ?? null,
      dangerousGoodsClass: entity.dangerous_goods_class ?? extra.dangerousGoodsClass ?? null,
      countryOfOrigin: entity.country_of_origin ?? extra.countryOfOrigin ?? null,
      ncm: entity.ncm ?? extra.ncm ?? null,
      cest: entity.cest ?? extra.cest ?? null,
      cfop: entity.cfop ?? extra.cfop ?? null,
      csosn: entity.csosn ?? extra.csosn ?? null,
      ipiAliquota: entity.ipi_aliquota ?? extra.ipiAliquota ?? null,
      ipiSituacaoTributaria: entity.ipi_situacao_tributaria ?? extra.ipiSituacaoTributaria ?? null,
      ipiCodEnquadramento: entity.ipi_cod_enquadramento ?? extra.ipiCodEnquadramento ?? null,
      icmsAliquota: entity.icms_aliquota ?? extra.icmsAliquota ?? null,
      sujeitoIcmsSt: entity.sujeito_icms_st ?? extra.sujeitoIcmsSt ?? false,
      mvaAliquota: entity.mva_aliquota ?? extra.mvaAliquota ?? null,
      valorIcmsSt: entity.valor_icms_st ?? extra.valorIcmsSt ?? null,
      origemMercadoria: entity.origem_mercadoria ?? extra.origemMercadoria ?? null,
      unidadeTributavel: entity.unidade_tributavel ?? extra.unidadeTributavel ?? null,
      pisSituacaoTributaria: entity.pis_situacao_tributaria ?? extra.pisSituacaoTributaria ?? null,
      pisAliquota: entity.pis_aliquota ?? extra.pisAliquota ?? null,
      cofinsSituacaoTributaria: entity.cofins_situacao_tributaria ?? extra.cofinsSituacaoTributaria ?? null,
      cofinsAliquota: entity.cofins_aliquota ?? extra.cofinsAliquota ?? null,
      icmsModalidadeBC: entity.icms_modalidade_bc ?? extra.icmsModalidadeBC ?? null,
      codClassificacaoTributaria: entity.cod_classificacao_tributaria ?? extra.codClassificacaoTributaria ?? null,
      aliquotaIBSUF: entity.aliquota_ibs_uf ?? extra.aliquotaIBSUF ?? null,
      aliquotaIBSMun: entity.aliquota_ibs_mun ?? extra.aliquotaIBSMun ?? null,
      aliquotaCBS: entity.aliquota_cbs ?? extra.aliquotaCBS ?? null,
      imageUrls: entity.image_urls ?? extra.imageUrls ?? [],
      variants: entity.variants ?? extra.variants ?? [],
      rawMaterials: entity.raw_materials ?? extra.rawMaterials ?? [],
      stages: entity.stages ?? extra.stages ?? [],
      technicalSpecs: entity.technical_specs ?? extra.technicalSpecs ?? [],
    };
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return [];
    }

    const rows = await this.prisma.products.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });

    return rows.map((row) => this.toClientProduct(row));
  }

  async findById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    const row = await this.prisma.products.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    return row ? this.toClientProduct(row) : null;
  }

  async createItem(data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const extra = this.normalizeExtraData(data);
    const name = data?.name ?? data?.nome;
    const code = data?.code ?? data?.sku;

    if (!name) {
      throw new NotFoundException('Nome do produto é obrigatório');
    }

    const created = await this.prisma.products.create({
      data: {
        id: randomUUID(),
        name,
        code: code ?? null,
        sku: data?.sku ?? code ?? null,
        published: data?.published !== undefined ? !!data.published : false,
        gs1_code: data?.gs1Code ?? null,
        customer_barcode: data?.customerBarcode ?? null,
        type: data?.type ?? null,
        description: data?.description ?? data?.productDescription ?? null,
        price: this.toNumberOrNull(data?.price),
        current_stock: this.toIntOrNull(data?.currentStock),
        weight: this.toNumberOrNull(data?.weight),
        dangerous_goods_class: data?.dangerousGoodsClass ?? null,
        country_of_origin: data?.countryOfOrigin ?? null,
        ncm: data?.ncm ?? null,
        cest: data?.cest ?? null,
        cfop: data?.cfop ?? null,
        csosn: data?.csosn ?? null,
        ipi_aliquota: this.toNumberOrNull(data?.ipiAliquota),
        ipi_situacao_tributaria: data?.ipiSituacaoTributaria ?? null,
        ipi_cod_enquadramento: data?.ipiCodEnquadramento ?? null,
        icms_aliquota: this.toNumberOrNull(data?.icmsAliquota),
        sujeito_icms_st: data?.sujeitoIcmsSt !== undefined ? !!data.sujeitoIcmsSt : null,
        mva_aliquota: this.toNumberOrNull(data?.mvaAliquota),
        valor_icms_st: this.toNumberOrNull(data?.valorIcmsSt),
        origem_mercadoria: data?.origemMercadoria ?? null,
        unidade_tributavel: data?.unidadeTributavel ?? null,
        pis_situacao_tributaria: data?.pisSituacaoTributaria ?? null,
        pis_aliquota: this.toNumberOrNull(data?.pisAliquota),
        cofins_situacao_tributaria: data?.cofinsSituacaoTributaria ?? null,
        cofins_aliquota: this.toNumberOrNull(data?.cofinsAliquota),
        icms_modalidade_bc: data?.icmsModalidadeBC ?? null,
        cod_classificacao_tributaria: data?.codClassificacaoTributaria ?? null,
        aliquota_ibs_uf: this.toNumberOrNull(data?.aliquotaIBSUF),
        aliquota_ibs_mun: this.toNumberOrNull(data?.aliquotaIBSMun),
        aliquota_cbs: this.toNumberOrNull(data?.aliquotaCBS),
        image_urls: data?.imageUrls ?? null,
        variants: data?.variants ?? null,
        raw_materials: data?.rawMaterials ?? null,
        stages: data?.stages ?? null,
        technical_specs: data?.technicalSpecs ?? null,
        data: Object.keys(extra).length > 0 ? extra : undefined,
        company_id: companyId,
        updated_at: new Date(),
      },
    });

    return this.toClientProduct(created);
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.prisma.products.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Produto não encontrado');
    }

    const extra = {
      ...(existing?.data && typeof existing.data === 'object' ? existing.data : {}),
      ...this.normalizeExtraData(data),
    };

    const updated = await this.prisma.products.update({
      where: { id },
      data: {
        ...(data?.name !== undefined || data?.nome !== undefined
          ? { name: data?.name ?? data?.nome }
          : {}),
        ...(data?.code !== undefined || data?.sku !== undefined
          ? { code: data?.code ?? data?.sku ?? null }
          : {}),
        ...(data?.sku !== undefined || data?.code !== undefined
          ? { sku: data?.sku ?? data?.code ?? null }
          : {}),
        ...(data?.published !== undefined ? { published: !!data.published } : {}),
        ...(data?.gs1Code !== undefined ? { gs1_code: data.gs1Code } : {}),
        ...(data?.customerBarcode !== undefined ? { customer_barcode: data.customerBarcode } : {}),
        ...(data?.type !== undefined ? { type: data.type } : {}),
        ...(data?.description !== undefined ? { description: data.description } : {}),
        ...(data?.price !== undefined ? { price: this.toNumberOrNull(data.price) } : {}),
        ...(data?.currentStock !== undefined ? { current_stock: this.toIntOrNull(data.currentStock) } : {}),
        ...(data?.weight !== undefined ? { weight: this.toNumberOrNull(data.weight) } : {}),
        ...(data?.dangerousGoodsClass !== undefined ? { dangerous_goods_class: data.dangerousGoodsClass } : {}),
        ...(data?.countryOfOrigin !== undefined ? { country_of_origin: data.countryOfOrigin } : {}),
        ...(data?.ncm !== undefined ? { ncm: data.ncm } : {}),
        ...(data?.cest !== undefined ? { cest: data.cest } : {}),
        ...(data?.cfop !== undefined ? { cfop: data.cfop } : {}),
        ...(data?.csosn !== undefined ? { csosn: data.csosn } : {}),
        ...(data?.ipiAliquota !== undefined ? { ipi_aliquota: this.toNumberOrNull(data.ipiAliquota) } : {}),
        ...(data?.ipiSituacaoTributaria !== undefined ? { ipi_situacao_tributaria: data.ipiSituacaoTributaria } : {}),
        ...(data?.ipiCodEnquadramento !== undefined ? { ipi_cod_enquadramento: data.ipiCodEnquadramento } : {}),
        ...(data?.icmsAliquota !== undefined ? { icms_aliquota: this.toNumberOrNull(data.icmsAliquota) } : {}),
        ...(data?.sujeitoIcmsSt !== undefined ? { sujeito_icms_st: !!data.sujeitoIcmsSt } : {}),
        ...(data?.mvaAliquota !== undefined ? { mva_aliquota: this.toNumberOrNull(data.mvaAliquota) } : {}),
        ...(data?.valorIcmsSt !== undefined ? { valor_icms_st: this.toNumberOrNull(data.valorIcmsSt) } : {}),
        ...(data?.origemMercadoria !== undefined ? { origem_mercadoria: data.origemMercadoria } : {}),
        ...(data?.unidadeTributavel !== undefined ? { unidade_tributavel: data.unidadeTributavel } : {}),
        ...(data?.pisSituacaoTributaria !== undefined ? { pis_situacao_tributaria: data.pisSituacaoTributaria } : {}),
        ...(data?.pisAliquota !== undefined ? { pis_aliquota: this.toNumberOrNull(data.pisAliquota) } : {}),
        ...(data?.cofinsSituacaoTributaria !== undefined ? { cofins_situacao_tributaria: data.cofinsSituacaoTributaria } : {}),
        ...(data?.cofinsAliquota !== undefined ? { cofins_aliquota: this.toNumberOrNull(data.cofinsAliquota) } : {}),
        ...(data?.icmsModalidadeBC !== undefined ? { icms_modalidade_bc: data.icmsModalidadeBC } : {}),
        ...(data?.codClassificacaoTributaria !== undefined ? { cod_classificacao_tributaria: data.codClassificacaoTributaria } : {}),
        ...(data?.aliquotaIBSUF !== undefined ? { aliquota_ibs_uf: this.toNumberOrNull(data.aliquotaIBSUF) } : {}),
        ...(data?.aliquotaIBSMun !== undefined ? { aliquota_ibs_mun: this.toNumberOrNull(data.aliquotaIBSMun) } : {}),
        ...(data?.aliquotaCBS !== undefined ? { aliquota_cbs: this.toNumberOrNull(data.aliquotaCBS) } : {}),
        ...(data?.imageUrls !== undefined ? { image_urls: data.imageUrls } : {}),
        ...(data?.variants !== undefined ? { variants: data.variants } : {}),
        ...(data?.rawMaterials !== undefined ? { raw_materials: data.rawMaterials } : {}),
        ...(data?.stages !== undefined ? { stages: data.stages } : {}),
        ...(data?.technicalSpecs !== undefined ? { technical_specs: data.technicalSpecs } : {}),
        data: Object.keys(extra).length > 0 ? extra : undefined,
        updated_at: new Date(),
      },
    });

    return this.toClientProduct(updated);
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const deleted = await this.prisma.products.deleteMany({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Produto não encontrado');
    }

    return { id };
  }
}
