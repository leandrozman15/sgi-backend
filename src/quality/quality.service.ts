import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class CalibrationService {
  private prisma: PrismaService;
  private tableExistsMap = new Map<string, boolean>();

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  private getTableByEntityType(entityType?: string) {
    switch (entityType) {
      case 'inspection':
        return 'quality_inspections';
      case 'complaint':
        return 'quality_complaints';
      case 'calibration':
      default:
        return 'calibrations';
    }
  }

  private getEntityTypeByTable(tableName: string) {
    switch (tableName) {
      case 'quality_inspections':
        return 'inspection';
      case 'quality_complaints':
        return 'complaint';
      case 'calibrations':
      default:
        return 'calibration';
    }
  }

  private async hasTable(tableName: string): Promise<boolean> {
    if (this.tableExistsMap.has(tableName)) {
      return this.tableExistsMap.get(tableName) || false;
    }

    const rows = await this.prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
      LIMIT 1
    `;

    const exists = rows.length > 0;
    this.tableExistsMap.set(tableName, exists);
    return exists;
  }

  private async listByTable(tableName: string, companyId: string, entityType: string) {
    if (!(await this.hasTable(tableName))) {
      return [];
    }

    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
      `SELECT * FROM ${tableName} WHERE company_id = $1 ORDER BY created_at DESC`,
      companyId,
    );

    return rows.map((row) => ({
      ...row,
      data: {
        ...(row?.data && typeof row.data === 'object' ? row.data : {}),
        entityType,
      },
    }));
  }

  private async findOneAcrossTables(id: string, companyId: string) {
    const tables = ['quality_inspections', 'quality_complaints', 'calibrations'];

    for (const tableName of tables) {
      if (!(await this.hasTable(tableName))) continue;

      const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
        `SELECT * FROM ${tableName} WHERE id = $1 AND company_id = $2 LIMIT 1`,
        id,
        companyId,
      );

      if (rows.length > 0) {
        const row = rows[0];
        const entityType = this.getEntityTypeByTable(tableName);
        return {
          tableName,
          row: {
            ...row,
            data: {
              ...(row?.data && typeof row.data === 'object' ? row.data : {}),
              entityType,
            },
          },
        };
      }
    }

    return null;
  }

  private normalizeValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).trim().toLowerCase();
  }

  private rowMatchesProduct(rowData: any, tokens: Set<string>) {
    if (!rowData || typeof rowData !== 'object' || tokens.size === 0) {
      return false;
    }

    const keyCandidates = [
      'productId',
      'produtoId',
      'product_id',
      'itemId',
      'relatedProductId',
      'codigoProduto',
      'productCode',
      'product_code',
      'sku',
      'code',
      'documentoAssociado',
      'productName',
      'nomeProduto',
      'nomeProdutoFinal',
      'instrumentId',
      'instrumentName',
    ];

    const directValues = keyCandidates
      .map((key) => this.normalizeValue((rowData as Record<string, any>)[key]))
      .filter(Boolean);

    if (directValues.some((value) => tokens.has(value))) {
      return true;
    }

    const productObject = (rowData as Record<string, any>).product;
    if (productObject && typeof productObject === 'object') {
      const nestedValues = ['id', 'code', 'name', 'sku']
        .map((key) => this.normalizeValue((productObject as Record<string, any>)[key]))
        .filter(Boolean);
      if (nestedValues.some((value) => tokens.has(value))) {
        return true;
      }
    }

    return false;
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return [];
    }

    const [inspections, complaints, calibrations] = await Promise.all([
      this.listByTable('quality_inspections', companyId, 'inspection'),
      this.listByTable('quality_complaints', companyId, 'complaint'),
      this.listByTable('calibrations', companyId, 'calibration'),
    ]);

    const rows: Array<Record<string, any>> = [...inspections, ...complaints, ...calibrations];

    return rows.sort((a, b) => {
      const aDate = new Date(a?.updated_at || a?.created_at || 0).getTime();
      const bDate = new Date(b?.updated_at || b?.created_at || 0).getTime();
      return bDate - aDate;
    });
  }

  async findByProduct(
    companyId: string,
    productId: string,
    options?: { productCode?: string; productName?: string; limit?: number },
  ) {
    if (!companyId) {
      return {
        productId,
        total: 0,
        inspections: 0,
        complaints: 0,
        calibrations: 0,
        items: [],
      };
    }

    const limit = Math.min(Math.max(Number(options?.limit ?? 300) || 300, 1), 1000);
    const tokens = new Set<string>();
    tokens.add(this.normalizeValue(productId));

    const normalizedCode = this.normalizeValue(options?.productCode);
    if (normalizedCode) {
      tokens.add(normalizedCode);
    }

    const normalizedName = this.normalizeValue(options?.productName);
    if (normalizedName) {
      tokens.add(normalizedName);
    }

    const [inspections, complaints, calibrations] = await Promise.all([
      this.listByTable('quality_inspections', companyId, 'inspection'),
      this.listByTable('quality_complaints', companyId, 'complaint'),
      this.listByTable('calibrations', companyId, 'calibration'),
    ]);

    const rows = [...inspections, ...complaints, ...calibrations]
      .filter((row) => this.rowMatchesProduct(row?.data, tokens))
      .sort((a, b) => {
        const aDate = new Date(a?.updated_at || a?.created_at || 0).getTime();
        const bDate = new Date(b?.updated_at || b?.created_at || 0).getTime();
        return bDate - aDate;
      })
      .slice(0, limit);

    const normalizedRows = rows.map((row) => ({
      ...row,
      createdAt: row?.data?.createdAt ?? row?.created_at ?? null,
      updatedAt: row?.data?.updatedAt ?? row?.updated_at ?? null,
    }));

    return {
      productId,
      total: normalizedRows.length,
      inspections: normalizedRows.filter((item) => item?.data?.entityType === 'inspection').length,
      complaints: normalizedRows.filter((item) => item?.data?.entityType === 'complaint').length,
      calibrations: normalizedRows.filter((item) => item?.data?.entityType === 'calibration').length,
      items: normalizedRows,
    };
  }

  async findById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    const found = await this.findOneAcrossTables(id, companyId);
    return found?.row ?? null;
  }

  async createItem(data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const entityType = data?.entityType || data?.data?.entityType || 'calibration';
    const tableName = this.getTableByEntityType(entityType);

    if (!(await this.hasTable(tableName))) {
      throw new NotFoundException(`Tabela ${tableName} não existe no banco atual`);
    }

    const payload = {
      ...(data?.data && typeof data.data === 'object' ? data.data : data ?? {}),
      entityType,
    };

    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
      `INSERT INTO ${tableName} (id, company_id, data, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      randomUUID(),
      companyId,
      payload,
    );

    return rows[0];
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.findOneAcrossTables(id, companyId);
    if (!existing) {
      throw new NotFoundException('Registro de qualidade não encontrado');
    }

    const payload = {
      ...(existing?.row?.data && typeof existing.row.data === 'object' ? existing.row.data : {}),
      ...(data?.data && typeof data.data === 'object' ? data.data : data ?? {}),
      entityType: this.getEntityTypeByTable(existing.tableName),
    };

    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
      `UPDATE ${existing.tableName}
       SET data = $1, updated_at = NOW()
       WHERE id = $2 AND company_id = $3
       RETURNING *`,
      payload,
      id,
      companyId,
    );

    if (rows.length === 0) {
      throw new NotFoundException('Registro de qualidade não encontrado');
    }

    return rows[0];
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.findOneAcrossTables(id, companyId);
    if (!existing) {
      throw new NotFoundException('Registro de qualidade não encontrado');
    }

    const rows = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `DELETE FROM ${existing.tableName} WHERE id = $1 AND company_id = $2 RETURNING id`,
      id,
      companyId,
    );

    if (rows.length === 0) {
      throw new NotFoundException('Registro de qualidade não encontrado');
    }

    return { id: rows[0].id };
  }
}
