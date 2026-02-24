import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

type AccountingResource =
  | 'fiscal-periods'
  | 'chart-accounts'
  | 'cost-centers'
  | 'journal-entries'
  | 'journal-entry-lines'
  | 'accounts-receivable'
  | 'accounts-payable'
  | 'tax-apportionments';

@Injectable()
export class AccountingService {
  private prisma: PrismaClient;

  private readonly resourceToModel: Record<AccountingResource, string> = {
    'fiscal-periods': 'accounting_fiscal_periods',
    'chart-accounts': 'accounting_chart_accounts',
    'cost-centers': 'accounting_cost_centers',
    'journal-entries': 'accounting_journal_entries',
    'journal-entry-lines': 'accounting_journal_entry_lines',
    'accounts-receivable': 'accounting_accounts_receivable',
    'accounts-payable': 'accounting_accounts_payable',
    'tax-apportionments': 'fiscal_tax_apportionments',
  };

  constructor() {
    this.prisma = new PrismaClient();
  }

  private toSnakeCase(input: string) {
    return input.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
  }

  private normalizePayload(payload: any) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return payload;
    }

    const normalized: Record<string, any> = {};

    for (const [key, value] of Object.entries(payload)) {
      const normalizedKey = key.includes('_') ? key : this.toSnakeCase(key);
      normalized[normalizedKey] = value;
    }

    return normalized;
  }

  private getDelegate(resource: string): any {
    const modelName = this.resourceToModel[resource as AccountingResource];

    if (!modelName) {
      throw new NotFoundException(`Recurso contábil/fiscal inválido: ${resource}`);
    }

    const delegate = (this.prisma as any)[modelName];

    if (!delegate) {
      throw new NotFoundException(`Model Prisma não encontrado para recurso: ${resource}`);
    }

    return delegate;
  }

  async findByResource(resource: string, companyId: string, limit = 200) {
    if (!companyId) {
      return [];
    }

    const delegate = this.getDelegate(resource);

    return delegate.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
      take: Math.max(1, Math.min(limit || 200, 1000)),
    });
  }

  async findById(resource: string, id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    const delegate = this.getDelegate(resource);

    return delegate.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });
  }

  async createItem(resource: string, payload: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const delegate = this.getDelegate(resource);
    const data = this.normalizePayload(payload);

    return delegate.create({
      data: {
        id: data?.id ?? randomUUID(),
        ...data,
        company_id: companyId,
      },
    });
  }

  async updateItem(resource: string, id: string, payload: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const delegate = this.getDelegate(resource);

    const existing = await delegate.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Registro não encontrado');
    }

    const data = this.normalizePayload(payload);

    return delegate.update({
      where: { id },
      data: {
        ...data,
        company_id: companyId,
      },
    });
  }

  async deleteItem(resource: string, id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const delegate = this.getDelegate(resource);

    const deleted = await delegate.deleteMany({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Registro não encontrado');
    }

    return { id };
  }
}
