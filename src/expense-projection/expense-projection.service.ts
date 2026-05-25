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
      linkedPOs: [] as any[],
      alerts: alerts.map((a) => this.serializeAlert(a)),
    };
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
