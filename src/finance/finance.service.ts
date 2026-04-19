import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class FinanceService {
  private prisma: PrismaService;

  private readonly resourceToModel: Record<string, string> = {
    'bank-transactions': 'financial_bank_transactions',
    'tax-payments': 'tax_service_payments',
    'salary-payments': 'financial_salary_payments',
    'fixed-expenses': 'fixed_expenses',
  };

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
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
    const modelName = this.resourceToModel[resource];

    if (!modelName) {
      throw new NotFoundException(`Recurso financeiro inválido: ${resource}`);
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

  async findOneByResource(resource: string, id: string, companyId: string) {
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

  async createByResource(resource: string, payload: any, companyId: string) {
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

  async updateByResource(resource: string, id: string, payload: any, companyId: string) {
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
      throw new NotFoundException('Registro financeiro não encontrado');
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

  async deleteByResource(resource: string, id: string, companyId: string) {
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
      throw new NotFoundException('Registro financeiro não encontrado');
    }

    return { id };
  }
}
