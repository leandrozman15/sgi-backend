import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AuditLogService {
  private prisma: PrismaService;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return [];
    }

    return this.prisma.audit_logs.findMany({
      where: { companyId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async findById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    return this.prisma.audit_logs.findFirst({
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

    if (!data?.user || !data?.module || !data?.action) {
      throw new NotFoundException('Campos obrigatórios: user, module, action');
    }

    return this.prisma.audit_logs.create({
      data: {
        id: randomUUID(),
        companyId,
        user: data.user,
        module: data.module,
        action: data.action,
        data: data?.data ?? null,
      },
    });
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.prisma.audit_logs.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Log não encontrado');
    }

    return this.prisma.audit_logs.update({
      where: { id },
      data: {
        ...(data?.user !== undefined ? { user: data.user } : {}),
        ...(data?.module !== undefined ? { module: data.module } : {}),
        ...(data?.action !== undefined ? { action: data.action } : {}),
        ...(data?.data !== undefined ? { data: data.data } : {}),
      },
    });
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const deleted = await this.prisma.audit_logs.deleteMany({
      where: {
        id,
        companyId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Log não encontrado');
    }

    return { id };
  }
}
