import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
      ...(input?.baseCalculoIBSCBS !== undefined ? { baseCalculoIBSCBS: input.baseCalculoIBSCBS } : {}),
      ...(input?.imageUrls !== undefined ? { imageUrls: input.imageUrls } : {}),
      ...(input?.variants !== undefined ? { variants: input.variants } : {}),
      ...(input?.rawMaterials !== undefined ? { rawMaterials: input.rawMaterials } : {}),
      ...(input?.stages !== undefined ? { stages: input.stages } : {}),
      ...(input?.technicalSpecs !== undefined ? { technicalSpecs: input.technicalSpecs } : {}),
    };
  }

  private normalizeVariantRows(variants: any[] | undefined, baseName: string, productId: string, companyId: string) {
    if (!Array.isArray(variants)) return [] as any[];
    return variants
      .filter((v) => v)
      .map((v) => {
        const name = v.name || v.value || `${baseName} - ${v.sku || v.code || 'Variante'}`;
        const code = v.code ?? v.sku ?? null;
        const price = this.toNumberOrNull(v.price ?? v.preco ?? v.valor ?? v.valorUnitario ?? v.unitPrice);
        return {
          id: v.id ?? randomUUID(),
          product_id: productId,
          company_id: companyId,
          name,
          sku: v.sku ?? null,
          code,
          price,
          data: v,
          updated_at: new Date(),
        };
      });
  }

  private async syncVariants(productId: string, companyId: string, baseName: string, variants: any[] | undefined) {
    if (!productId || !companyId) return;
    const rows = this.normalizeVariantRows(variants, baseName, productId, companyId);
    await this.prisma.$transaction([
      this.prisma.product_variants.deleteMany({ where: { product_id: productId } }),
      rows.length
        ? this.prisma.product_variants.createMany({ data: rows })
        : this.prisma.$executeRaw`SELECT 1`,
    ]);
  }

  private toClientProduct(entity: any, variantsFromDb?: any[]) {
    const extra = entity?.data && typeof entity.data === 'object' ? entity.data : {};
    const normalizedVariants = Array.isArray(variantsFromDb)
      ? variantsFromDb.map((v) => ({
          ...v,
          name: v.name,
          sku: v.sku,
          code: v.code,
          price: v.price,
        }))
      : entity.variants ?? extra.variants ?? [];

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
      baseCalculoIBSCBS: entity.base_calculo_ibs_cbs ?? extra.baseCalculoIBSCBS ?? null,
      imageUrls: entity.image_urls ?? extra.imageUrls ?? [],
      rawMaterials: entity.raw_materials ?? extra.rawMaterials ?? [],
      stages: entity.stages ?? extra.stages ?? [],
      technicalSpecs: entity.technical_specs ?? extra.technicalSpecs ?? [],
      variants: normalizedVariants,
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

    const ids = rows.map((r) => r.id);
    const variants = ids.length
      ? await this.prisma.product_variants.findMany({ where: { product_id: { in: ids } } })
      : [];
    const variantsByProduct = variants.reduce<Record<string, any[]>>((acc, v) => {
      acc[v.product_id] = acc[v.product_id] || [];
      acc[v.product_id].push(v);
      return acc;
    }, {});

    return rows.map((row) => this.toClientProduct(row, variantsByProduct[row.id]));
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

    if (!row) return null;

    const variants = await this.prisma.product_variants.findMany({ where: { product_id: row.id } });

    return this.toClientProduct(row, variants);
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
        base_calculo_ibs_cbs: this.toNumberOrNull(data?.baseCalculoIBSCBS),
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

    await this.syncVariants(created.id, companyId, name, data?.variants);
    const variantRows = this.normalizeVariantRows(data?.variants, name, created.id, companyId);

    return this.toClientProduct(created, variantRows);
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
        ...(data?.baseCalculoIBSCBS !== undefined ? { base_calculo_ibs_cbs: this.toNumberOrNull(data.baseCalculoIBSCBS) } : {}),
        ...(data?.imageUrls !== undefined ? { image_urls: data.imageUrls } : {}),
        ...(data?.variants !== undefined ? { variants: data.variants } : {}),
        ...(data?.rawMaterials !== undefined ? { raw_materials: data.rawMaterials } : {}),
        ...(data?.stages !== undefined ? { stages: data.stages } : {}),
        ...(data?.technicalSpecs !== undefined ? { technical_specs: data.technicalSpecs } : {}),
        data: Object.keys(extra).length > 0 ? extra : undefined,
        updated_at: new Date(),
      },
    });

      const baseName = updated.name;
      await this.syncVariants(id, companyId, baseName, data?.variants ?? existing.variants ?? []);
      const variants = await this.prisma.product_variants.findMany({ where: { product_id: id } });

      return this.toClientProduct(updated, variants);
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const variants = await this.prisma.product_variants.findMany({
      where: {
        product_id: id,
        company_id: companyId,
      },
      select: { id: true },
    });

    if (variants.length) {
      const variantIds = variants.map((v) => v.id);
      const usageCount = await (this.prisma as any).production_orders.count({
        where: {
          variant_id: { in: variantIds },
          company_id: companyId,
        },
      }).catch(() => 0);

      if (usageCount > 0) {
        throw new BadRequestException(
          'Este produto está vinculado a ordens de produção e não pode ser removido.',
        );
      }
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
