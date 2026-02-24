import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class WarehouseTraceabilityService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  private ensureCompany(companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }
  }

  private cleanUndefined(input: Record<string, any>) {
    return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
  }

  async listLots(companyId: string, query: any) {
    if (!companyId) return [];

    return this.prisma.inventory_lots.findMany({
      where: this.cleanUndefined({
        company_id: companyId,
        item_type: query?.itemType,
        quality_status: query?.status,
        lot_code: query?.lotCode,
      }),
      orderBy: { created_at: 'desc' },
    });
  }

  async getLotById(id: string, companyId: string) {
    if (!companyId) return null;
    return this.prisma.inventory_lots.findFirst({ where: { id, company_id: companyId } });
  }

  async createLot(data: any, companyId: string) {
    this.ensureCompany(companyId);

    if (!data?.item_type || !data?.lot_code) {
      throw new NotFoundException('item_type e lot_code são obrigatórios');
    }

    return this.prisma.inventory_lots.create({
      data: {
        id: randomUUID(),
        company_id: companyId,
        item_type: data.item_type,
        raw_material_id: data.raw_material_id ?? null,
        product_id: data.product_id ?? null,
        lot_code: data.lot_code,
        supplier_id: data.supplier_id ?? null,
        manufacture_date: data.manufacture_date ? new Date(data.manufacture_date) : null,
        expiration_date: data.expiration_date ? new Date(data.expiration_date) : null,
        received_at: data.received_at ? new Date(data.received_at) : null,
        quality_status: data.quality_status ?? 'approved',
        traceability_ref: data.traceability_ref ?? null,
        metadata: data.metadata ?? null,
      },
    });
  }

  async updateLot(id: string, data: any, companyId: string) {
    this.ensureCompany(companyId);

    const existing = await this.getLotById(id, companyId);
    if (!existing) throw new NotFoundException('Lote não encontrado');

    return this.prisma.inventory_lots.update({
      where: { id },
      data: this.cleanUndefined({
        item_type: data?.item_type,
        raw_material_id: data?.raw_material_id,
        product_id: data?.product_id,
        lot_code: data?.lot_code,
        supplier_id: data?.supplier_id,
        manufacture_date: data?.manufacture_date ? new Date(data.manufacture_date) : undefined,
        expiration_date: data?.expiration_date ? new Date(data.expiration_date) : undefined,
        received_at: data?.received_at ? new Date(data.received_at) : undefined,
        quality_status: data?.quality_status,
        traceability_ref: data?.traceability_ref,
        metadata: data?.metadata,
        updated_at: new Date(),
      }),
    });
  }

  async deleteLot(id: string, companyId: string) {
    this.ensureCompany(companyId);
    const deleted = await this.prisma.inventory_lots.deleteMany({ where: { id, company_id: companyId } });
    if (!deleted.count) throw new NotFoundException('Lote não encontrado');
    return { id };
  }

  async listPositions(companyId: string, query: any) {
    if (!companyId) return [];

    return this.prisma.inventory_storage_positions.findMany({
      where: this.cleanUndefined({
        company_id: companyId,
        zone_id: query?.zoneId,
        status: query?.status,
      }),
      orderBy: [{ zone_id: 'asc' }, { code: 'asc' }],
    });
  }

  async getPositionById(id: string, companyId: string) {
    if (!companyId) return null;
    return this.prisma.inventory_storage_positions.findFirst({ where: { id, company_id: companyId } });
  }

  async createPosition(data: any, companyId: string) {
    this.ensureCompany(companyId);

    if (!data?.zone_id || !data?.code) {
      throw new NotFoundException('zone_id e code são obrigatórios');
    }

    return this.prisma.inventory_storage_positions.create({
      data: {
        id: randomUUID(),
        company_id: companyId,
        zone_id: data.zone_id,
        code: data.code,
        aisle: data.aisle ?? null,
        column_number: data.column_number ?? null,
        level_number: data.level_number ?? null,
        position_type: data.position_type ?? null,
        status: data.status ?? 'available',
        max_weight_kg: data.max_weight_kg ?? null,
        max_volume_m3: data.max_volume_m3 ?? null,
        barcode: data.barcode ?? null,
        qr_code: data.qr_code ?? null,
        metadata: data.metadata ?? null,
      },
    });
  }

  async updatePosition(id: string, data: any, companyId: string) {
    this.ensureCompany(companyId);
    const existing = await this.getPositionById(id, companyId);
    if (!existing) throw new NotFoundException('Posição de armazenamento não encontrada');

    return this.prisma.inventory_storage_positions.update({
      where: { id },
      data: this.cleanUndefined({
        zone_id: data?.zone_id,
        code: data?.code,
        aisle: data?.aisle,
        column_number: data?.column_number,
        level_number: data?.level_number,
        position_type: data?.position_type,
        status: data?.status,
        max_weight_kg: data?.max_weight_kg,
        max_volume_m3: data?.max_volume_m3,
        barcode: data?.barcode,
        qr_code: data?.qr_code,
        metadata: data?.metadata,
        updated_at: new Date(),
      }),
    });
  }

  async deletePosition(id: string, companyId: string) {
    this.ensureCompany(companyId);
    const deleted = await this.prisma.inventory_storage_positions.deleteMany({ where: { id, company_id: companyId } });
    if (!deleted.count) throw new NotFoundException('Posição de armazenamento não encontrada');
    return { id };
  }

  async listReservations(companyId: string, query: any) {
    if (!companyId) return [];

    return this.prisma.inventory_reservations.findMany({
      where: this.cleanUndefined({
        company_id: companyId,
        lot_id: query?.lotId,
        storage_position_id: query?.positionId,
        status: query?.status,
      }),
      orderBy: { reserved_at: 'desc' },
    });
  }

  async getReservationById(id: string, companyId: string) {
    if (!companyId) return null;
    return this.prisma.inventory_reservations.findFirst({ where: { id, company_id: companyId } });
  }

  async createReservation(data: any, companyId: string) {
    this.ensureCompany(companyId);

    if (!data?.lot_id || !data?.storage_position_id || data?.quantity === undefined) {
      throw new NotFoundException('lot_id, storage_position_id e quantity são obrigatórios');
    }

    return this.prisma.inventory_reservations.create({
      data: {
        id: randomUUID(),
        company_id: companyId,
        lot_id: data.lot_id,
        storage_position_id: data.storage_position_id,
        quantity: data.quantity,
        reservation_type: data.reservation_type ?? null,
        reference_type: data.reference_type ?? null,
        reference_id: data.reference_id ?? null,
        status: data.status ?? 'active',
        reserved_by: data.reserved_by ?? null,
        reserved_at: data.reserved_at ? new Date(data.reserved_at) : new Date(),
        expires_at: data.expires_at ? new Date(data.expires_at) : null,
        released_at: data.released_at ? new Date(data.released_at) : null,
        notes: data.notes ?? null,
        metadata: data.metadata ?? null,
      },
    });
  }

  async updateReservation(id: string, data: any, companyId: string) {
    this.ensureCompany(companyId);
    const existing = await this.getReservationById(id, companyId);
    if (!existing) throw new NotFoundException('Reserva não encontrada');

    return this.prisma.inventory_reservations.update({
      where: { id },
      data: this.cleanUndefined({
        lot_id: data?.lot_id,
        storage_position_id: data?.storage_position_id,
        quantity: data?.quantity,
        reservation_type: data?.reservation_type,
        reference_type: data?.reference_type,
        reference_id: data?.reference_id,
        status: data?.status,
        reserved_by: data?.reserved_by,
        reserved_at: data?.reserved_at ? new Date(data.reserved_at) : undefined,
        expires_at: data?.expires_at ? new Date(data.expires_at) : undefined,
        released_at: data?.released_at ? new Date(data.released_at) : undefined,
        notes: data?.notes,
        metadata: data?.metadata,
        updated_at: new Date(),
      }),
    });
  }

  async deleteReservation(id: string, companyId: string) {
    this.ensureCompany(companyId);
    const deleted = await this.prisma.inventory_reservations.deleteMany({ where: { id, company_id: companyId } });
    if (!deleted.count) throw new NotFoundException('Reserva não encontrada');
    return { id };
  }

  async listMovements(companyId: string, query: any) {
    if (!companyId) return [];

    return this.prisma.inventory_lot_movements.findMany({
      where: this.cleanUndefined({
        company_id: companyId,
        lot_id: query?.lotId,
        source_position_id: query?.sourcePositionId,
        destination_position_id: query?.destinationPositionId,
        movement_type: query?.movementType,
      }),
      orderBy: { movement_date: 'desc' },
    });
  }

  async getMovementById(id: string, companyId: string) {
    if (!companyId) return null;
    return this.prisma.inventory_lot_movements.findFirst({ where: { id, company_id: companyId } });
  }

  async createMovement(data: any, companyId: string) {
    this.ensureCompany(companyId);

    if (!data?.lot_id || !data?.movement_type || data?.quantity === undefined) {
      throw new NotFoundException('lot_id, movement_type e quantity são obrigatórios');
    }

    return this.prisma.inventory_lot_movements.create({
      data: {
        id: randomUUID(),
        company_id: companyId,
        lot_id: data.lot_id,
        movement_type: data.movement_type,
        quantity: data.quantity,
        source_position_id: data.source_position_id ?? null,
        destination_position_id: data.destination_position_id ?? null,
        reference_type: data.reference_type ?? null,
        reference_id: data.reference_id ?? null,
        unit_cost: data.unit_cost ?? null,
        total_cost: data.total_cost ?? null,
        movement_date: data.movement_date ? new Date(data.movement_date) : new Date(),
        performed_by: data.performed_by ?? null,
        notes: data.notes ?? null,
        metadata: data.metadata ?? null,
      },
    });
  }

  async updateMovement(id: string, data: any, companyId: string) {
    this.ensureCompany(companyId);
    const existing = await this.getMovementById(id, companyId);
    if (!existing) throw new NotFoundException('Movimentação não encontrada');

    return this.prisma.inventory_lot_movements.update({
      where: { id },
      data: this.cleanUndefined({
        lot_id: data?.lot_id,
        movement_type: data?.movement_type,
        quantity: data?.quantity,
        source_position_id: data?.source_position_id,
        destination_position_id: data?.destination_position_id,
        reference_type: data?.reference_type,
        reference_id: data?.reference_id,
        unit_cost: data?.unit_cost,
        total_cost: data?.total_cost,
        movement_date: data?.movement_date ? new Date(data.movement_date) : undefined,
        performed_by: data?.performed_by,
        notes: data?.notes,
        metadata: data?.metadata,
        updated_at: new Date(),
      }),
    });
  }

  async deleteMovement(id: string, companyId: string) {
    this.ensureCompany(companyId);
    const deleted = await this.prisma.inventory_lot_movements.deleteMany({ where: { id, company_id: companyId } });
    if (!deleted.count) throw new NotFoundException('Movimentação não encontrada');
    return { id };
  }
}
