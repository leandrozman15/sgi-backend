import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';

interface ListParams {
  limit?: number;
  status?: string;
  fornecedorId?: string;
  from?: string;
  to?: string;
}

const ALLOWED_STATUS = new Set(['Pendente', 'Recebido', 'Cancelado']);

@Injectable()
export class RecepcaoService {
  private readonly logger = new Logger(RecepcaoService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ───────── queries ─────────

  async findByCompany(companyId: string, params: ListParams = {}) {
    if (!companyId) return [];
    const take = Math.min(Math.max(Number(params.limit) || 200, 1), 1000);
    const where: any = { companyId, deletedAt: null };
    if (params.status) where.status = params.status;
    if (params.fornecedorId) where.fornecedorId = params.fornecedorId;
    if (params.from || params.to) {
      where.dataEmissao = {};
      if (params.from) where.dataEmissao.gte = new Date(params.from);
      if (params.to) where.dataEmissao.lte = new Date(params.to);
    }

    const rows = await this.prisma.recepcoes.findMany({
      where,
      include: { itens: { orderBy: { ordem: 'asc' } } },
      orderBy: { dataEmissao: 'desc' },
      take,
    });
    return rows.map((row) => this.serialize(row));
  }

  async findById(id: string, companyId: string) {
    if (!companyId) return null;
    const row = await this.prisma.recepcoes.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { itens: { orderBy: { ordem: 'asc' } } },
    });
    if (!row) throw new NotFoundException('Recepção não encontrada.');
    return this.serialize(row);
  }

  // ───────── mutations ─────────

  async createItem(companyId: string, body: any) {
    if (!companyId) throw new BadRequestException('companyId é obrigatório.');
    this.validateHeader(body);
    const itensInput = this.normalizeItens(body?.itens);
    if (itensInput.length === 0) {
      throw new BadRequestException('Informe ao menos um item.');
    }

    const totals = this.computeTotals(itensInput, body);
    const id = randomUUID();

    try {
      await this.prisma.recepcoes.create({
        data: {
          id,
          companyId,
          fornecedorId: String(body.fornecedorId),
          fornecedorNome: String(body.fornecedorNome ?? 'Fornecedor'),
          ordemCompraId: body.ordemCompraId ?? null,
          ordemCompraNumero: body.ordemCompraNumero ?? null,
          tipoDocumento: body.tipoDocumento ?? 'NF',
          numeroDocumento: String(body.numeroDocumento),
          chaveAcesso: this.sanitizeChave(body.chaveAcesso),
          dataEmissao: body.dataEmissao
            ? new Date(body.dataEmissao)
            : new Date(),
          dataVencimento: body.dataVencimento
            ? new Date(body.dataVencimento)
            : null,
          moeda: body.moeda ?? 'BRL',
          transportadoraId: body.transportadoraId ?? null,
          transportadoraNome: body.transportadoraNome ?? null,
          modalidadeFrete: body.modalidadeFrete ?? null,
          valorProdutos: totals.valorProdutos,
          valorDesconto: totals.valorDesconto,
          valorFrete: totals.valorFrete,
          valorSeguro: totals.valorSeguro,
          outrasDespesas: totals.outrasDespesas,
          valorImpostos: totals.valorImpostos,
          valorTotalNF: totals.valorTotalNF,
          status: this.normalizeStatus(body.status) ?? 'Pendente',
          observacoes: body.observacoes ?? null,
          xmlNfe: body.xmlNfe ?? null,
          createdBy: body.createdBy ?? null,
          itens: {
            create: itensInput.map((it, idx) => ({
              id: randomUUID(),
              companyId,
              ordem: idx,
              ...this.itemDbPayload(it),
            })),
          },
        },
      });

      return this.findById(id, companyId);
    } catch (err: any) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe uma recepção com essa chave de acesso para esta empresa.',
        );
      }
      throw err;
    }
  }

  async updateItem(companyId: string, id: string, body: any) {
    const existing = await this.assertExists(companyId, id);

    if (existing.status === 'Recebido' && body?.itens) {
      throw new BadRequestException(
        'Recepção já confirmada — itens não podem ser editados. Cancele antes de alterar.',
      );
    }

    this.validateHeader({ ...existing, ...body });
    const itensInput = body?.itens
      ? this.normalizeItens(body.itens)
      : undefined;
    const totals = itensInput
      ? this.computeTotals(itensInput, body)
      : this.computeTotals(this.normalizeItens(existing.itens || []), body);

    await this.prisma.$transaction(async (tx) => {
      await tx.recepcoes.update({
        where: { id },
        data: {
          fornecedorId: body.fornecedorId ?? existing.fornecedorId,
          fornecedorNome: body.fornecedorNome ?? existing.fornecedorNome,
          ordemCompraId:
            'ordemCompraId' in body
              ? body.ordemCompraId
              : existing.ordemCompraId,
          ordemCompraNumero:
            'ordemCompraNumero' in body
              ? body.ordemCompraNumero
              : existing.ordemCompraNumero,
          tipoDocumento: body.tipoDocumento ?? existing.tipoDocumento,
          numeroDocumento: body.numeroDocumento ?? existing.numeroDocumento,
          chaveAcesso:
            'chaveAcesso' in body
              ? this.sanitizeChave(body.chaveAcesso)
              : existing.chaveAcesso,
          dataEmissao: body.dataEmissao
            ? new Date(body.dataEmissao)
            : existing.dataEmissao,
          dataVencimento:
            'dataVencimento' in body
              ? body.dataVencimento
                ? new Date(body.dataVencimento)
                : null
              : existing.dataVencimento,
          moeda: body.moeda ?? existing.moeda,
          transportadoraId:
            'transportadoraId' in body
              ? body.transportadoraId
              : existing.transportadoraId,
          transportadoraNome:
            'transportadoraNome' in body
              ? body.transportadoraNome
              : existing.transportadoraNome,
          modalidadeFrete:
            'modalidadeFrete' in body
              ? body.modalidadeFrete
              : existing.modalidadeFrete,
          valorProdutos: totals.valorProdutos,
          valorDesconto: totals.valorDesconto,
          valorFrete: totals.valorFrete,
          valorSeguro: totals.valorSeguro,
          outrasDespesas: totals.outrasDespesas,
          valorImpostos: totals.valorImpostos,
          valorTotalNF: totals.valorTotalNF,
          status: this.normalizeStatus(body.status) ?? existing.status,
          observacoes:
            'observacoes' in body ? body.observacoes : existing.observacoes,
          xmlNfe: 'xmlNfe' in body ? body.xmlNfe : existing.xmlNfe,
        },
      });

      if (itensInput) {
        await tx.recepcao_itens.deleteMany({ where: { recepcaoId: id } });
        if (itensInput.length > 0) {
          await tx.recepcao_itens.createMany({
            data: itensInput.map((it, idx) => ({
              id: randomUUID(),
              recepcaoId: id,
              companyId,
              ordem: idx,
              ...this.itemDbPayload(it),
            })),
          });
        }
      }
    });

    return this.findById(id, companyId);
  }

  async patchStatus(companyId: string, id: string, status: string) {
    const existing = await this.assertExists(companyId, id);
    const next = this.normalizeStatus(status);
    if (!next) throw new BadRequestException('Status inválido.');
    if (existing.status === next) return this.serialize(existing);

    await this.prisma.recepcoes.update({
      where: { id },
      data: { status: next },
    });
    return this.findById(id, companyId);
  }

  async deleteItem(companyId: string, id: string) {
    const existing = await this.assertExists(companyId, id);
    if (existing.status === 'Recebido') {
      throw new BadRequestException(
        'Recepção confirmada não pode ser removida. Cancele antes.',
      );
    }
    await this.prisma.recepcoes.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  // ───────── helpers ─────────

  private async assertExists(companyId: string, id: string) {
    const existing = await this.prisma.recepcoes.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { itens: true },
    });
    if (!existing) throw new NotFoundException('Recepção não encontrada.');
    return existing;
  }

  private validateHeader(body: any) {
    if (!body?.fornecedorId) {
      throw new BadRequestException('fornecedorId é obrigatório.');
    }
    if (!body?.numeroDocumento) {
      throw new BadRequestException('numeroDocumento é obrigatório.');
    }
    const chave = this.sanitizeChave(body?.chaveAcesso);
    if (chave && chave.length !== 44) {
      throw new BadRequestException(
        'Chave de acesso da NF-e deve ter 44 dígitos.',
      );
    }
  }

  private sanitizeChave(value: any): string | null {
    if (!value) return null;
    const digits = String(value).replace(/\D/g, '');
    return digits || null;
  }

  private normalizeStatus(value: any): string | null {
    if (!value) return null;
    const s = String(value);
    return ALLOWED_STATUS.has(s) ? s : null;
  }

  private normalizeItens(itens: any): any[] {
    if (!Array.isArray(itens)) return [];
    return itens.map((raw: any) => {
      const entryType = raw?.entryType === 'avulso' ? 'avulso' : 'catalogo';
      const tipo = raw?.tipo === 'materia-prima' ? 'materia-prima' : 'produto';
      const quantidade = this.num(raw?.quantidade);
      const valorUnitario = this.num(raw?.valorUnitario);
      const valorDesconto = this.num(raw?.valorDesconto);
      const valorFrete = this.num(raw?.valorFrete);
      const valorSeguro = this.num(raw?.valorSeguro);
      const outrasDespesas = this.num(raw?.outrasDespesas);
      const aliquota = this.num(raw?.aliquotaImpostos ?? raw?.impostos);
      const icmsValor = this.num(raw?.icmsValor ?? raw?.icms);
      const ipiValor = this.num(raw?.ipiValor ?? raw?.ipi);
      const base = quantidade * valorUnitario;
      // ICMS é "por dentro" (já incluído no preço), apenas IPI e outros impostos % somam.
      const valorImpostos = this.round(
        raw?.valorImpostos != null
          ? this.num(raw.valorImpostos)
          : base * (aliquota / 100) + ipiValor,
      );
      const subtotal = this.round(
        base -
          valorDesconto +
          valorFrete +
          valorSeguro +
          outrasDespesas +
          valorImpostos,
      );

      const detalheBase =
        raw?.impostosDetalhe && typeof raw.impostosDetalhe === 'object'
          ? { ...raw.impostosDetalhe }
          : {};
      const impostosDetalhe = {
        ...detalheBase,
        icms: icmsValor,
        ipi: ipiValor,
      };

      return {
        entryType,
        tipo,
        itemId: raw?.itemId || null,
        descricao: String(raw?.descricao || raw?.itemName || '').slice(0, 500),
        ncm: raw?.ncm || null,
        csosn: raw?.csosn || null,
        cfop: raw?.cfop || null,
        cst: raw?.cst || null,
        unidade: raw?.unidade || null,
        quantidade,
        valorUnitario,
        valorDesconto,
        valorFrete,
        valorSeguro,
        outrasDespesas,
        aliquotaImpostos: aliquota,
        valorImpostos,
        impostosDetalhe,
        loteFabricante: raw?.loteFabricante || null,
        locationCode: raw?.locationCode || null,
        subtotal,
      };
    });
  }

  private itemDbPayload(it: any) {
    return {
      entryType: it.entryType,
      tipo: it.tipo,
      itemId: it.itemId,
      descricao: it.descricao,
      ncm: it.ncm,
      csosn: it.csosn,
      cfop: it.cfop,
      cst: it.cst,
      unidade: it.unidade,
      quantidade: it.quantidade,
      valorUnitario: it.valorUnitario,
      valorDesconto: it.valorDesconto,
      valorFrete: it.valorFrete,
      valorSeguro: it.valorSeguro,
      outrasDespesas: it.outrasDespesas,
      aliquotaImpostos: it.aliquotaImpostos,
      valorImpostos: it.valorImpostos,
      impostosDetalhe: it.impostosDetalhe,
      loteFabricante: it.loteFabricante,
      locationCode: it.locationCode,
      subtotal: it.subtotal,
    };
  }

  private computeTotals(itens: any[], body: any) {
    const valorProdutos = this.round(
      itens.reduce(
        (acc, it) => acc + this.num(it.quantidade) * this.num(it.valorUnitario),
        0,
      ),
    );
    const itensDesconto = itens.reduce(
      (acc, it) => acc + this.num(it.valorDesconto),
      0,
    );
    const itensFrete = itens.reduce(
      (acc, it) => acc + this.num(it.valorFrete),
      0,
    );
    const itensSeguro = itens.reduce(
      (acc, it) => acc + this.num(it.valorSeguro),
      0,
    );
    const itensOutras = itens.reduce(
      (acc, it) => acc + this.num(it.outrasDespesas),
      0,
    );
    const valorImpostos = this.round(
      itens.reduce((acc, it) => acc + this.num(it.valorImpostos), 0),
    );

    const valorDesconto = this.round(
      body?.valorDesconto != null
        ? this.num(body.valorDesconto)
        : itensDesconto,
    );
    const valorFrete = this.round(
      body?.valorFrete != null ? this.num(body.valorFrete) : itensFrete,
    );
    const valorSeguro = this.round(
      body?.valorSeguro != null ? this.num(body.valorSeguro) : itensSeguro,
    );
    const outrasDespesas = this.round(
      body?.outrasDespesas != null
        ? this.num(body.outrasDespesas)
        : itensOutras,
    );

    const valorTotalNF = this.round(
      valorProdutos -
        valorDesconto +
        valorFrete +
        valorSeguro +
        outrasDespesas +
        valorImpostos,
    );

    return {
      valorProdutos,
      valorDesconto,
      valorFrete,
      valorSeguro,
      outrasDespesas,
      valorImpostos,
      valorTotalNF,
    };
  }

  private num(v: any): number {
    const n =
      typeof v === 'number'
        ? v
        : parseFloat(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  private round(v: number): number {
    return Math.round((v + Number.EPSILON) * 100) / 100;
  }

  private serialize = (row: any) => {
    if (!row) return row;
    return {
      id: row.id,
      fornecedorId: row.fornecedorId,
      fornecedorNome: row.fornecedorNome,
      ordemCompraId: row.ordemCompraId ?? undefined,
      ordemCompraNumero: row.ordemCompraNumero ?? undefined,
      tipoDocumento: row.tipoDocumento,
      numeroDocumento: row.numeroDocumento,
      chaveAcesso: row.chaveAcesso ?? undefined,
      dataEmissao: row.dataEmissao?.toISOString?.() ?? row.dataEmissao,
      dataVencimento:
        row.dataVencimento?.toISOString?.() ??
        row.dataVencimento ??
        undefined,
      moeda: row.moeda,
      transportadoraId: row.transportadoraId ?? undefined,
      transportadoraNome: row.transportadoraNome ?? undefined,
      modalidadeFrete: row.modalidadeFrete ?? undefined,
      valorProdutos: Number(row.valorProdutos),
      valorDesconto: Number(row.valorDesconto),
      valorFrete: Number(row.valorFrete),
      valorSeguro: Number(row.valorSeguro),
      outrasDespesas: Number(row.outrasDespesas),
      valorImpostos: Number(row.valorImpostos),
      valorTotalNF: Number(row.valorTotalNF),
      // aliases legados
      valorTotal: Number(row.valorProdutos),
      valorTotalGeral: Number(row.valorTotalNF),
      valorTotalImpostos: Number(row.valorImpostos),
      status: row.status,
      observacoes: row.observacoes ?? undefined,
      stockUpdated: !!row.stockUpdated,
      itens: Array.isArray(row.itens)
        ? row.itens.map((it: any) => {
            const detalhe = it.impostosDetalhe ?? {};
            return {
              id: it.id,
              ordem: it.ordem,
              entryType: it.entryType,
              tipo: it.tipo,
              itemId: it.itemId ?? undefined,
              descricao: it.descricao,
              ncm: it.ncm ?? undefined,
              csosn: it.csosn ?? undefined,
              cfop: it.cfop ?? undefined,
              cst: it.cst ?? undefined,
              unidade: it.unidade ?? undefined,
              quantidade: Number(it.quantidade),
              valorUnitario: Number(it.valorUnitario),
              valorDesconto: Number(it.valorDesconto),
              valorFrete: Number(it.valorFrete),
              valorSeguro: Number(it.valorSeguro),
              outrasDespesas: Number(it.outrasDespesas),
              aliquotaImpostos: Number(it.aliquotaImpostos),
              impostos: Number(it.aliquotaImpostos),
              valorImpostos: Number(it.valorImpostos),
              icmsValor: Number(detalhe?.icms ?? 0),
              ipiValor: Number(detalhe?.ipi ?? 0),
              impostosDetalhe: detalhe,
              loteFabricante: it.loteFabricante ?? undefined,
              locationCode: it.locationCode ?? undefined,
              subtotal: Number(it.subtotal),
            };
          })
        : [],
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
      updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
      createdBy: row.createdBy ?? undefined,
    };
  };
}
