import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class WorkAccidentService {
  private prisma: PrismaService;
  private tableExistsCache = new Map<string, boolean>();
  private readonly legacyTable = 'work_accidents';

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
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

  private resolveLimit(limit?: number, fallback = 200) {
    if (!Number.isFinite(limit as number)) {
      return fallback;
    }
    return Math.max(1, Math.min(Number(limit), 1000));
  }

  private toDecimal(value: any): Prisma.Decimal | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    try {
      return new Prisma.Decimal(value);
    } catch {
      return null;
    }
  }

  private ensureStringArray(value: any): string[] {
    if (Array.isArray(value)) {
      return value.map((entry) => String(entry).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return [];
  }

  private normalizeBenefitEntity(entity: any) {
    if (!entity) return null;
    return {
      id: entity.id,
      companyId: entity.company_id,
      name: entity.name,
      category: entity.category ?? null,
      provider: entity.provider ?? null,
      audience: entity.audience ?? null,
      status: entity.status ?? 'Ativo',
      monthlyCost: entity.monthly_cost ? Number(entity.monthly_cost) : 0,
      enrolledCount: typeof entity.enrolled_count === 'number' ? entity.enrolled_count : 0,
      satisfaction: entity.satisfaction ? Number(entity.satisfaction) : null,
      coverageGoal: entity.coverage_goal ?? null,
      renewalDate: entity.renewal_date ?? null,
      tags: entity.tags ?? [],
      color: entity.color ?? null,
      priority: entity.priority ?? null,
      lastReviewedAt: entity.last_reviewed_at ?? null,
      notes: entity.notes ?? null,
      data: entity.data ?? null,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };
  }

  private normalizeBenefitServiceEntity(entity: any) {
    if (!entity) return null;
    return {
      id: entity.id,
      companyId: entity.company_id,
      benefitId: entity.benefit_id ?? null,
      benefitName: entity.hr_benefits?.name ?? null,
      employeeId: entity.employee_id ?? null,
      employeeName: entity.employee_name ?? null,
      subject: entity.subject ?? null,
      channel: entity.channel ?? null,
      audience: entity.audience ?? null,
      owner: entity.owner ?? null,
      serviceKind: entity.service_kind ?? null,
      priority: entity.priority ?? null,
      status: entity.status ?? null,
      startDate: entity.start_date ?? null,
      endDate: entity.end_date ?? null,
      submittedAt: entity.submitted_at ?? null,
      scheduledFor: entity.scheduled_for ?? null,
      resolvedAt: entity.resolved_at ?? null,
      lastCreditDate: entity.last_credit_date ?? null,
      nextCreditDate: entity.next_credit_date ?? null,
      creditAmount: entity.credit_amount ? Number(entity.credit_amount) : null,
      notes: entity.notes ?? null,
      data: entity.data ?? null,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };
  }

  private normalizeBenefitControlEntity(entity: any) {
    if (!entity) return null;
    return {
      id: entity.id,
      companyId: entity.company_id,
      benefitId: entity.benefit_id ?? null,
      controlType: entity.control_type ?? null,
      scope: entity.scope ?? null,
      metricLabel: entity.metric_label ?? null,
      currentValue: entity.current_value ? Number(entity.current_value) : null,
      targetValue: entity.target_value ? Number(entity.target_value) : null,
      unit: entity.unit ?? null,
      highlight: entity.highlight ?? null,
      owner: entity.owner ?? null,
      status: entity.status ?? null,
      nextActionAt: entity.next_action_at ?? null,
      data: entity.data ?? null,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };
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

  // --- Benefícios corporativos ---

  async listBenefits(companyId: string, params: { status?: string; limit?: number } = {}) {
    if (!companyId) {
      return [];
    }
    const take = this.resolveLimit(params.limit ?? 100, 100);
    const where: Record<string, any> = { company_id: companyId };
    if (params.status) {
      where.status = params.status;
    }
    const benefits = await this.prisma.hr_benefits.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { updated_at: 'desc' }],
      take,
    });
    return benefits.map((benefit) => this.normalizeBenefitEntity(benefit));
  }

  async getBenefit(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }
    const benefit = await this.prisma.hr_benefits.findUnique({ where: { id } });
    if (!benefit || benefit.company_id !== companyId) {
      throw new NotFoundException('Benefício não encontrado');
    }
    return this.normalizeBenefitEntity(benefit);
  }

  async createBenefit(data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }
    if (!data?.name) {
      throw new BadRequestException('Nome do benefício é obrigatório');
    }
    const created = await this.prisma.hr_benefits.create({
      data: {
        id: randomUUID(),
        company_id: companyId,
        name: data.name,
        category: data.category ?? null,
        provider: data.provider ?? null,
        audience: data.audience ?? null,
        status: data.status ?? 'Ativo',
        monthly_cost: this.toDecimal(data.monthlyCost),
        enrolled_count: data.enrolledCount ?? data.enrolled ?? 0,
        satisfaction: this.toDecimal(data.satisfaction),
        coverage_goal: data.coverageGoal ?? null,
        renewal_date: this.toDateOrNull(data.renewalDate),
        tags: this.ensureStringArray(data.tags),
        color: data.color ?? null,
        priority: data.priority ?? null,
        last_reviewed_at: this.toDateOrNull(data.lastReviewedAt),
        notes: data.notes ?? null,
        data: data.data ?? data.meta ?? null,
      },
    });
    return this.normalizeBenefitEntity(created);
  }

  async updateBenefit(id: string, data: any, companyId: string) {
    await this.getBenefit(id, companyId);
    const updatePayload: Record<string, any> = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.category !== undefined) updatePayload.category = data.category;
    if (data.provider !== undefined) updatePayload.provider = data.provider;
    if (data.audience !== undefined) updatePayload.audience = data.audience;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.monthlyCost !== undefined) updatePayload.monthly_cost = this.toDecimal(data.monthlyCost);
    if (data.enrolledCount !== undefined || data.enrolled !== undefined) {
      updatePayload.enrolled_count = data.enrolledCount ?? data.enrolled ?? 0;
    }
    if (data.satisfaction !== undefined) updatePayload.satisfaction = this.toDecimal(data.satisfaction);
    if (data.coverageGoal !== undefined) updatePayload.coverage_goal = data.coverageGoal;
    if (data.renewalDate !== undefined) updatePayload.renewal_date = this.toDateOrNull(data.renewalDate);
    if (data.tags !== undefined) updatePayload.tags = this.ensureStringArray(data.tags);
    if (data.color !== undefined) updatePayload.color = data.color;
    if (data.priority !== undefined) updatePayload.priority = data.priority;
    if (data.lastReviewedAt !== undefined) updatePayload.last_reviewed_at = this.toDateOrNull(data.lastReviewedAt);
    if (data.notes !== undefined) updatePayload.notes = data.notes;
    if (data.data !== undefined || data.meta !== undefined) updatePayload.data = data.data ?? data.meta ?? null;

    if (Object.keys(updatePayload).length === 0) {
      return this.getBenefit(id, companyId);
    }

    const updated = await this.prisma.hr_benefits.update({ where: { id }, data: updatePayload });
    return this.normalizeBenefitEntity(updated);
  }

  async deleteBenefit(id: string, companyId: string) {
    await this.getBenefit(id, companyId);
    await this.prisma.hr_benefits.delete({ where: { id } });
    return { id };
  }

  // --- Serviços e comunicações de benefícios ---

  async listBenefitServices(
    companyId: string,
    params: { kind?: string; status?: string; limit?: number } = {},
  ) {
    if (!companyId) {
      return [];
    }
    const take = this.resolveLimit(params.limit ?? 100, 100);
    const where: Record<string, any> = { company_id: companyId };
    if (params.kind) {
      where.service_kind = params.kind;
    }
    if (params.status) {
      where.status = params.status;
    }
    const services = await this.prisma.hr_benefit_services.findMany({
      where,
      include: { hr_benefits: { select: { id: true, name: true } } },
      orderBy: [{ submitted_at: 'desc' }, { created_at: 'desc' }],
      take,
    });
    return services.map((service) => this.normalizeBenefitServiceEntity(service));
  }

  async getBenefitService(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }
    const service = await this.prisma.hr_benefit_services.findUnique({
      where: { id },
      include: { hr_benefits: { select: { id: true, name: true } } },
    });
    if (!service || service.company_id !== companyId) {
      throw new NotFoundException('Registro de serviço não encontrado');
    }
    return this.normalizeBenefitServiceEntity(service);
  }

  async createBenefitService(data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }
    const serviceKind = data?.serviceKind ?? data?.kind;
    if (!serviceKind) {
      throw new BadRequestException('serviceKind é obrigatório');
    }

    const created = await this.prisma.hr_benefit_services.create({
      data: {
        id: randomUUID(),
        company_id: companyId,
        benefit_id: data.benefitId ?? null,
        employee_id: data.employeeId ?? null,
        employee_name: data.employeeName ?? null,
        subject: data.subject ?? data.type ?? null,
        channel: data.channel ?? null,
        audience: data.audience ?? null,
        owner: data.owner ?? null,
        service_kind: serviceKind,
        priority: data.priority ?? 'Normal',
        status: data.status ?? 'Aguardando RH',
        start_date: this.toDateOrNull(data.startDate),
        end_date: this.toDateOrNull(data.endDate),
        submitted_at: this.toDateOrNull(data.submittedAt) ?? new Date(),
        scheduled_for: this.toDateOrNull(data.scheduledFor),
        resolved_at: this.toDateOrNull(data.resolvedAt),
        last_credit_date: this.toDateOrNull(data.lastCreditDate),
        next_credit_date: this.toDateOrNull(data.nextCreditDate),
        credit_amount: this.toDecimal(data.creditAmount),
        notes: data.notes ?? null,
        data:
          data.data ??
          data.meta ??
          (data.type || data.notes || data.audience
            ? {
                type: data.type,
                notes: data.notes,
                audience: data.audience,
              }
            : null),
      },
      include: { hr_benefits: { select: { id: true, name: true } } },
    });
    return this.normalizeBenefitServiceEntity(created);
  }

  async updateBenefitService(id: string, data: any, companyId: string) {
    await this.getBenefitService(id, companyId);
    const updatePayload: Record<string, any> = {};
    if (data.benefitId !== undefined) updatePayload.benefit_id = data.benefitId;
    if (data.employeeId !== undefined) updatePayload.employee_id = data.employeeId;
    if (data.employeeName !== undefined) updatePayload.employee_name = data.employeeName;
    if (data.subject !== undefined) {
      updatePayload.subject = data.subject;
    } else if (data.type !== undefined) {
      updatePayload.subject = data.type;
    }
    if (data.channel !== undefined) updatePayload.channel = data.channel;
    if (data.audience !== undefined) updatePayload.audience = data.audience;
    if (data.owner !== undefined) updatePayload.owner = data.owner;
    if (data.serviceKind !== undefined) updatePayload.service_kind = data.serviceKind;
    if (data.priority !== undefined) updatePayload.priority = data.priority;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.startDate !== undefined) updatePayload.start_date = this.toDateOrNull(data.startDate);
    if (data.endDate !== undefined) updatePayload.end_date = this.toDateOrNull(data.endDate);
    if (data.submittedAt !== undefined) updatePayload.submitted_at = this.toDateOrNull(data.submittedAt);
    if (data.scheduledFor !== undefined) updatePayload.scheduled_for = this.toDateOrNull(data.scheduledFor);
    if (data.resolvedAt !== undefined) updatePayload.resolved_at = this.toDateOrNull(data.resolvedAt);
    if (data.lastCreditDate !== undefined) updatePayload.last_credit_date = this.toDateOrNull(data.lastCreditDate);
    if (data.nextCreditDate !== undefined) updatePayload.next_credit_date = this.toDateOrNull(data.nextCreditDate);
    if (data.creditAmount !== undefined) updatePayload.credit_amount = this.toDecimal(data.creditAmount);
    if (data.notes !== undefined) updatePayload.notes = data.notes;
    if (
      data.data !== undefined ||
      data.meta !== undefined ||
      data.type !== undefined ||
      data.notes !== undefined ||
      data.audience !== undefined
    ) {
      updatePayload.data =
        data.data ??
        data.meta ??
        (data.type || data.notes || data.audience
          ? {
              type: data.type,
              notes: data.notes,
              audience: data.audience,
            }
          : null);
    }

    const updated = await this.prisma.hr_benefit_services.update({
      where: { id },
      data: updatePayload,
      include: { hr_benefits: { select: { id: true, name: true } } },
    });
    return this.normalizeBenefitServiceEntity(updated);
  }

  async deleteBenefitService(id: string, companyId: string) {
    await this.getBenefitService(id, companyId);
    await this.prisma.hr_benefit_services.delete({ where: { id } });
    return { id };
  }

  // --- Indicadores e controles de benefícios ---

  async listBenefitControls(companyId: string, limit = 50) {
    if (!companyId) {
      return [];
    }
    const take = this.resolveLimit(limit, 50);
    const controls = await this.prisma.hr_benefit_controls.findMany({
      where: { company_id: companyId },
      orderBy: [{ updated_at: 'desc' }],
      take,
    });
    return controls.map((control) => this.normalizeBenefitControlEntity(control));
  }

  async getBenefitControl(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }
    const control = await this.prisma.hr_benefit_controls.findUnique({ where: { id } });
    if (!control || control.company_id !== companyId) {
      throw new NotFoundException('Controle não encontrado');
    }
    return this.normalizeBenefitControlEntity(control);
  }

  async createBenefitControl(data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }
    const created = await this.prisma.hr_benefit_controls.create({
      data: {
        id: randomUUID(),
        company_id: companyId,
        benefit_id: data.benefitId ?? null,
        control_type: data.controlType ?? data.type ?? null,
        scope: data.scope ?? null,
        metric_label: data.metricLabel ?? null,
        current_value: this.toDecimal(data.currentValue),
        target_value: this.toDecimal(data.targetValue),
        unit: data.unit ?? null,
        highlight: data.highlight ?? null,
        owner: data.owner ?? null,
        status: data.status ?? 'Ativo',
        next_action_at: this.toDateOrNull(data.nextActionAt),
        data: data.data ?? data.meta ?? null,
      },
    });
    return this.normalizeBenefitControlEntity(created);
  }

  async updateBenefitControl(id: string, data: any, companyId: string) {
    await this.getBenefitControl(id, companyId);
    const updatePayload: Record<string, any> = {};
    if (data.benefitId !== undefined) updatePayload.benefit_id = data.benefitId;
    if (data.controlType !== undefined) updatePayload.control_type = data.controlType;
    if (data.scope !== undefined) updatePayload.scope = data.scope;
    if (data.metricLabel !== undefined) updatePayload.metric_label = data.metricLabel;
    if (data.currentValue !== undefined) updatePayload.current_value = this.toDecimal(data.currentValue);
    if (data.targetValue !== undefined) updatePayload.target_value = this.toDecimal(data.targetValue);
    if (data.unit !== undefined) updatePayload.unit = data.unit;
    if (data.highlight !== undefined) updatePayload.highlight = data.highlight;
    if (data.owner !== undefined) updatePayload.owner = data.owner;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.nextActionAt !== undefined) updatePayload.next_action_at = this.toDateOrNull(data.nextActionAt);
    if (data.data !== undefined || data.meta !== undefined) updatePayload.data = data.data ?? data.meta ?? null;

    const updated = await this.prisma.hr_benefit_controls.update({ where: { id }, data: updatePayload });
    return this.normalizeBenefitControlEntity(updated);
  }

  async deleteBenefitControl(id: string, companyId: string) {
    await this.getBenefitControl(id, companyId);
    await this.prisma.hr_benefit_controls.delete({ where: { id } });
    return { id };
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
