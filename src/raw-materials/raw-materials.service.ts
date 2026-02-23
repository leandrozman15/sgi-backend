import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class RawMaterialService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return [];
    }

    return this.prisma.raw_materials.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    return this.prisma.raw_materials.findFirst({
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

    return this.prisma.raw_materials.create({
      data: {
        id: randomUUID(),
        companyId,
        nome: data?.nome,
        data: data?.data ?? null,
        updatedAt: new Date(),
      },
    });
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.prisma.raw_materials.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Matéria-prima não encontrada');
    }

    return this.prisma.raw_materials.update({
      where: { id },
      data: {
        ...(data?.nome !== undefined ? { nome: data.nome } : {}),
        ...(data?.data !== undefined ? { data: data.data } : {}),
        updatedAt: new Date(),
      },
    });
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const deleted = await this.prisma.raw_materials.deleteMany({
      where: {
        id,
        companyId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Matéria-prima não encontrada');
    }

    return { id };
  }
}
