import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class SubscriptionHistoryService {
  private prisma: PrismaService;
  private tableExists: boolean | null = null;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  private async hasTable(): Promise<boolean> {
    if (this.tableExists !== null) {
      return this.tableExists;
    }

    const rows = await this.prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'subscription_history'
      LIMIT 1
    `;

    this.tableExists = rows.length > 0;
    return this.tableExists;
  }

  async findByCompany(companyId: string) {
    if (!companyId || !(await this.hasTable())) {
      return [];
    }

    return this.prisma.$queryRaw<Array<Record<string, any>>>
      `SELECT * FROM subscription_history WHERE company_id = ${companyId} ORDER BY created_at DESC`;
  }

  async findById(id: string, companyId: string) {
    if (!companyId || !(await this.hasTable())) {
      return null;
    }

    const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>
      `SELECT * FROM subscription_history WHERE id = ${id} AND company_id = ${companyId} LIMIT 1`;
    return rows[0] ?? null;
  }

  async createItem(data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }
    if (!(await this.hasTable())) {
      throw new NotFoundException('Tabela subscription_history não existe no banco atual');
    }

    const payload = data?.data ?? data ?? null;
    const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>
      `
        INSERT INTO subscription_history (id, company_id, data, created_at, updated_at)
        VALUES (${randomUUID()}, ${companyId}, ${payload}, NOW(), NOW())
        RETURNING *
      `;

    return rows[0];
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }
    if (!(await this.hasTable())) {
      throw new NotFoundException('Tabela subscription_history não existe no banco atual');
    }

    const payload = data?.data ?? data ?? null;
    const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>
      `
        UPDATE subscription_history
        SET data = ${payload}, updated_at = NOW()
        WHERE id = ${id} AND company_id = ${companyId}
        RETURNING *
      `;

    if (rows.length === 0) {
      throw new NotFoundException('Histórico de assinatura não encontrado');
    }

    return rows[0];
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }
    if (!(await this.hasTable())) {
      throw new NotFoundException('Tabela subscription_history não existe no banco atual');
    }

    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>
      `DELETE FROM subscription_history WHERE id = ${id} AND company_id = ${companyId} RETURNING id`;

    if (rows.length === 0) {
      throw new NotFoundException('Histórico de assinatura não encontrado');
    }

    return { id: rows[0].id };
  }
}
