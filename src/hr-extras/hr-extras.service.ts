import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class WorkAccidentService {
  private prisma: PrismaClient;
  private tableExistsCache = new Map<string, boolean>();
  private readonly legacyTable = 'work_accidents';

  constructor() {
    this.prisma = new PrismaClient();
  }

  private async hasTable(tableName: string): Promise<boolean> {
    if (this.tableExistsCache.has(tableName)) {
      return this.tableExistsCache.get(tableName) === true;
    }

    const rows = await this.prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
      LIMIT 1
    `;

    const exists = rows.length > 0;
    this.tableExistsCache.set(tableName, exists);
    return exists;
  }

  private normalizeType(type: string): string {
    if (type === 'vacation') return 'vacation';
    if (type === 'attendance') return 'attendance';
    if (type === 'epi') return 'epi';
    return 'accident';
  }

  private tableForType(type: string): string {
    const normalized = this.normalizeType(type);
    if (normalized === 'vacation') return 'hr_vacations';
    if (normalized === 'attendance') return 'hr_attendance_records';
    if (normalized === 'epi') return 'hr_epi_deliveries';
    return 'hr_work_accidents';
  }

  private normalizeRow(row: Record<string, any>) {
    const data = (row?.data && typeof row.data === 'object') ? row.data : {};
    return {
      id: row.id,
      employeeId: data.employeeId ?? row.employee_id,
      employeeName: data.employeeName ?? row.employee_name,
      startDate: data.startDate ?? row.start_date,
      endDate: data.endDate ?? row.end_date,
      date: data.date ?? row.date,
      deliveryDate: data.deliveryDate ?? row.delivery_date,
      accidentDate: data.accidentDate ?? row.accident_date,
      location: data.location ?? row.location,
      severity: data.severity ?? row.severity,
      status: data.status ?? row.status,
      reason: data.reason ?? row.reason,
      notes: data.notes ?? row.notes,
      description: data.description ?? row.description,
      actionsTaken: data.actionsTaken ?? row.actions_taken,
      items: data.items ?? row.items,
      ...data,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private buildPayload(recordType: string, data: any): Record<string, any> {
    const source = data?.data && typeof data.data === 'object' ? data.data : (data ?? {});
    const { id, companyId, company_id, createdAt, created_at, updatedAt, updated_at, ...rest } = source;
    return {
      ...rest,
      recordType: this.normalizeType(recordType),
    };
  }

  private toDateOrNull(value: any): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  private async listFromLegacy(recordType: string, companyId: string, limit: number) {
    if (!(await this.hasTable(this.legacyTable))) return [];
    const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>
      `
        SELECT *
        FROM work_accidents
        WHERE company_id = ${companyId}
          AND COALESCE(data->>'recordType', 'accident') = ${recordType}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    return rows.map((row) => this.normalizeRow(row));
  }

  private async getFromLegacy(recordType: string, id: string, companyId: string) {
    if (!(await this.hasTable(this.legacyTable))) return null;
    const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>
      `
        SELECT *
        FROM work_accidents
        WHERE id = ${id}
          AND company_id = ${companyId}
          AND COALESCE(data->>'recordType', 'accident') = ${recordType}
        LIMIT 1
      `;
    return rows[0] ? this.normalizeRow(rows[0]) : null;
  }

  private async createInLegacy(recordType: string, payload: Record<string, any>, companyId: string) {
    const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>
      `
        INSERT INTO work_accidents (id, company_id, data, created_at, updated_at)
        VALUES (${randomUUID()}, ${companyId}, ${payload}, NOW(), NOW())
        RETURNING *
      `;
    return this.normalizeRow(rows[0]);
  }

  private async updateInLegacy(recordType: string, id: string, payload: Record<string, any>, companyId: string) {
    const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>
      `
        UPDATE work_accidents
        SET data = ${payload}, updated_at = NOW()
        WHERE id = ${id}
          AND company_id = ${companyId}
          AND COALESCE(data->>'recordType', 'accident') = ${recordType}
        RETURNING *
      `;
    if (rows.length === 0) {
      throw new NotFoundException('Registro não encontrado');
    }
    return this.normalizeRow(rows[0]);
  }

  private async deleteInLegacy(recordType: string, id: string, companyId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>
      `
        DELETE FROM work_accidents
        WHERE id = ${id}
          AND company_id = ${companyId}
          AND COALESCE(data->>'recordType', 'accident') = ${recordType}
        RETURNING id
      `;
    if (rows.length === 0) {
      throw new NotFoundException('Registro não encontrado');
    }
    return { id: rows[0].id };
  }

  private async listFromTypedTable(table: string, companyId: string, limit: number) {
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
      `SELECT * FROM ${table} WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2`,
      companyId,
      limit,
    );
    return rows.map((row) => this.normalizeRow(row));
  }

  private async getFromTypedTable(table: string, id: string, companyId: string) {
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
      `SELECT * FROM ${table} WHERE id = $1 AND company_id = $2 LIMIT 1`,
      id,
      companyId,
    );
    return rows[0] ? this.normalizeRow(rows[0]) : null;
  }

  private async createInTypedTable(table: string, payload: Record<string, any>, companyId: string) {
    const id = randomUUID();
    if (table === 'hr_vacations') {
      const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>
        `
          INSERT INTO hr_vacations (
            id, company_id, employee_id, employee_name, start_date, end_date, status, notes, data, created_at, updated_at
          ) VALUES (
            ${id},
            ${companyId},
            ${payload.employeeId ?? null},
            ${payload.employeeName ?? null},
            ${this.toDateOrNull(payload.startDate)},
            ${this.toDateOrNull(payload.endDate)},
            ${payload.status ?? null},
            ${payload.notes ?? null},
            ${payload},
            NOW(),
            NOW()
          )
          RETURNING *
        `;
      return this.normalizeRow(rows[0]);
    }

    if (table === 'hr_attendance_records') {
      const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>
        `
          INSERT INTO hr_attendance_records (
            id, company_id, employee_id, employee_name, date, status, reason, data, created_at, updated_at
          ) VALUES (
            ${id},
            ${companyId},
            ${payload.employeeId ?? null},
            ${payload.employeeName ?? null},
            ${this.toDateOrNull(payload.date)},
            ${payload.status ?? null},
            ${payload.reason ?? null},
            ${payload},
            NOW(),
            NOW()
          )
          RETURNING *
        `;
      return this.normalizeRow(rows[0]);
    }

    if (table === 'hr_epi_deliveries') {
      const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>
        `
          INSERT INTO hr_epi_deliveries (
            id, company_id, employee_id, employee_name, delivery_date, items, notes, data, created_at, updated_at
          ) VALUES (
            ${id},
            ${companyId},
            ${payload.employeeId ?? null},
            ${payload.employeeName ?? null},
            ${this.toDateOrNull(payload.deliveryDate)},
            ${payload.items ?? null},
            ${payload.notes ?? null},
            ${payload},
            NOW(),
            NOW()
          )
          RETURNING *
        `;
      return this.normalizeRow(rows[0]);
    }

    const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>
      `
        INSERT INTO hr_work_accidents (
          id, company_id, employee_id, employee_name, accident_date, location, severity, status, description, actions_taken, data, created_at, updated_at
        ) VALUES (
          ${id},
          ${companyId},
          ${payload.employeeId ?? null},
          ${payload.employeeName ?? null},
          ${this.toDateOrNull(payload.accidentDate)},
          ${payload.location ?? null},
          ${payload.severity ?? null},
          ${payload.status ?? null},
          ${payload.description ?? null},
          ${payload.actionsTaken ?? null},
          ${payload},
          NOW(),
          NOW()
        )
        RETURNING *
      `;
    return this.normalizeRow(rows[0]);
  }

  private async updateInTypedTable(table: string, id: string, payload: Record<string, any>, companyId: string) {
    if (table === 'hr_vacations') {
      const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>
        `
          UPDATE hr_vacations
          SET
            employee_id = ${payload.employeeId ?? null},
            employee_name = ${payload.employeeName ?? null},
            start_date = ${this.toDateOrNull(payload.startDate)},
            end_date = ${this.toDateOrNull(payload.endDate)},
            status = ${payload.status ?? null},
            notes = ${payload.notes ?? null},
            data = ${payload},
            updated_at = NOW()
          WHERE id = ${id} AND company_id = ${companyId}
          RETURNING *
        `;
      if (rows.length === 0) throw new NotFoundException('Registro não encontrado');
      return this.normalizeRow(rows[0]);
    }

    if (table === 'hr_attendance_records') {
      const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>
        `
          UPDATE hr_attendance_records
          SET
            employee_id = ${payload.employeeId ?? null},
            employee_name = ${payload.employeeName ?? null},
            date = ${this.toDateOrNull(payload.date)},
            status = ${payload.status ?? null},
            reason = ${payload.reason ?? null},
            data = ${payload},
            updated_at = NOW()
          WHERE id = ${id} AND company_id = ${companyId}
          RETURNING *
        `;
      if (rows.length === 0) throw new NotFoundException('Registro não encontrado');
      return this.normalizeRow(rows[0]);
    }

    if (table === 'hr_epi_deliveries') {
      const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>
        `
          UPDATE hr_epi_deliveries
          SET
            employee_id = ${payload.employeeId ?? null},
            employee_name = ${payload.employeeName ?? null},
            delivery_date = ${this.toDateOrNull(payload.deliveryDate)},
            items = ${payload.items ?? null},
            notes = ${payload.notes ?? null},
            data = ${payload},
            updated_at = NOW()
          WHERE id = ${id} AND company_id = ${companyId}
          RETURNING *
        `;
      if (rows.length === 0) throw new NotFoundException('Registro não encontrado');
      return this.normalizeRow(rows[0]);
    }

    const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>
      `
        UPDATE hr_work_accidents
        SET
          employee_id = ${payload.employeeId ?? null},
          employee_name = ${payload.employeeName ?? null},
          accident_date = ${this.toDateOrNull(payload.accidentDate)},
          location = ${payload.location ?? null},
          severity = ${payload.severity ?? null},
          status = ${payload.status ?? null},
          description = ${payload.description ?? null},
          actions_taken = ${payload.actionsTaken ?? null},
          data = ${payload},
          updated_at = NOW()
        WHERE id = ${id} AND company_id = ${companyId}
        RETURNING *
      `;
    if (rows.length === 0) throw new NotFoundException('Registro não encontrado');
    return this.normalizeRow(rows[0]);
  }

  private async deleteInTypedTable(table: string, id: string, companyId: string) {
    const rows = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `DELETE FROM ${table} WHERE id = $1 AND company_id = $2 RETURNING id`,
      id,
      companyId,
    );
    if (rows.length === 0) throw new NotFoundException('Registro não encontrado');
    return { id: rows[0].id };
  }

  async findByCompany(companyId: string) {
    return this.findByType('accident', companyId, 100);
  }

  async findById(id: string, companyId: string) {
    return this.findByTypeAndId('accident', id, companyId);
  }

  async createItem(data: any, companyId: string) {
    return this.createByType('accident', data, companyId);
  }

  async updateItem(id: string, data: any, companyId: string) {
    return this.updateByType('accident', id, data, companyId);
  }

  async deleteItem(id: string, companyId: string) {
    return this.deleteByType('accident', id, companyId);
  }

  async findByType(recordType: string, companyId: string, limit = 200) {
    if (!companyId) {
      return [];
    }

    const normalizedType = this.normalizeType(recordType);
    const table = this.tableForType(normalizedType);
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 1000) : 200;

    if (await this.hasTable(table)) {
      return this.listFromTypedTable(table, companyId, safeLimit);
    }

    return this.listFromLegacy(normalizedType, companyId, safeLimit);
  }

  async findByTypeAndId(recordType: string, id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    const normalizedType = this.normalizeType(recordType);
    const table = this.tableForType(normalizedType);

    if (await this.hasTable(table)) {
      return this.getFromTypedTable(table, id, companyId);
    }

    return this.getFromLegacy(normalizedType, id, companyId);
  }

  async createByType(recordType: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const normalizedType = this.normalizeType(recordType);
    const table = this.tableForType(normalizedType);
    const payload = this.buildPayload(normalizedType, data);

    if (await this.hasTable(table)) {
      return this.createInTypedTable(table, payload, companyId);
    }

    if (await this.hasTable(this.legacyTable)) {
      return this.createInLegacy(normalizedType, payload, companyId);
    }

    throw new NotFoundException('Nenhuma tabela de RH disponível no banco atual');
  }

  async updateByType(recordType: string, id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const normalizedType = this.normalizeType(recordType);
    const table = this.tableForType(normalizedType);
    const payload = this.buildPayload(normalizedType, data);

    if (await this.hasTable(table)) {
      return this.updateInTypedTable(table, id, payload, companyId);
    }

    if (await this.hasTable(this.legacyTable)) {
      return this.updateInLegacy(normalizedType, id, payload, companyId);
    }

    throw new NotFoundException('Nenhuma tabela de RH disponível no banco atual');
  }

  async deleteByType(recordType: string, id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const normalizedType = this.normalizeType(recordType);
    const table = this.tableForType(normalizedType);

    if (await this.hasTable(table)) {
      return this.deleteInTypedTable(table, id, companyId);
    }

    if (await this.hasTable(this.legacyTable)) {
      return this.deleteInLegacy(normalizedType, id, companyId);
    }

    throw new NotFoundException('Nenhuma tabela de RH disponível no banco atual');
  }
}
