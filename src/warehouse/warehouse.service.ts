import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class WarehouseLocationService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return [];
    }

    return this.prisma.warehouse_locations.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    return this.prisma.warehouse_locations.findFirst({
      where: {
        id,
        companyId,
      },
    });
  }

  async createItem(data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    if (!data?.locationId) {
      throw new NotFoundException('locationId é obrigatório');
    }

    return this.prisma.warehouse_locations.create({
      data: {
        id: randomUUID(),
        companyId,
        locationId: data.locationId,
        data: data?.data ?? null,
        updatedAt: new Date(),
      },
    });
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.prisma.warehouse_locations.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Localização de estoque não encontrada');
    }

    return this.prisma.warehouse_locations.update({
      where: { id },
      data: {
        ...(data?.locationId !== undefined ? { locationId: data.locationId } : {}),
        ...(data?.data !== undefined ? { data: data.data } : {}),
        updatedAt: new Date(),
      },
    });
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const deleted = await this.prisma.warehouse_locations.deleteMany({
      where: {
        id,
        companyId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Localização de estoque não encontrada');
    }

    return { id };
  }
}
