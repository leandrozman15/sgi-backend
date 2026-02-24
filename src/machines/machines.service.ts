import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class MachineService {
  private prisma: PrismaService;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  private parseDate(value: any): Date | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private normalizeExtraData(input: any): Record<string, any> {
    const base = input?.data && typeof input.data === 'object' ? input.data : {};

    return {
      ...base,
      ...(input?.fabricationDate !== undefined ? { fabricationDate: input.fabricationDate } : {}),
      ...(input?.description !== undefined ? { description: input.description } : {}),
      ...(input?.powerSupplyType !== undefined ? { powerSupplyType: input.powerSupplyType } : {}),
      ...(input?.nominalVoltage !== undefined ? { nominalVoltage: input.nominalVoltage } : {}),
      ...(input?.frequency !== undefined ? { frequency: input.frequency } : {}),
      ...(input?.nominalCurrent !== undefined ? { nominalCurrent: input.nominalCurrent } : {}),
      ...(input?.installedPower !== undefined ? { installedPower: input.installedPower } : {}),
      ...(input?.connectionType !== undefined ? { connectionType: input.connectionType } : {}),
      ...(input?.requiredProtection !== undefined ? { requiredProtection: input.requiredProtection } : {}),
      ...(input?.motorPower !== undefined ? { motorPower: input.motorPower } : {}),
      ...(input?.operationSpeed !== undefined ? { operationSpeed: input.operationSpeed } : {}),
      ...(input?.transmissionType !== undefined ? { transmissionType: input.transmissionType } : {}),
      ...(input?.maxWorkCapacity !== undefined ? { maxWorkCapacity: input.maxWorkCapacity } : {}),
      ...(input?.tempRange !== undefined ? { tempRange: input.tempRange } : {}),
      ...(input?.noiseLevel !== undefined ? { noiseLevel: input.noiseLevel } : {}),
      ...(input?.vibrations !== undefined ? { vibrations: input.vibrations } : {}),
      ...(input?.compressedAir !== undefined ? { compressedAir: input.compressedAir } : {}),
      ...(input?.waterCooling !== undefined ? { waterCooling: input.waterCooling } : {}),
      ...(input?.safetySystems !== undefined ? { safetySystems: input.safetySystems } : {}),
      ...(input?.assignedTo !== undefined ? { assignedTo: input.assignedTo } : {}),
    };
  }

  private toClient(entity: any) {
    const extra = entity?.data && typeof entity.data === 'object' ? entity.data : {};

    return {
      ...entity,
      model: entity.model ?? null,
      manufacturer: entity.manufacturer ?? extra.manufacturer ?? null,
      description: extra.description ?? null,
      fabricationDate: extra.fabricationDate ?? null,
      powerSupplyType: extra.powerSupplyType ?? null,
      nominalVoltage: extra.nominalVoltage ?? null,
      frequency: extra.frequency ?? null,
      nominalCurrent: extra.nominalCurrent ?? null,
      installedPower: extra.installedPower ?? null,
      connectionType: extra.connectionType ?? null,
      requiredProtection: extra.requiredProtection ?? null,
      motorPower: extra.motorPower ?? null,
      operationSpeed: extra.operationSpeed ?? null,
      transmissionType: extra.transmissionType ?? null,
      maxWorkCapacity: extra.maxWorkCapacity ?? null,
      tempRange: entity.temperature_range ?? extra.tempRange ?? null,
      lubricationReqs: entity.lubrication_reqs ?? extra.lubricationReqs ?? null,
      noiseLevel: extra.noiseLevel ?? null,
      vibrations: extra.vibrations ?? null,
      compressedAir: extra.compressedAir ?? null,
      waterCooling: extra.waterCooling ?? null,
      otherInputs: entity.other_inputs ?? extra.otherInputs ?? null,
      requiredEpp: entity.required_epp ?? extra.requiredEpp ?? null,
      safetySystems: extra.safetySystems ?? null,
      mainRisks: entity.main_risks ?? extra.mainRisks ?? null,
      lubricationPoints: entity.lubrication_points ?? extra.lubricationPoints ?? null,
      maintenanceIntervals: entity.maintenance_intervals ?? extra.maintenanceIntervals ?? null,
      criticalSpares: entity.critical_spares ?? extra.criticalSpares ?? null,
      manualUrl: entity.manual_url ?? extra.manualUrl ?? null,
      maintenanceNotes: entity.maintenance_notes ?? extra.maintenanceNotes ?? null,
      maintenanceHistory: entity.maintenance_history ?? [],
      lastMaintenance: entity.last_maintenance ?? null,
      nextMaintenance: entity.next_maintenance ?? null,
      assignedTo: extra.assignedTo ?? null,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return [];
    }

    const rows = await this.prisma.machines.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });

    return rows.map((row) => this.toClient(row));
  }

  async findById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    const row = await this.prisma.machines.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    return row ? this.toClient(row) : null;
  }

  async createItem(data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const extra = this.normalizeExtraData(data);

    const created = await this.prisma.machines.create({
      data: {
        name: data?.name,
        model: data?.model ?? null,
        code: data?.code ?? null,
        type: data?.type ?? null,
        manufacturer: data?.manufacturer ?? null,
        temperature_range: data?.tempRange ?? null,
        lubrication_reqs: data?.lubricationReqs ?? null,
        other_inputs: data?.otherInputs ?? null,
        required_epp: data?.requiredEpp ?? null,
        main_risks: data?.mainRisks ?? null,
        lubrication_points: data?.lubricationPoints ?? null,
        maintenance_intervals: data?.maintenanceIntervals ?? null,
        critical_spares: data?.criticalSpares ?? null,
        manual_url: data?.manualUrl ?? null,
        maintenance_notes: data?.maintenanceNotes ?? null,
        maintenance_history: data?.maintenanceHistory ?? null,
        last_maintenance: this.parseDate(data?.lastMaintenance),
        next_maintenance: this.parseDate(data?.nextMaintenance),
        data: Object.keys(extra).length > 0 ? extra : undefined,
        status: data?.status ?? null,
        company_id: companyId,
      },
    });

    return this.toClient(created);
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.prisma.machines.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Máquina não encontrada');
    }

    const extra = {
      ...(existing?.data && typeof existing.data === 'object' ? existing.data : {}),
      ...this.normalizeExtraData(data),
    };

    const updated = await this.prisma.machines.update({
      where: { id },
      data: {
        ...(data?.name !== undefined ? { name: data.name } : {}),
        ...(data?.model !== undefined ? { model: data.model } : {}),
        ...(data?.code !== undefined ? { code: data.code } : {}),
        ...(data?.type !== undefined ? { type: data.type } : {}),
        ...(data?.manufacturer !== undefined ? { manufacturer: data.manufacturer } : {}),
        ...(data?.tempRange !== undefined ? { temperature_range: data.tempRange } : {}),
        ...(data?.lubricationReqs !== undefined ? { lubrication_reqs: data.lubricationReqs } : {}),
        ...(data?.otherInputs !== undefined ? { other_inputs: data.otherInputs } : {}),
        ...(data?.requiredEpp !== undefined ? { required_epp: data.requiredEpp } : {}),
        ...(data?.mainRisks !== undefined ? { main_risks: data.mainRisks } : {}),
        ...(data?.lubricationPoints !== undefined ? { lubrication_points: data.lubricationPoints } : {}),
        ...(data?.maintenanceIntervals !== undefined ? { maintenance_intervals: data.maintenanceIntervals } : {}),
        ...(data?.criticalSpares !== undefined ? { critical_spares: data.criticalSpares } : {}),
        ...(data?.manualUrl !== undefined ? { manual_url: data.manualUrl } : {}),
        ...(data?.maintenanceNotes !== undefined ? { maintenance_notes: data.maintenanceNotes } : {}),
        ...(data?.maintenanceHistory !== undefined ? { maintenance_history: data.maintenanceHistory } : {}),
        ...(data?.lastMaintenance !== undefined ? { last_maintenance: this.parseDate(data.lastMaintenance) } : {}),
        ...(data?.nextMaintenance !== undefined ? { next_maintenance: this.parseDate(data.nextMaintenance) } : {}),
        ...(data?.status !== undefined ? { status: data.status } : {}),
        data: Object.keys(extra).length > 0 ? extra : undefined,
        updated_at: new Date(),
      },
    });

    return this.toClient(updated);
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const deleted = await this.prisma.machines.deleteMany({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Máquina não encontrada');
    }

    return { id };
  }
}
