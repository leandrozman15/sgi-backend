import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class MachineService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return [];
    }

    return this.prisma.machines.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    return this.prisma.machines.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });
  }

  async createItem(data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return this.prisma.machines.create({
      data: {
        name: data?.name,
        code: data?.code ?? null,
        type: data?.type ?? null,
        status: data?.status ?? null,
        company_id: companyId,
      },
    });
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

    return this.prisma.machines.update({
      where: { id },
      data: {
        ...(data?.name !== undefined ? { name: data.name } : {}),
        ...(data?.code !== undefined ? { code: data.code } : {}),
        ...(data?.type !== undefined ? { type: data.type } : {}),
        ...(data?.status !== undefined ? { status: data.status } : {}),
      },
    });
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
