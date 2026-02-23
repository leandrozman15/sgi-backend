import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class EmployeeService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return [];
    }

    return this.prisma.employees.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    return this.prisma.employees.findFirst({
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

    return this.prisma.employees.create({
      data: {
        name: data?.name,
        email: data?.email ?? null,
        document: data?.document ?? null,
        position: data?.position ?? null,
        department: data?.department ?? null,
        status: data?.status ?? null,
        company_id: companyId,
      },
    });
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.prisma.employees.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Funcionário não encontrado');
    }

    return this.prisma.employees.update({
      where: { id },
      data: {
        ...(data?.name !== undefined ? { name: data.name } : {}),
        ...(data?.email !== undefined ? { email: data.email } : {}),
        ...(data?.document !== undefined ? { document: data.document } : {}),
        ...(data?.position !== undefined ? { position: data.position } : {}),
        ...(data?.department !== undefined ? { department: data.department } : {}),
        ...(data?.status !== undefined ? { status: data.status } : {}),
      },
    });
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
