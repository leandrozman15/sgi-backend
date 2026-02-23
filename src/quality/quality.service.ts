import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class CalibrationService {
  private prisma: PrismaClient;
  private tableExists: boolean | null = null;

  constructor() {
    this.prisma = new PrismaClient();
  }

  private async hasTable(): Promise<boolean> {
    if (this.tableExists !== null) {
      return this.tableExists;
    }

    const rows = await this.prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'calibrations'
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
      `SELECT * FROM calibrations WHERE company_id = ${companyId} ORDER BY created_at DESC`;
  }

  async findById(id: string, companyId: string) {
    if (!companyId || !(await this.hasTable())) {
      return null;
    }

    const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>
      `SELECT * FROM calibrations WHERE id = ${id} AND company_id = ${companyId} LIMIT 1`;
    return rows[0] ?? null;
  }

  async createItem(data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }
    if (!(await this.hasTable())) {
      throw new NotFoundException('Tabela calibrations não existe no banco atual');
    }

    const payload = data?.data ?? data ?? null;
    const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>
      `
        INSERT INTO calibrations (id, company_id, data, created_at, updated_at)
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
      throw new NotFoundException('Tabela calibrations não existe no banco atual');
    }

    const payload = data?.data ?? data ?? null;
    const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>
      `
        UPDATE calibrations
        SET data = ${payload}, updated_at = NOW()
        WHERE id = ${id} AND company_id = ${companyId}
        RETURNING *
      `;

    if (rows.length === 0) {
      throw new NotFoundException('Calibração não encontrada');
    }

    return rows[0];
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }
    if (!(await this.hasTable())) {
      throw new NotFoundException('Tabela calibrations não existe no banco atual');
    }

    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>
      `DELETE FROM calibrations WHERE id = ${id} AND company_id = ${companyId} RETURNING id`;

    if (rows.length === 0) {
      throw new NotFoundException('Calibração não encontrada');
    }

    return { id: rows[0].id };
  }
}
