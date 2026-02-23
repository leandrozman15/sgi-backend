import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class ProductService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return [];
    }

    return this.prisma.products.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    return this.prisma.products.findFirst({
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

    if (!data?.name) {
      throw new NotFoundException('Nome do produto é obrigatório');
    }

    return this.prisma.products.create({
      data: {
        id: randomUUID(),
        name: data.name,
        code: data?.code ?? null,
        description: data?.description ?? null,
        price: data?.price ?? null,
        company_id: companyId,
        updated_at: new Date(),
      },
    });
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.prisma.products.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Produto não encontrado');
    }

    return this.prisma.products.update({
      where: { id },
      data: {
        ...(data?.name !== undefined ? { name: data.name } : {}),
        ...(data?.code !== undefined ? { code: data.code } : {}),
        ...(data?.description !== undefined ? { description: data.description } : {}),
        ...(data?.price !== undefined ? { price: data.price } : {}),
        updated_at: new Date(),
      },
    });
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const deleted = await this.prisma.products.deleteMany({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Produto não encontrado');
    }

    return { id };
  }
}
