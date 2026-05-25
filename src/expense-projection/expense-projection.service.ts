import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { randomUUID } from 'crypto';

type CommitmentKind = 'solicitado' | 'comprometido' | 'recibido' | 'devengado' | 'pagado';

@Injectable()
export class ExpenseProjectionService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Serializers (snake_case → camelCase) ──────────────────────────
  private serializePeriod(row: any) {
    if (!row) return null;
    return {
      id: row.id,
      year: row.year,
      month: row.month,
      plant: row.plant,
      status: row.status,
      totalApproved: Number(row.total_approved ?? 0),
      currency: row.currency,
      closedAt: row.closed_at,
      closedBy: row.closed_by,
    };
  }

  private serializeCostCenter(row: any) {
    if (!row) return null;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      parentId: row.parent_id,
      plant: row.plant,
      responsibleId: row.responsible_id,
      responsibleName: row.responsible_name,
      active: row.active,
    };
  }

  private serializeLine(row: any, costCenterName?: string) {
    if (!row) return null;
    return {
      id: row.id,
      periodId: row.period_id,
      costCenterId: row.cost_center_id,
      costCenterName,
      accountCode: row.account_code,
      projectId: row.project_id,
      amountApproved: Number(row.amount_approved ?? 0),
      amountRevised: row.amount_revised == null ? null : Number(row.amount_revised),
      currency: row.currency,
    };
  }

  private serializeCommitment(row: any) {
    if (!row) return null;
    return {
      id: row.id,
      periodId: row.period_id,
      costCenterId: row.cost_center_id,
      tipo: row.tipo,
      amount: Number(row.amount ?? 0),
      currency: row.currency,
      refType: row.ref_type,
      refId: row.ref_id,
      refLabel: row.ref_label,
      supplierName: row.supplier_name,
      occurredAt: row.occurred_at,
      scheduledAt: row.scheduled_at,
      createdAt: row.created_at,
    };
  }

  private serializeAlert(row: any) {
    if (!row) return null;
    return {
      id: row.id,
      periodId: row.period_id,
      type: row.type,
      severity: row.severity,
      refId: row.ref_id,
      refLabel: row.ref_label,
      message: row.message,
      createdAt: row.created_at,
      acknowledgedAt: row.acknowledged_at,
    };
  }

  private serializeIntention(row: any, costCenterName?: string) {
    if (!row) return null;
    return {
      id: row.id,
      periodId: row.period_id,
      costCenterId: row.cost_center_id,
      costCenterName,
      title: row.title,
      description: row.description,
      kind: row.kind,
      amount: Number(row.amount ?? 0),
      currency: row.currency,
      plannedDate: row.planned_date,
      scheduledPaymentDate: row.scheduled_payment_date,
      supplierName: row.supplier_name,
      priority: row.priority,
      status: row.status,
      requestedBy: row.requested_by,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      convertedPoId: row.converted_po_id,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ─── Períodos ──────────────────────────────────────────────────────
  async listPeriods(companyId: string) {
    if (!companyId) return [];
    const rows = await this.prisma.budget_periods.findMany({
      where: { company_id: companyId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    return rows.map((r) => this.serializePeriod(r));
  }

  async createPeriod(companyId: string, dto: any) {
    if (!companyId) throw new BadRequestException('companyId required');
    const year = Number(dto?.year);
    const month = Number(dto?.month);
    if (!year || !month || month < 1 || month > 12) {
      throw new BadRequestException('year and month (1-12) are required');
    }
    const row = await this.prisma.budget_periods.create({
      data: {
        id: randomUUID(),
        company_id: companyId,
        year,
        month,
        plant: dto.plant ?? null,
        status: dto.status ?? 'borrador',
        currency: dto.currency ?? 'BRL',
        total_approved: dto.totalApproved ?? 0,
        updated_at: new Date(),
      },
    });
    return this.serializePeriod(row);
  }

  async updatePeriod(companyId: string, id: string, dto: any) {
    const existing = await this.prisma.budget_periods.findFirst({ where: { id, company_id: companyId } });
    if (!existing) throw new NotFoundException('period not found');
    const row = await this.prisma.budget_periods.update({
      where: { id },
      data: {
        plant: dto.plant ?? existing.plant,
        status: dto.status ?? existing.status,
        currency: dto.currency ?? existing.currency,
        total_approved: dto.totalApproved ?? existing.total_approved,
        updated_at: new Date(),
      },
    });
    return this.serializePeriod(row);
  }

  async closePeriod(companyId: string, id: string) {
    const existing = await this.prisma.budget_periods.findFirst({ where: { id, company_id: companyId } });
    if (!existing) throw new NotFoundException('period not found');
    const snapshot = await this.computeSnapshot(companyId, id, existing.plant ?? undefined);
    const row = await this.prisma.budget_periods.update({
      where: { id },
      data: {
        status: 'cerrado',
        closed_at: new Date(),
        snapshot: snapshot as any,
        updated_at: new Date(),
      },
    });
    return this.serializePeriod(row);
  }

  async reopenPeriod(companyId: string, id: string) {
    const existing = await this.prisma.budget_periods.findFirst({ where: { id, company_id: companyId } });
    if (!existing) throw new NotFoundException('period not found');
    const row = await this.prisma.budget_periods.update({
      where: { id },
      data: { status: 'aprobado', closed_at: null, updated_at: new Date() },
    });
    return this.serializePeriod(row);
  }

  // ─── Centros de Custo ──────────────────────────────────────────────
  async listCostCenters(companyId: string) {
    if (!companyId) return [];
    const rows = await this.prisma.cost_centers.findMany({
      where: { company_id: companyId },
      orderBy: { code: 'asc' },
    });
    return rows.map((r) => this.serializeCostCenter(r));
  }

  async createCostCenter(companyId: string, dto: any) {
    if (!companyId) throw new BadRequestException('companyId required');
    if (!dto?.code || !dto?.name) throw new BadRequestException('code and name required');
    const row = await this.prisma.cost_centers.create({
      data: {
        id: randomUUID(),
        company_id: companyId,
        code: String(dto.code),
        name: String(dto.name),
        parent_id: dto.parentId ?? null,
        plant: dto.plant ?? null,
        responsible_id: dto.responsibleId ?? null,
        responsible_name: dto.responsibleName ?? null,
        active: dto.active ?? true,
        updated_at: new Date(),
      },
    });
    return this.serializeCostCenter(row);
  }

  async updateCostCenter(companyId: string, id: string, dto: any) {
    const existing = await this.prisma.cost_centers.findFirst({ where: { id, company_id: companyId } });
    if (!existing) throw new NotFoundException('cost center not found');
    const row = await this.prisma.cost_centers.update({
      where: { id },
      data: {
        code: dto.code ?? existing.code,
        name: dto.name ?? existing.name,
        parent_id: dto.parentId ?? existing.parent_id,
        plant: dto.plant ?? existing.plant,
        responsible_id: dto.responsibleId ?? existing.responsible_id,
        responsible_name: dto.responsibleName ?? existing.responsible_name,
        active: dto.active ?? existing.active,
        updated_at: new Date(),
      },
    });
    return this.serializeCostCenter(row);
  }

  // ─── Linhas de orçamento ───────────────────────────────────────────
  async listLines(companyId: string, periodId: string) {
    if (!companyId || !periodId) return [];
    const [rows, ccs] = await Promise.all([
      this.prisma.budget_lines.findMany({
        where: { company_id: companyId, period_id: periodId },
        orderBy: { created_at: 'asc' },
      }),
      this.prisma.cost_centers.findMany({ where: { company_id: companyId } }),
    ]);
    const ccMap = new Map(ccs.map((c) => [c.id, c.name]));
    return rows.map((r) => this.serializeLine(r, ccMap.get(r.cost_center_id) ?? undefined));
  }

  async createLine(companyId: string, dto: any) {
    if (!companyId) throw new BadRequestException('companyId required');
    if (!dto?.periodId || !dto?.costCenterId) throw new BadRequestException('periodId and costCenterId required');
    const row = await this.prisma.budget_lines.create({
      data: {
        id: randomUUID(),
        company_id: companyId,
        period_id: dto.periodId,
        cost_center_id: dto.costCenterId,
        account_code: dto.accountCode ?? null,
        project_id: dto.projectId ?? null,
        amount_approved: dto.amountApproved ?? 0,
        amount_revised: dto.amountRevised ?? null,
        currency: dto.currency ?? 'BRL',
        notes: dto.notes ?? null,
        updated_at: new Date(),
      },
    });
    return this.serializeLine(row);
  }

  async updateLine(companyId: string, id: string, dto: any) {
    const existing = await this.prisma.budget_lines.findFirst({ where: { id, company_id: companyId } });
    if (!existing) throw new NotFoundException('budget line not found');
    const row = await this.prisma.budget_lines.update({
      where: { id },
      data: {
        account_code: dto.accountCode ?? existing.account_code,
        project_id: dto.projectId ?? existing.project_id,
        amount_approved: dto.amountApproved ?? existing.amount_approved,
        amount_revised: dto.amountRevised ?? existing.amount_revised,
        currency: dto.currency ?? existing.currency,
        notes: dto.notes ?? existing.notes,
        updated_at: new Date(),
      },
    });
    return this.serializeLine(row);
  }

  // ─── Commitments ───────────────────────────────────────────────────
  async listCommitments(companyId: string, periodId: string) {
    if (!companyId || !periodId) return [];
    const rows = await this.prisma.budget_commitments.findMany({
      where: { company_id: companyId, period_id: periodId },
      orderBy: { occurred_at: 'desc' },
      take: 1000,
    });
    return rows.map((r) => this.serializeCommitment(r));
  }

  /**
   * Public helper invoked by other modules (e.g. purchase-orders) to record
   * a financial commitment against a budget period/cost-center.
   */
  async recordCommitment(params: {
    companyId: string;
    periodId: string;
    costCenterId: string;
    tipo: CommitmentKind;
    amount: number;
    currency?: string;
    refType?: string;
    refId?: string;
    refLabel?: string;
    supplierName?: string;
    occurredAt?: Date;
    scheduledAt?: Date | null;
  }) {
    const row = await this.prisma.budget_commitments.create({
      data: {
        id: randomUUID(),
        company_id: params.companyId,
        period_id: params.periodId,
        cost_center_id: params.costCenterId,
        tipo: params.tipo,
        amount: params.amount,
        currency: params.currency ?? 'BRL',
        ref_type: params.refType ?? null,
        ref_id: params.refId ?? null,
        ref_label: params.refLabel ?? null,
        supplier_name: params.supplierName ?? null,
        occurred_at: params.occurredAt ?? new Date(),
        scheduled_at: params.scheduledAt ?? null,
      },
    });
    return this.serializeCommitment(row);
  }

  // ─── Alerts ────────────────────────────────────────────────────────
  async listAlerts(companyId: string, periodId?: string) {
    if (!companyId) return [];
    const rows = await this.prisma.budget_alerts.findMany({
      where: {
        company_id: companyId,
        ...(periodId ? { period_id: periodId } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 500,
    });
    return rows.map((r) => this.serializeAlert(r));
  }

  async acknowledgeAlert(companyId: string, id: string) {
    const existing = await this.prisma.budget_alerts.findFirst({ where: { id, company_id: companyId } });
    if (!existing) throw new NotFoundException('alert not found');
    const row = await this.prisma.budget_alerts.update({
      where: { id },
      data: { acknowledged_at: new Date() },
    });
    return this.serializeAlert(row);
  }

  // ─── Intenciones de Gastos ─────────────────────────────────────────
  async listIntentions(companyId: string, filter: { periodId?: string; status?: string } = {}) {
    if (!companyId) return [];
    const [rows, ccs] = await Promise.all([
      this.prisma.expense_intentions.findMany({
        where: {
          company_id: companyId,
          ...(filter.periodId ? { period_id: filter.periodId } : {}),
          ...(filter.status ? { status: filter.status } : {}),
        },
        orderBy: [{ planned_date: 'asc' }, { created_at: 'desc' }],
        take: 1000,
      }),
      this.prisma.cost_centers.findMany({ where: { company_id: companyId } }),
    ]);
    const ccMap = new Map(ccs.map((c) => [c.id, c.name]));
    return rows.map((r) => this.serializeIntention(r, ccMap.get(r.cost_center_id) ?? undefined));
  }

  async getIntention(companyId: string, id: string) {
    const row = await this.prisma.expense_intentions.findFirst({
      where: { id, company_id: companyId },
    });
    if (!row) throw new NotFoundException('intention not found');
    const cc = await this.prisma.cost_centers.findFirst({ where: { id: row.cost_center_id } });
    return this.serializeIntention(row, cc?.name);
  }

  async createIntention(companyId: string, dto: any) {
    if (!companyId) throw new BadRequestException('companyId required');
    if (!dto?.title) throw new BadRequestException('title required');
    if (!dto?.costCenterId) throw new BadRequestException('costCenterId required');
    if (!(Number(dto?.amount) > 0)) throw new BadRequestException('amount must be > 0');

    const periodId = dto.periodId ?? (await this.resolvePeriodId(companyId, dto.plannedDate, dto.costCenterId));

    const row = await this.prisma.expense_intentions.create({
      data: {
        id: randomUUID(),
        company_id: companyId,
        period_id: periodId ?? null,
        cost_center_id: dto.costCenterId,
        title: String(dto.title).slice(0, 255),
        description: dto.description ?? null,
        kind: dto.kind === 'inversion' ? 'inversion' : 'gasto',
        amount: dto.amount,
        currency: dto.currency ?? 'BRL',
        planned_date: dto.plannedDate ? new Date(dto.plannedDate) : null,
        scheduled_payment_date: dto.scheduledPaymentDate ? new Date(dto.scheduledPaymentDate) : null,
        supplier_name: dto.supplierName ?? null,
        priority: ['low', 'normal', 'high'].includes(dto.priority) ? dto.priority : 'normal',
        status: dto.status === 'aprobado' ? 'aprobado' : 'borrador',
        requested_by: dto.requestedBy ?? null,
        notes: dto.notes ?? null,
        updated_at: new Date(),
      },
    });

    if (row.status === 'aprobado') {
      await this.mirrorIntentionAsCommitment(row).catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('[intentions] mirror failed:', e?.message || e);
      });
    }

    return this.serializeIntention(row);
  }

  async updateIntention(companyId: string, id: string, dto: any) {
    const existing = await this.prisma.expense_intentions.findFirst({
      where: { id, company_id: companyId },
    });
    if (!existing) throw new NotFoundException('intention not found');
    if (existing.status === 'convertido' || existing.status === 'ejecutado') {
      throw new BadRequestException(`cannot edit intention in status ${existing.status}`);
    }

    const newAmount = dto.amount !== undefined ? Number(dto.amount) : Number(existing.amount);
    const newCostCenter = dto.costCenterId ?? existing.cost_center_id;
    const newPlanned = dto.plannedDate !== undefined ? (dto.plannedDate ? new Date(dto.plannedDate) : null) : existing.planned_date;
    const newPeriodId = dto.periodId !== undefined
      ? dto.periodId
      : (existing.period_id ?? (await this.resolvePeriodId(companyId, newPlanned, newCostCenter)));

    const row = await this.prisma.expense_intentions.update({
      where: { id },
      data: {
        period_id: newPeriodId ?? null,
        cost_center_id: newCostCenter,
        title: dto.title ?? existing.title,
        description: dto.description ?? existing.description,
        kind: dto.kind === 'inversion' || dto.kind === 'gasto' ? dto.kind : existing.kind,
        amount: newAmount,
        currency: dto.currency ?? existing.currency,
        planned_date: newPlanned,
        scheduled_payment_date: dto.scheduledPaymentDate !== undefined
          ? (dto.scheduledPaymentDate ? new Date(dto.scheduledPaymentDate) : null)
          : existing.scheduled_payment_date,
        supplier_name: dto.supplierName !== undefined ? dto.supplierName : existing.supplier_name,
        priority: ['low', 'normal', 'high'].includes(dto.priority) ? dto.priority : existing.priority,
        requested_by: dto.requestedBy !== undefined ? dto.requestedBy : existing.requested_by,
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
        updated_at: new Date(),
      },
    });

    // si está aprobada, refrescar mirror commitment
    if (row.status === 'aprobado') {
      await this.refreshIntentionCommitment(row).catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('[intentions] refresh mirror failed:', e?.message || e);
      });
    }

    return this.serializeIntention(row);
  }

  async approveIntention(companyId: string, id: string, approver?: string) {
    const existing = await this.prisma.expense_intentions.findFirst({
      where: { id, company_id: companyId },
    });
    if (!existing) throw new NotFoundException('intention not found');
    if (existing.status !== 'borrador') {
      throw new BadRequestException(`cannot approve intention in status ${existing.status}`);
    }
    const row = await this.prisma.expense_intentions.update({
      where: { id },
      data: {
        status: 'aprobado',
        approved_by: approver ?? null,
        approved_at: new Date(),
        updated_at: new Date(),
      },
    });
    await this.mirrorIntentionAsCommitment(row).catch((e) => {
      // eslint-disable-next-line no-console
      console.warn('[intentions] mirror failed:', e?.message || e);
    });
    return this.serializeIntention(row);
  }

  async cancelIntention(companyId: string, id: string, reason?: string) {
    const existing = await this.prisma.expense_intentions.findFirst({
      where: { id, company_id: companyId },
    });
    if (!existing) throw new NotFoundException('intention not found');
    if (existing.status === 'convertido' || existing.status === 'ejecutado') {
      throw new BadRequestException(`cannot cancel intention in status ${existing.status}`);
    }
    const row = await this.prisma.expense_intentions.update({
      where: { id },
      data: {
        status: 'cancelado',
        notes: reason ? `${existing.notes ?? ''}\n[CANCELADA] ${reason}`.trim() : existing.notes,
        updated_at: new Date(),
      },
    });
    // limpiar commitment espejo si existía
    await this.prisma.budget_commitments.deleteMany({
      where: { company_id: companyId, ref_type: 'intention', ref_id: id },
    });
    return this.serializeIntention(row);
  }

  /**
   * Marca una intención como convertida a OC. Reemplaza el commitment 'solicitado'
   * por el de la OC (que ya se generará vía PurchaseOrderService.syncBudgetCommitments).
   */
  async markIntentionConverted(companyId: string, id: string, poId: string) {
    const existing = await this.prisma.expense_intentions.findFirst({
      where: { id, company_id: companyId },
    });
    if (!existing) throw new NotFoundException('intention not found');
    const row = await this.prisma.expense_intentions.update({
      where: { id },
      data: {
        status: 'convertido',
        converted_po_id: poId,
        updated_at: new Date(),
      },
    });
    // remover commitment espejo (la OC creará su propio commitment)
    await this.prisma.budget_commitments.deleteMany({
      where: { company_id: companyId, ref_type: 'intention', ref_id: id },
    });
    return this.serializeIntention(row);
  }

  /**
   * Resuelve el período presupuestario al que pertenece una intención según
   * la fecha planeada (year+month) y la planta del centro de costo.
   */
  private async resolvePeriodId(
    companyId: string,
    plannedDate: Date | string | null | undefined,
    costCenterId?: string,
  ): Promise<string | null> {
    const d = plannedDate ? new Date(plannedDate) : new Date();
    if (Number.isNaN(d.getTime())) return null;
    let plant: string | null = null;
    if (costCenterId) {
      const cc = await this.prisma.cost_centers.findFirst({
        where: { id: costCenterId, company_id: companyId },
      });
      plant = cc?.plant ?? null;
    }
    const period = await this.prisma.budget_periods.findFirst({
      where: {
        company_id: companyId,
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        plant,
        status: { in: ['borrador', 'aprobado'] },
      },
    });
    return period?.id ?? null;
  }

  /**
   * Crea (o reemplaza) un commitment 'solicitado' que refleja la intención
   * en la proyección de gastos. Es idempotente por (ref_type='intention', ref_id).
   */
  private async mirrorIntentionAsCommitment(intention: any) {
    if (!intention?.period_id) return; // sin período no aporta a la proyección
    await this.prisma.budget_commitments.deleteMany({
      where: {
        company_id: intention.company_id,
        ref_type: 'intention',
        ref_id: intention.id,
      },
    });
    await this.prisma.budget_commitments.create({
      data: {
        id: randomUUID(),
        company_id: intention.company_id,
        period_id: intention.period_id,
        cost_center_id: intention.cost_center_id,
        tipo: 'solicitado',
        amount: intention.amount,
        currency: intention.currency,
        ref_type: 'intention',
        ref_id: intention.id,
        ref_label: intention.title,
        supplier_name: intention.supplier_name,
        occurred_at: intention.planned_date ?? new Date(),
        scheduled_at: intention.scheduled_payment_date ?? null,
      },
    });
  }

  private async refreshIntentionCommitment(intention: any) {
    // Sólo refresca si ya existía un mirror (intención aprobada)
    const existing = await this.prisma.budget_commitments.findFirst({
      where: {
        company_id: intention.company_id,
        ref_type: 'intention',
        ref_id: intention.id,
      },
    });
    if (!existing) return;
    await this.mirrorIntentionAsCommitment(intention);
  }

  // ─── Projection snapshot ───────────────────────────────────────────
  async getProjection(companyId: string, params: { periodId?: string; plant?: string }) {
    if (!companyId) {
      return this.emptySnapshot();
    }
    let period: any | null = null;
    if (params.periodId) {
      period = await this.prisma.budget_periods.findFirst({
        where: { id: params.periodId, company_id: companyId },
      });
    } else {
      period = await this.prisma.budget_periods.findFirst({
        where: { company_id: companyId, status: { in: ['borrador', 'aprobado'] } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });
    }
    if (!period) return this.emptySnapshot();
    return this.computeSnapshot(companyId, period.id, params.plant);
  }

  private emptySnapshot() {
    return {
      period: null,
      totals: {
        approved: 0,
        requested: 0,
        committed: 0,
        received: 0,
        accrued: 0,
        paid: 0,
        projectedClose: 0,
        available: 0,
        pendingApprovalCount: 0,
        pendingApprovalAmount: 0,
        workingDaysLeft: 0,
      },
      byCostCenter: [],
      linkedPOs: [],
      alerts: [],
    };
  }

  private async computeSnapshot(companyId: string, periodId: string, plantFilter?: string) {
    const [period, lines, commitments, costCenters, alerts] = await Promise.all([
      this.prisma.budget_periods.findFirst({ where: { id: periodId, company_id: companyId } }),
      this.prisma.budget_lines.findMany({ where: { company_id: companyId, period_id: periodId } }),
      this.prisma.budget_commitments.findMany({
        where: { company_id: companyId, period_id: periodId },
        take: 5000,
      }),
      this.prisma.cost_centers.findMany({ where: { company_id: companyId } }),
      this.prisma.budget_alerts.findMany({
        where: { company_id: companyId, period_id: periodId, acknowledged_at: null },
        orderBy: { created_at: 'desc' },
        take: 100,
      }),
    ]);

    if (!period) return this.emptySnapshot();

    const ccById = new Map(costCenters.map((c) => [c.id, c]));
    const filtered = plantFilter
      ? lines.filter((l) => {
          const cc = ccById.get(l.cost_center_id);
          return cc?.plant === plantFilter;
        })
      : lines;
    const filteredCcIds = new Set(filtered.map((l) => l.cost_center_id));
    const filteredCommitments = plantFilter
      ? commitments.filter((c) => filteredCcIds.has(c.cost_center_id))
      : commitments;

    // Aggregate per cost center
    const ccAgg = new Map<string, {
      approved: number;
      requested: number;
      committed: number;
      received: number;
      accrued: number;
      paid: number;
    }>();
    const ensure = (id: string) => {
      if (!ccAgg.has(id)) {
        ccAgg.set(id, { approved: 0, requested: 0, committed: 0, received: 0, accrued: 0, paid: 0 });
      }
      return ccAgg.get(id)!;
    };
    for (const l of filtered) {
      const a = ensure(l.cost_center_id);
      const amt = Number(l.amount_revised ?? l.amount_approved ?? 0);
      a.approved += amt;
    }
    for (const c of filteredCommitments) {
      const a = ensure(c.cost_center_id);
      const amt = Number(c.amount ?? 0);
      switch (c.tipo) {
        case 'solicitado': a.requested += amt; break;
        case 'comprometido': a.committed += amt; break;
        case 'recibido': a.received += amt; break;
        case 'devengado': a.accrued += amt; break;
        case 'pagado': a.paid += amt; break;
      }
    }

    const byCostCenter = Array.from(ccAgg.entries()).map(([id, a]) => {
      const cc = ccById.get(id);
      // Conservative projection: committed + max(received, accrued) – paid duplicates
      const projectedClose = a.committed + Math.max(a.received, a.accrued, a.paid);
      const utilizationPct = a.approved > 0 ? (projectedClose / a.approved) * 100 : 0;
      const status: 'ok' | 'warning' | 'over' =
        utilizationPct > 100 ? 'over' : utilizationPct >= 85 ? 'warning' : 'ok';
      return {
        costCenterId: id,
        costCenterName: cc?.name ?? id,
        approved: a.approved,
        committed: a.committed,
        received: a.received,
        accrued: a.accrued,
        paid: a.paid,
        projectedClose,
        utilizationPct,
        status,
      };
    }).sort((x, y) => y.projectedClose - x.projectedClose);

    const totals = byCostCenter.reduce((acc, c) => {
      acc.approved += c.approved;
      acc.committed += c.committed;
      acc.received += c.received;
      acc.accrued += c.accrued;
      acc.paid += c.paid;
      acc.projectedClose += c.projectedClose;
      return acc;
    }, { approved: 0, requested: 0, committed: 0, received: 0, accrued: 0, paid: 0, projectedClose: 0 });
    const requestedTotal = filteredCommitments
      .filter((c) => c.tipo === 'solicitado')
      .reduce((s, c) => s + Number(c.amount ?? 0), 0);

    const workingDaysLeft = this.workingDaysLeftInMonth(period.year, period.month);

    const linkedPOs = await this.buildLinkedPOs(
      companyId,
      filteredCommitments,
      ccById,
      byCostCenter,
    );

    return {
      period: this.serializePeriod(period),
      totals: {
        approved: totals.approved,
        requested: requestedTotal,
        committed: totals.committed,
        received: totals.received,
        accrued: totals.accrued,
        paid: totals.paid,
        projectedClose: totals.projectedClose,
        available: Math.max(totals.approved - totals.projectedClose, 0),
        pendingApprovalCount: 0,
        pendingApprovalAmount: 0,
        workingDaysLeft,
      },
      byCostCenter,
      linkedPOs,
      alerts: alerts.map((a) => this.serializeAlert(a)),
    };
  }

  /**
   * Construye la lista de Ordens de Compra ligadas al período a partir de los
   * commitments con ref_type='po'. Enriquece con estado/prazo_entrega de la
   * tabla purchase_orders si la OC todavía existe.
   */
  private async buildLinkedPOs(
    companyId: string,
    commitments: any[],
    ccById: Map<string, any>,
    byCostCenter: Array<{ costCenterId: string; approved: number; projectedClose: number }>,
  ) {
    const poCommitments = commitments.filter((c) => c.ref_type === 'po' && c.ref_id);
    if (poCommitments.length === 0) return [] as any[];

    // Agrupar por ref_id (cada OC puede tener varios commitments: comprometido + recibido + pagado)
    const byPo = new Map<string, any[]>();
    for (const c of poCommitments) {
      const list = byPo.get(c.ref_id) ?? [];
      list.push(c);
      byPo.set(c.ref_id, list);
    }

    const poIds = Array.from(byPo.keys());
    const purchaseOrders = await this.prisma.purchase_orders.findMany({
      where: { id: { in: poIds }, company_id: companyId },
    });
    const poById = new Map(purchaseOrders.map((p) => [p.id, p]));

    const approvedByCc = new Map(byCostCenter.map((c) => [c.costCenterId, c.approved]));
    const projectedByCc = new Map(byCostCenter.map((c) => [c.costCenterId, c.projectedClose]));

    const now = Date.now();
    const result: any[] = [];

    for (const [poId, items] of byPo.entries()) {
      // base = commitment 'comprometido' (o el primero si no hay)
      const base = items.find((i) => i.tipo === 'comprometido') ?? items[0];
      const hasPagado = items.some((i) => i.tipo === 'pagado');
      const amount = Number(base.amount ?? 0);
      const costCenterId = base.cost_center_id as string;
      const cc = ccById.get(costCenterId);
      const po = poById.get(poId);
      const extra = (po?.data && typeof po.data === 'object' ? po.data : {}) as any;

      // payment status
      let paymentStatus: 'a_termino' | 'proximo' | 'vencido' | 'sin_fecha' | 'pagado';
      if (hasPagado) {
        paymentStatus = 'pagado';
      } else if (!base.scheduled_at) {
        paymentStatus = 'sin_fecha';
      } else {
        const due = new Date(base.scheduled_at).getTime();
        if (!Number.isFinite(due)) {
          paymentStatus = 'sin_fecha';
        } else if (due < now) {
          paymentStatus = 'vencido';
        } else if ((due - now) / (1000 * 60 * 60 * 24) <= 10) {
          paymentStatus = 'proximo';
        } else {
          paymentStatus = 'a_termino';
        }
      }

      const approvedCc = approvedByCc.get(costCenterId) ?? 0;
      const projectedCc = projectedByCc.get(costCenterId) ?? 0;
      const exceedsBudget = approvedCc > 0 && projectedCc > approvedCc;

      result.push({
        id: poId,
        numeroOrdem: po?.numero_ordem ?? extra.numeroOrdem ?? base.ref_label ?? poId,
        proveedorNome: base.supplier_name ?? extra.proveedorNome ?? '',
        costCenterId,
        costCenterName: cc?.name ?? null,
        amount,
        deliveryDate: po?.prazo_entrega ?? extra.prazoEntrega ?? null,
        scheduledPaymentDate: base.scheduled_at ?? extra.scheduledPaymentDate ?? null,
        poStatus: po?.estado ?? extra.estado ?? null,
        paymentStatus,
        exceedsBudget,
      });
    }

    // Orden: primero vencidos, luego próximos, luego por monto desc
    const order: Record<string, number> = { vencido: 0, proximo: 1, sin_fecha: 2, a_termino: 3, pagado: 4 };
    result.sort((a, b) => {
      const pa = order[a.paymentStatus] ?? 9;
      const pb = order[b.paymentStatus] ?? 9;
      if (pa !== pb) return pa - pb;
      return b.amount - a.amount;
    });

    return result;
  }

  private workingDaysLeftInMonth(year: number, month: number): number {
    const now = new Date();
    const endOfMonth = new Date(year, month, 0);
    if (now > endOfMonth) return 0;
    let count = 0;
    const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (cursor.getFullYear() !== year || cursor.getMonth() + 1 !== month) {
      // periodo no es el mes corriente
      const start = new Date(year, month - 1, 1);
      for (let d = start; d <= endOfMonth; d.setDate(d.getDate() + 1)) {
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) count++;
      }
      return count;
    }
    for (let d = cursor; d <= endOfMonth; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) count++;
    }
    return count;
  }
}
