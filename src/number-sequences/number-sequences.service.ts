import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

// Catalog of known sequences. Each entry describes the default settings AND
// how to compute the "real" max currently in use (and the last user/date of
// emission) by scanning the underlying table.
type ScanResult = { max: number; lastUsedAt: Date | null; lastUsedBy: string | null };

@Injectable()
export class NumberSequenceService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── catalog ──────────────────────────────────────────────────────────
  readonly catalog: Record<
    string,
    {
      name: string;
      defaultPrefix: string;
      defaultPadding: number;
      scan?: (companyId: string) => Promise<ScanResult>;
    }
  > = {
    orcamento: {
      name: 'Orçamento',
      defaultPrefix: 'ORC-',
      defaultPadding: 5,
      scan: (companyId) => this.scanSales(companyId, 'orcamentoNumero'),
    },
    customer_order: {
      name: 'Orden de Pedido',
      defaultPrefix: 'OP-',
      defaultPadding: 5,
      scan: (companyId) => this.scanCustomerOrders(companyId),
    },
    production_order: {
      name: 'Ordem de Produção',
      defaultPrefix: 'OP-',
      defaultPadding: 5,
      scan: (companyId) => this.scanProductionOrders(companyId),
    },
    purchase_order: {
      name: 'Ordem de Compra',
      defaultPrefix: 'OC-',
      defaultPadding: 5,
      scan: (companyId) => this.scanPurchaseOrders(companyId),
    },
    expedition: {
      name: 'Expedição',
      defaultPrefix: 'EXP-',
      defaultPadding: 5,
      scan: (companyId) => this.scanExpeditions(companyId),
    },
  };

  // NFe is per series — built dynamically.
  private async scanNfe(companyId: string, series: string): Promise<ScanResult> {
    const rows = await this.prisma.sales_fiscal_documents.findMany({
      where: {
        company_id: companyId,
        document_type: 'NFE',
        status: 'EMITIDA',
        series,
        access_key: { not: null },
        document_number: { not: null },
      },
      select: { document_number: true, created_at: true, data: true },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    let max = 0;
    let lastUsedAt: Date | null = null;
    let lastUsedBy: string | null = null;
    for (const r of rows) {
      const n = Number(r.document_number);
      if (Number.isFinite(n) && n > max) max = n;
      if (!lastUsedAt && r.created_at) {
        lastUsedAt = r.created_at;
        lastUsedBy = (r as any)?.data?.createdBy ?? null;
      }
    }
    return { max, lastUsedAt, lastUsedBy };
  }

  // ─── scanners for each entity ────────────────────────────────────────
  private extractNumber(value: any): number {
    if (!value) return 0;
    const tail = String(value).split('-').pop() || '';
    const n = Number(tail.replace(/\D/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  private async scanSales(companyId: string, field: string): Promise<ScanResult> {
    const rows = await this.prisma.sales.findMany({
      where: { companyId, deletedAt: null },
      select: { data: true, updatedAt: true, createdAt: true },
      take: 2000,
    });
    let max = 0;
    let lastUsedAt: Date | null = null;
    let lastUsedBy: string | null = null;
    for (const r of rows) {
      const v = (r as any)?.data?.[field];
      const n = this.extractNumber(v);
      if (n > max) {
        max = n;
        lastUsedAt = r.updatedAt || r.createdAt || null;
        lastUsedBy = (r as any)?.data?.createdBy || (r as any)?.data?.userId || null;
      }
    }
    return { max, lastUsedAt, lastUsedBy };
  }

  private async scanCustomerOrders(companyId: string): Promise<ScanResult> {
    const rows = await this.prisma.customer_orders.findMany({
      where: { companyId, deletedAt: null },
      select: { data: true, updatedAt: true, createdAt: true },
      take: 2000,
    });
    let max = 0;
    let lastUsedAt: Date | null = null;
    let lastUsedBy: string | null = null;
    for (const r of rows) {
      const v = (r as any)?.data?.numero;
      const n = this.extractNumber(v);
      if (n > max) {
        max = n;
        lastUsedAt = r.updatedAt || r.createdAt || null;
        lastUsedBy = (r as any)?.data?.createdBy || null;
      }
    }
    return { max, lastUsedAt, lastUsedBy };
  }

  private async scanProductionOrders(companyId: string): Promise<ScanResult> {
    const rows = await this.prisma.production_orders.findMany({
      where: { company_id: companyId },
      select: { number: true, updated_at: true, created_at: true, data: true },
      orderBy: { created_at: 'desc' },
      take: 2000,
    });
    let max = 0;
    let lastUsedAt: Date | null = null;
    let lastUsedBy: string | null = null;
    for (const r of rows) {
      const n = this.extractNumber(r.number);
      if (n > max) {
        max = n;
        lastUsedAt = r.updated_at || r.created_at || null;
        lastUsedBy = (r as any)?.data?.createdBy || null;
      }
    }
    return { max, lastUsedAt, lastUsedBy };
  }

  private async scanPurchaseOrders(companyId: string): Promise<ScanResult> {
    const rows = await this.prisma.purchase_orders.findMany({
      where: { company_id: companyId },
      select: { numero_ordem: true, updated_at: true, created_at: true, data: true },
      orderBy: { created_at: 'desc' },
      take: 2000,
    });
    let max = 0;
    let lastUsedAt: Date | null = null;
    let lastUsedBy: string | null = null;
    for (const r of rows) {
      const v = r.numero_ordem || (r as any)?.data?.numero;
      const n = this.extractNumber(v);
      if (n > max) {
        max = n;
        lastUsedAt = r.updated_at || r.created_at || null;
        lastUsedBy = (r as any)?.data?.createdBy || null;
      }
    }
    return { max, lastUsedAt, lastUsedBy };
  }

  private async scanExpeditions(companyId: string): Promise<ScanResult> {
    const rows = await this.prisma.expeditions.findMany({
      where: { companyId, deletedAt: null },
      select: { numeroGuia: true, updatedAt: true, createdAt: true, createdBy: true },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });
    let max = 0;
    let lastUsedAt: Date | null = null;
    let lastUsedBy: string | null = null;
    for (const r of rows) {
      const n = this.extractNumber(r.numeroGuia);
      if (n > max) {
        max = n;
        lastUsedAt = r.updatedAt || r.createdAt || null;
        lastUsedBy = r.createdBy || null;
      }
    }
    return { max, lastUsedAt, lastUsedBy };
  }

  // ─── public API ──────────────────────────────────────────────────────

  private format(prefix: string, padding: number, suffix: string, n: number) {
    return `${prefix}${String(n).padStart(Math.max(0, padding), '0')}${suffix}`;
  }

  /**
   * Lists all known sequences for a company, augmented with live max from
   * underlying tables and last user/date.
   */
  async listAll(companyId: string) {
    if (!companyId) return [];
    const rows = await this.prisma.number_sequences.findMany({
      where: { companyId },
      orderBy: { key: 'asc' },
    });
    const byKey = new Map(rows.map((r) => [r.key, r]));

    // Build catalog rows (static + NFe series detected from existing seqs and from fiscal docs)
    const result: any[] = [];
    for (const [key, def] of Object.entries(this.catalog)) {
      const reg = byKey.get(key);
      const scan = def.scan ? await def.scan(companyId).catch(() => null) : null;
      const liveMax = scan?.max ?? 0;
      const current = Math.max(reg?.currentNumber ?? 0, liveMax);
      result.push({
        id: reg?.id || null,
        key,
        name: reg?.name || def.name,
        prefix: reg?.prefix ?? def.defaultPrefix,
        suffix: reg?.suffix ?? '',
        padding: reg?.padding ?? def.defaultPadding,
        currentNumber: current,
        overrideNumber: reg?.currentNumber ?? null,
        liveMax,
        lastUsedAt: scan?.lastUsedAt || reg?.lastUsedAt || null,
        lastUsedBy: scan?.lastUsedBy || reg?.lastUsedBy || null,
        nextNumber: current + 1,
        nextFormatted: this.format(
          reg?.prefix ?? def.defaultPrefix,
          reg?.padding ?? def.defaultPadding,
          reg?.suffix ?? '',
          current + 1,
        ),
        builtin: true,
      });
    }

    // NFe per series: discover series from sales_fiscal_documents
    const nfeSeriesRows = await this.prisma.sales_fiscal_documents.findMany({
      where: { company_id: companyId, document_type: 'NFE' },
      select: { series: true },
      distinct: ['series'],
    });
    const seenSeries = new Set<string>();
    for (const r of nfeSeriesRows) {
      const s = String(r.series ?? '1');
      seenSeries.add(s);
    }
    for (const r of rows) {
      if (r.key.startsWith('nfe:')) seenSeries.add(r.key.slice(4));
    }
    if (seenSeries.size === 0) seenSeries.add('1');

    for (const series of Array.from(seenSeries).sort()) {
      const key = `nfe:${series}`;
      const reg = byKey.get(key);
      const scan = await this.scanNfe(companyId, series).catch(() => null);
      const liveMax = scan?.max ?? 0;
      const current = Math.max(reg?.currentNumber ?? 0, liveMax);
      result.push({
        id: reg?.id || null,
        key,
        name: reg?.name || `NFe — Série ${series}`,
        prefix: reg?.prefix ?? '',
        suffix: reg?.suffix ?? '',
        padding: reg?.padding ?? 1,
        currentNumber: current,
        overrideNumber: reg?.currentNumber ?? null,
        liveMax,
        lastUsedAt: scan?.lastUsedAt || reg?.lastUsedAt || null,
        lastUsedBy: scan?.lastUsedBy || reg?.lastUsedBy || null,
        nextNumber: current + 1,
        nextFormatted: this.format(
          reg?.prefix ?? '',
          reg?.padding ?? 1,
          reg?.suffix ?? '',
          current + 1,
        ),
        builtin: true,
        series,
      });
    }

    // Custom (non-catalog, non-nfe) sequences created by the user
    for (const r of rows) {
      if (this.catalog[r.key] || r.key.startsWith('nfe:')) continue;
      const liveMax = 0;
      const current = r.currentNumber;
      result.push({
        id: r.id,
        key: r.key,
        name: r.name,
        prefix: r.prefix,
        suffix: r.suffix,
        padding: r.padding,
        currentNumber: current,
        overrideNumber: current,
        liveMax,
        lastUsedAt: r.lastUsedAt,
        lastUsedBy: r.lastUsedBy,
        nextNumber: current + 1,
        nextFormatted: this.format(r.prefix, r.padding, r.suffix, current + 1),
        builtin: false,
      });
    }

    return result;
  }

  async upsert(
    companyId: string,
    key: string,
    dto: {
      name?: string;
      prefix?: string;
      suffix?: string;
      padding?: number;
      currentNumber?: number;
    },
  ) {
    if (!companyId || !key) throw new NotFoundException('companyId and key are required');
    const def = this.catalog[key];
    const nameDefault = def?.name || key;
    const prefixDefault = def?.defaultPrefix || '';
    const paddingDefault = def?.defaultPadding ?? 5;
    const existing = await this.prisma.number_sequences.findUnique({
      where: { companyId_key: { companyId, key } } as any,
    });
    if (existing) {
      return this.prisma.number_sequences.update({
        where: { id: existing.id },
        data: {
          name: dto.name ?? existing.name,
          prefix: dto.prefix ?? existing.prefix,
          suffix: dto.suffix ?? existing.suffix,
          padding: dto.padding ?? existing.padding,
          currentNumber:
            typeof dto.currentNumber === 'number' ? dto.currentNumber : existing.currentNumber,
        },
      });
    }
    return this.prisma.number_sequences.create({
      data: {
        companyId,
        key,
        name: dto.name ?? nameDefault,
        prefix: dto.prefix ?? prefixDefault,
        suffix: dto.suffix ?? '',
        padding: dto.padding ?? paddingDefault,
        currentNumber: dto.currentNumber ?? 0,
      },
    });
  }

  async remove(companyId: string, key: string) {
    const existing = await this.prisma.number_sequences.findUnique({
      where: { companyId_key: { companyId, key } } as any,
    });
    if (!existing) throw new NotFoundException('Sequence not found');
    await this.prisma.number_sequences.delete({ where: { id: existing.id } });
    return { ok: true };
  }
}
