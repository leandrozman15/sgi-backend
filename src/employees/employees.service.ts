import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class EmployeeService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  private normalizeExtraData(input: any): Record<string, any> {
    const base = input?.data && typeof input.data === 'object' ? input.data : {};

    return {
      ...base,
      ...(input?.role !== undefined ? { role: input.role } : {}),
      ...(input?.accessLevel !== undefined ? { accessLevel: input.accessLevel } : {}),
      ...(input?.phone !== undefined ? { phone: input.phone } : {}),
      ...(input?.address !== undefined ? { address: input.address } : {}),
      ...(input?.commission !== undefined ? { commission: input.commission } : {}),
      ...(input?.hasAccess !== undefined ? { hasAccess: !!input.hasAccess } : {}),
      ...(input?.cpf !== undefined ? { cpf: input.cpf } : {}),
      ...(input?.registrationNumber !== undefined ? { registrationNumber: input.registrationNumber } : {}),
      ...(input?.startDate !== undefined ? { startDate: input.startDate } : {}),
      ...(input?.vacationDays !== undefined ? { vacationDays: input.vacationDays } : {}),
      ...(input?.banco !== undefined ? { banco: input.banco } : {}),
      ...(input?.conta !== undefined ? { conta: input.conta } : {}),
      ...(input?.pix !== undefined ? { pix: input.pix } : {}),
      ...(input?.tamanhoCamisa !== undefined ? { tamanhoCamisa: input.tamanhoCamisa } : {}),
      ...(input?.tamanhoCalca !== undefined ? { tamanhoCalca: input.tamanhoCalca } : {}),
      ...(input?.numeroBotas !== undefined ? { numeroBotas: input.numeroBotas } : {}),
      ...(input?.permissions !== undefined ? { permissions: input.permissions } : {}),
    };
  }

  private toClientEmployee(entity: any) {
    const extra = entity?.data && typeof entity.data === 'object' ? entity.data : {};

    return {
      ...entity,
      role: entity.role ?? extra.role ?? entity.position ?? null,
      accessLevel: entity.access_level ?? extra.accessLevel ?? entity.department ?? null,
      phone: entity.phone ?? extra.phone ?? null,
      address: entity.address ?? extra.address ?? null,
      commission: entity.commission ?? extra.commission ?? null,
      hasAccess: entity.has_access ?? extra.hasAccess ?? (entity.status === 'active'),
      cpf: entity.cpf ?? extra.cpf ?? entity.document ?? null,
      registrationNumber: entity.registration_number ?? extra.registrationNumber ?? null,
      startDate: entity.start_date ?? extra.startDate ?? null,
      vacationDays: entity.vacation_days ?? extra.vacationDays ?? null,
      banco: entity.banco ?? extra.banco ?? null,
      conta: entity.conta ?? extra.conta ?? null,
      pix: entity.pix ?? extra.pix ?? null,
      tamanhoCamisa: entity.tamanho_camisa ?? extra.tamanhoCamisa ?? null,
      tamanhoCalca: entity.tamanho_calca ?? extra.tamanhoCalca ?? null,
      numeroBotas: entity.numero_botas ?? extra.numeroBotas ?? null,
      permissions: entity.permissions ?? extra.permissions ?? {},
    };
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return [];
    }

    const rows = await (this.prisma as any).employees.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });

    return Array.isArray(rows) ? rows.map((row: any) => this.toClientEmployee(row)) : [];
  }

  async findById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    const row = await (this.prisma as any).employees.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    return row ? this.toClientEmployee(row) : null;
  }

  async createItem(data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const extra = this.normalizeExtraData(data);
    const role = data?.role ?? extra.role ?? null;
    const accessLevel = data?.accessLevel ?? extra.accessLevel ?? null;
    const hasAccess = data?.hasAccess !== undefined ? !!data.hasAccess : extra.hasAccess;
    const startDateRaw = data?.startDate ?? extra.startDate;
    const startDate = startDateRaw ? new Date(startDateRaw) : null;
    const normalizedStartDate = startDate && !Number.isNaN(startDate.getTime()) ? startDate : null;

    const created = await (this.prisma as any).employees.create({
      data: {
        name: data?.name,
        email: data?.email ?? null,
        document: data?.document ?? data?.cpf ?? null,
        cpf: data?.cpf ?? extra.cpf ?? null,
        role: role,
        access_level: accessLevel,
        position: data?.position ?? role ?? null,
        department: data?.department ?? accessLevel ?? null,
        status:
          data?.status ??
          (hasAccess !== undefined ? (hasAccess ? 'active' : 'inactive') : null),
        has_access: hasAccess ?? null,
        commission:
          data?.commission !== undefined || extra.commission !== undefined
            ? Number(data?.commission ?? extra.commission ?? 0)
            : null,
        phone: data?.phone ?? extra.phone ?? null,
        address: data?.address ?? extra.address ?? null,
        registration_number: data?.registrationNumber ?? extra.registrationNumber ?? null,
        start_date: normalizedStartDate,
        vacation_days:
          data?.vacationDays !== undefined || extra.vacationDays !== undefined
            ? Number(data?.vacationDays ?? extra.vacationDays ?? 0)
            : null,
        banco: data?.banco ?? extra.banco ?? null,
        conta: data?.conta ?? extra.conta ?? null,
        pix: data?.pix ?? extra.pix ?? null,
        tamanho_camisa: data?.tamanhoCamisa ?? extra.tamanhoCamisa ?? null,
        tamanho_calca: data?.tamanhoCalca ?? extra.tamanhoCalca ?? null,
        numero_botas: data?.numeroBotas ?? extra.numeroBotas ?? null,
        permissions: data?.permissions ?? extra.permissions ?? {},
        data: Object.keys(extra).length > 0 ? extra : undefined,
        company_id: companyId,
      },
    });

    return this.toClientEmployee(created);
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await (this.prisma as any).employees.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Funcionário não encontrado');
    }

    const extra = {
      ...(existing?.data && typeof existing.data === 'object' ? existing.data : {}),
      ...this.normalizeExtraData(data),
    };

    const role = data?.role ?? extra.role;
    const accessLevel = data?.accessLevel ?? extra.accessLevel;
    const hasAccess = data?.hasAccess !== undefined ? !!data.hasAccess : extra.hasAccess;
    const startDateRaw = data?.startDate ?? extra.startDate;
    const startDate = startDateRaw ? new Date(startDateRaw) : null;
    const normalizedStartDate = startDate && !Number.isNaN(startDate.getTime()) ? startDate : null;

    const updated = await (this.prisma as any).employees.update({
      where: { id },
      data: {
        ...(data?.name !== undefined ? { name: data.name } : {}),
        ...(data?.email !== undefined ? { email: data.email } : {}),
        ...(data?.document !== undefined || data?.cpf !== undefined
          ? { document: data?.document ?? data?.cpf ?? null }
          : {}),
        ...(data?.position !== undefined || role !== undefined
          ? { position: data?.position ?? role ?? null }
          : {}),
        ...(data?.department !== undefined || accessLevel !== undefined
          ? { department: data?.department ?? accessLevel ?? null }
          : {}),
        ...(data?.cpf !== undefined || extra.cpf !== undefined
          ? { cpf: data?.cpf ?? extra.cpf ?? null }
          : {}),
        ...(data?.role !== undefined || extra.role !== undefined
          ? { role: data?.role ?? extra.role ?? null }
          : {}),
        ...(data?.accessLevel !== undefined || extra.accessLevel !== undefined
          ? { access_level: data?.accessLevel ?? extra.accessLevel ?? null }
          : {}),
        ...(data?.status !== undefined
          ? { status: data.status }
          : hasAccess !== undefined
            ? { status: hasAccess ? 'active' : 'inactive' }
            : {}),
        ...(data?.hasAccess !== undefined || extra.hasAccess !== undefined
          ? { has_access: hasAccess ?? null }
          : {}),
        ...(data?.commission !== undefined || extra.commission !== undefined
          ? { commission: Number(data?.commission ?? extra.commission ?? 0) }
          : {}),
        ...(data?.phone !== undefined || extra.phone !== undefined
          ? { phone: data?.phone ?? extra.phone ?? null }
          : {}),
        ...(data?.address !== undefined || extra.address !== undefined
          ? { address: data?.address ?? extra.address ?? null }
          : {}),
        ...(data?.registrationNumber !== undefined || extra.registrationNumber !== undefined
          ? { registration_number: data?.registrationNumber ?? extra.registrationNumber ?? null }
          : {}),
        ...(data?.startDate !== undefined || extra.startDate !== undefined
          ? { start_date: normalizedStartDate }
          : {}),
        ...(data?.vacationDays !== undefined || extra.vacationDays !== undefined
          ? { vacation_days: Number(data?.vacationDays ?? extra.vacationDays ?? 0) }
          : {}),
        ...(data?.banco !== undefined || extra.banco !== undefined
          ? { banco: data?.banco ?? extra.banco ?? null }
          : {}),
        ...(data?.conta !== undefined || extra.conta !== undefined
          ? { conta: data?.conta ?? extra.conta ?? null }
          : {}),
        ...(data?.pix !== undefined || extra.pix !== undefined
          ? { pix: data?.pix ?? extra.pix ?? null }
          : {}),
        ...(data?.tamanhoCamisa !== undefined || extra.tamanhoCamisa !== undefined
          ? { tamanho_camisa: data?.tamanhoCamisa ?? extra.tamanhoCamisa ?? null }
          : {}),
        ...(data?.tamanhoCalca !== undefined || extra.tamanhoCalca !== undefined
          ? { tamanho_calca: data?.tamanhoCalca ?? extra.tamanhoCalca ?? null }
          : {}),
        ...(data?.numeroBotas !== undefined || extra.numeroBotas !== undefined
          ? { numero_botas: data?.numeroBotas ?? extra.numeroBotas ?? null }
          : {}),
        ...(data?.permissions !== undefined || extra.permissions !== undefined
          ? { permissions: data?.permissions ?? extra.permissions ?? {} }
          : {}),
        data: Object.keys(extra).length > 0 ? extra : undefined,
      },
    });

    return this.toClientEmployee(updated);
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const deleted = await this.prisma.employees.deleteMany({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Funcionário não encontrado');
    }

    return { id };
  }
}
