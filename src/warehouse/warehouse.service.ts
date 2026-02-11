import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WarehouseService {
  constructor(private prisma: PrismaService) {}

  private toPublic(row: any) {
    if (!row) return null;
    const { data, ...rest } = row;
    return {
      ...((data || {}) as Record<string, any>),
      ...rest,
      data: undefined,
    };
  }

  async listLocations(req: { companyId: string }) {
    const rows = await this.prisma.warehouseLocation.findMany({
      where: { companyId: req.companyId },
    });
    return rows.map((r) => this.toPublic(r));
  }

  async updateLocation(req: { companyId: string }, locationId: string, dto: any) {
    const { locationId: dtoLocId, ...rest } = dto;
    const finalLocationId = locationId || dtoLocId;

    if (!finalLocationId) {
      throw new Error("locationId is required to update a location.");
    }

    const row = await this.prisma.warehouseLocation.upsert({
      where: {
        companyId_locationId: {
          companyId: req.companyId,
          locationId: finalLocationId,
        },
      },
      update: {
        data: rest,
      },
      create: {
        companyId: req.companyId,
        locationId: finalLocationId,
        data: rest,
      },
    });

    return this.toPublic(row);
  }

  async freeLocation(req: { companyId: string }, locationId: string) {
    try {
      await this.prisma.warehouseLocation.delete({
        where: {
          companyId_locationId: {
            companyId: req.companyId,
            locationId: locationId,
          },
        },
      });
      return { ok: true };
    } catch (error) {
      throw new NotFoundException("Localização não encontrada ou já está livre.");
    }
  }
}
