import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class CompanyService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return this.prisma.companies.findMany({
        orderBy: { name: 'asc' },
      });
    }

    const company = await this.prisma.companies.findFirst({
      where: {
        id: companyId,
      },
    });

    return company ? [company] : [];
  }

  async findById(id: string, companyId: string) {
    if (companyId && id !== companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const company = await this.prisma.companies.findFirst({
      where: {
        id,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return company;
  }

  async createItem(data: any, companyId: string) {
    const name = typeof data?.name === 'string' ? data.name.trim() : '';
    if (!name) {
      throw new NotFoundException('Nome da empresa é obrigatório');
    }

    return this.prisma.companies.create({
      data: {
        name,
        cnpj: typeof data?.cnpj === 'string' ? data.cnpj : null,
      },
    });
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (companyId && id !== companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const updateData: { name?: string } = {};
    if (typeof data?.name === 'string' && data.name.trim()) {
      updateData.name = data.name.trim();
    }

    const existing = await this.prisma.companies.findFirst({
      where: {
        id,
      },
    });

    if (!existing) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return this.prisma.companies.update({
      where: { id },
      data: {
        ...updateData,
        cnpj: typeof data?.cnpj === 'string' ? data.cnpj : existing.cnpj,
      },
    });
  }

  async deleteItem(id: string, companyId: string) {
    if (companyId && id !== companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.prisma.companies.findFirst({
      where: {
        id,
      },
    });

    if (!existing) {
      throw new NotFoundException('Empresa não encontrada');
    }

    await this.prisma.companies.delete({
      where: { id },
    });

    return { id };
  }
}
