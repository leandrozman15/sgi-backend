import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class MaintenanceService {
  private prisma: PrismaService;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  private ensureCompany(companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }
  }

  private parseDate(value: any): Date | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  async findPlans(companyId: string, machineId?: string) {
    if (!companyId) {
      return [];
    }

    return this.prisma.maintenance_plans.findMany({
      where: {
        company_id: companyId,
        ...(machineId ? { machine_id: machineId } : {}),
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findPlanById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    return this.prisma.maintenance_plans.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });
  }

  async createPlan(data: any, companyId: string) {
    this.ensureCompany(companyId);

    if (!data?.machineId || !data?.title) {
      throw new NotFoundException('Campos obrigatórios: machineId, title');
    }

    return this.prisma.maintenance_plans.create({
      data: {
        company_id: companyId,
        machine_id: data.machineId,
        title: data.title,
        description: data?.description ?? null,
        maintenance_type: data?.maintenanceType ?? null,
        frequency_unit: data?.frequencyUnit ?? null,
        frequency_value: data?.frequencyValue !== undefined ? Number(data.frequencyValue) : null,
        estimated_hours: data?.estimatedHours !== undefined ? data.estimatedHours : null,
        checklist: data?.checklist ?? null,
        required_parts: data?.requiredParts ?? null,
        active: data?.active !== undefined ? !!data.active : true,
        last_executed_at: this.parseDate(data?.lastExecutedAt),
        next_due_at: this.parseDate(data?.nextDueAt),
        data: data?.data ?? null,
      },
    });
  }

  async updatePlan(id: string, data: any, companyId: string) {
    this.ensureCompany(companyId);

    const existing = await this.prisma.maintenance_plans.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Plano de manutenção não encontrado');
    }

    return this.prisma.maintenance_plans.update({
      where: { id },
      data: {
        ...(data?.machineId !== undefined ? { machine_id: data.machineId } : {}),
        ...(data?.title !== undefined ? { title: data.title } : {}),
        ...(data?.description !== undefined ? { description: data.description } : {}),
        ...(data?.maintenanceType !== undefined ? { maintenance_type: data.maintenanceType } : {}),
        ...(data?.frequencyUnit !== undefined ? { frequency_unit: data.frequencyUnit } : {}),
        ...(data?.frequencyValue !== undefined ? { frequency_value: Number(data.frequencyValue) } : {}),
        ...(data?.estimatedHours !== undefined ? { estimated_hours: data.estimatedHours } : {}),
        ...(data?.checklist !== undefined ? { checklist: data.checklist } : {}),
        ...(data?.requiredParts !== undefined ? { required_parts: data.requiredParts } : {}),
        ...(data?.active !== undefined ? { active: !!data.active } : {}),
        ...(data?.lastExecutedAt !== undefined ? { last_executed_at: this.parseDate(data.lastExecutedAt) } : {}),
        ...(data?.nextDueAt !== undefined ? { next_due_at: this.parseDate(data.nextDueAt) } : {}),
        ...(data?.data !== undefined ? { data: data.data } : {}),
        updated_at: new Date(),
      },
    });
  }

  async deletePlan(id: string, companyId: string) {
    this.ensureCompany(companyId);

    const deleted = await this.prisma.maintenance_plans.deleteMany({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Plano de manutenção não encontrado');
    }

    return { id };
  }

  async findSchedules(companyId: string, machineId?: string) {
    if (!companyId) {
      return [];
    }

    return this.prisma.maintenance_schedules.findMany({
      where: {
        company_id: companyId,
        ...(machineId ? { machine_id: machineId } : {}),
      },
      orderBy: { scheduled_for: 'asc' },
    });
  }

  async findScheduleById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    return this.prisma.maintenance_schedules.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });
  }

  async createSchedule(data: any, companyId: string) {
    this.ensureCompany(companyId);

    if (!data?.machineId || !data?.scheduledFor) {
      throw new NotFoundException('Campos obrigatórios: machineId, scheduledFor');
    }

    const scheduledFor = this.parseDate(data.scheduledFor);
    if (!scheduledFor) {
      throw new NotFoundException('Data inválida em scheduledFor');
    }

    return this.prisma.maintenance_schedules.create({
      data: {
        company_id: companyId,
        machine_id: data.machineId,
        maintenance_plan_id: data?.maintenancePlanId ?? null,
        scheduled_for: scheduledFor,
        assigned_to_employee_id: data?.assignedToEmployeeId ?? null,
        priority: data?.priority ?? null,
        status: data?.status ?? 'scheduled',
        notes: data?.notes ?? null,
        recurrence_snapshot: data?.recurrenceSnapshot ?? null,
        data: data?.data ?? null,
      },
    });
  }

  async updateSchedule(id: string, data: any, companyId: string) {
    this.ensureCompany(companyId);

    const existing = await this.prisma.maintenance_schedules.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Agendamento de manutenção não encontrado');
    }

    return this.prisma.maintenance_schedules.update({
      where: { id },
      data: {
        ...(data?.machineId !== undefined ? { machine_id: data.machineId } : {}),
        ...(data?.maintenancePlanId !== undefined ? { maintenance_plan_id: data.maintenancePlanId } : {}),
        ...(data?.scheduledFor !== undefined ? { scheduled_for: this.parseDate(data.scheduledFor) } : {}),
        ...(data?.assignedToEmployeeId !== undefined ? { assigned_to_employee_id: data.assignedToEmployeeId } : {}),
        ...(data?.priority !== undefined ? { priority: data.priority } : {}),
        ...(data?.status !== undefined ? { status: data.status } : {}),
        ...(data?.notes !== undefined ? { notes: data.notes } : {}),
        ...(data?.recurrenceSnapshot !== undefined ? { recurrence_snapshot: data.recurrenceSnapshot } : {}),
        ...(data?.data !== undefined ? { data: data.data } : {}),
        updated_at: new Date(),
      },
    });
  }

  async deleteSchedule(id: string, companyId: string) {
    this.ensureCompany(companyId);

    const deleted = await this.prisma.maintenance_schedules.deleteMany({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Agendamento de manutenção não encontrado');
    }

    return { id };
  }

  async findWorkOrders(companyId: string, machineId?: string) {
    if (!companyId) {
      return [];
    }

    return this.prisma.maintenance_work_orders.findMany({
      where: {
        company_id: companyId,
        ...(machineId ? { machine_id: machineId } : {}),
      },
      orderBy: { created_at: 'desc' },
      include: {
        maintenance_work_order_parts: true,
      },
    });
  }

  async findWorkOrderById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    return this.prisma.maintenance_work_orders.findFirst({
      where: {
        id,
        company_id: companyId,
      },
      include: {
        maintenance_work_order_parts: true,
      },
    });
  }

  async createWorkOrder(data: any, companyId: string) {
    this.ensureCompany(companyId);

    if (!data?.machineId) {
      throw new NotFoundException('Campo obrigatório: machineId');
    }

    const created = await this.prisma.maintenance_work_orders.create({
      data: {
        company_id: companyId,
        machine_id: data.machineId,
        maintenance_schedule_id: data?.maintenanceScheduleId ?? null,
        order_number: data?.orderNumber ?? null,
        maintenance_type: data?.maintenanceType ?? null,
        priority: data?.priority ?? null,
        status: data?.status ?? 'open',
        opened_at: this.parseDate(data?.openedAt) ?? new Date(),
        started_at: this.parseDate(data?.startedAt),
        finished_at: this.parseDate(data?.finishedAt),
        reported_by: data?.reportedBy ?? null,
        assigned_to: data?.assignedTo ?? null,
        approved_by: data?.approvedBy ?? null,
        failure_mode: data?.failureMode ?? null,
        root_cause: data?.rootCause ?? null,
        actions_taken: data?.actionsTaken ?? null,
        observations: data?.observations ?? null,
        downtime_minutes: data?.downtimeMinutes !== undefined ? Number(data.downtimeMinutes) : null,
        labor_cost: data?.laborCost !== undefined ? data.laborCost : null,
        parts_cost: data?.partsCost !== undefined ? data.partsCost : null,
        external_cost: data?.externalCost !== undefined ? data.externalCost : null,
        total_cost: data?.totalCost !== undefined ? data.totalCost : null,
        data: data?.data ?? null,
      },
    });

    if (Array.isArray(data?.parts) && data.parts.length > 0) {
      await this.prisma.maintenance_work_order_parts.createMany({
        data: data.parts.map((part: any) => ({
          company_id: companyId,
          maintenance_work_order_id: created.id,
          raw_material_id: part?.rawMaterialId ?? null,
          product_id: part?.productId ?? null,
          description: part?.description ?? null,
          quantity: part?.quantity ?? null,
          unit_cost: part?.unitCost ?? null,
          total_cost: part?.totalCost ?? null,
          data: part?.data ?? null,
        })),
      });
    }

    return this.findWorkOrderById(created.id, companyId);
  }

  async updateWorkOrder(id: string, data: any, companyId: string) {
    this.ensureCompany(companyId);

    const existing = await this.prisma.maintenance_work_orders.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Ordem de manutenção não encontrada');
    }

    await this.prisma.maintenance_work_orders.update({
      where: { id },
      data: {
        ...(data?.machineId !== undefined ? { machine_id: data.machineId } : {}),
        ...(data?.maintenanceScheduleId !== undefined ? { maintenance_schedule_id: data.maintenanceScheduleId } : {}),
        ...(data?.orderNumber !== undefined ? { order_number: data.orderNumber } : {}),
        ...(data?.maintenanceType !== undefined ? { maintenance_type: data.maintenanceType } : {}),
        ...(data?.priority !== undefined ? { priority: data.priority } : {}),
        ...(data?.status !== undefined ? { status: data.status } : {}),
        ...(data?.openedAt !== undefined ? { opened_at: this.parseDate(data.openedAt) } : {}),
        ...(data?.startedAt !== undefined ? { started_at: this.parseDate(data.startedAt) } : {}),
        ...(data?.finishedAt !== undefined ? { finished_at: this.parseDate(data.finishedAt) } : {}),
        ...(data?.reportedBy !== undefined ? { reported_by: data.reportedBy } : {}),
        ...(data?.assignedTo !== undefined ? { assigned_to: data.assignedTo } : {}),
        ...(data?.approvedBy !== undefined ? { approved_by: data.approvedBy } : {}),
        ...(data?.failureMode !== undefined ? { failure_mode: data.failureMode } : {}),
        ...(data?.rootCause !== undefined ? { root_cause: data.rootCause } : {}),
        ...(data?.actionsTaken !== undefined ? { actions_taken: data.actionsTaken } : {}),
        ...(data?.observations !== undefined ? { observations: data.observations } : {}),
        ...(data?.downtimeMinutes !== undefined ? { downtime_minutes: Number(data.downtimeMinutes) } : {}),
        ...(data?.laborCost !== undefined ? { labor_cost: data.laborCost } : {}),
        ...(data?.partsCost !== undefined ? { parts_cost: data.partsCost } : {}),
        ...(data?.externalCost !== undefined ? { external_cost: data.externalCost } : {}),
        ...(data?.totalCost !== undefined ? { total_cost: data.totalCost } : {}),
        ...(data?.data !== undefined ? { data: data.data } : {}),
        updated_at: new Date(),
      },
    });

    if (Array.isArray(data?.parts)) {
      await this.prisma.maintenance_work_order_parts.deleteMany({
        where: {
          company_id: companyId,
          maintenance_work_order_id: id,
        },
      });

      if (data.parts.length > 0) {
        await this.prisma.maintenance_work_order_parts.createMany({
          data: data.parts.map((part: any) => ({
            company_id: companyId,
            maintenance_work_order_id: id,
            raw_material_id: part?.rawMaterialId ?? null,
            product_id: part?.productId ?? null,
            description: part?.description ?? null,
            quantity: part?.quantity ?? null,
            unit_cost: part?.unitCost ?? null,
            total_cost: part?.totalCost ?? null,
            data: part?.data ?? null,
          })),
        });
      }
    }

    return this.findWorkOrderById(id, companyId);
  }

  async deleteWorkOrder(id: string, companyId: string) {
    this.ensureCompany(companyId);

    const deleted = await this.prisma.maintenance_work_orders.deleteMany({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Ordem de manutenção não encontrada');
    }

    return { id };
  }
}
