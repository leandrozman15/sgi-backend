import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class MembershipService {
  private prisma: PrismaService;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return this.prisma.memberships.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.memberships.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, companyId: string) {
    const membership = await this.prisma.memberships.findFirst({
      where: {
        id,
        ...(companyId ? { companyId } : {}),
      },
    });

    if (!membership) {
      throw new NotFoundException('Membership não encontrada');
    }

    return membership;
  }

  async createItem(data: any, companyId: string) {
    if (!data?.userId) {
      throw new NotFoundException('userId é obrigatório');
    }

    const resolvedCompanyId = companyId || data?.companyId;
    if (!resolvedCompanyId) {
      throw new NotFoundException('companyId é obrigatório');
    }

    const roles = Array.isArray(data?.roles)
      ? data.roles.filter((role: unknown): role is string => typeof role === 'string' && role.length > 0)
      : [typeof data?.role === 'string' && data.role.length > 0 ? data.role : 'CONSULTOR'];

    return this.prisma.memberships.create({
      data: {
        id: randomUUID(),
        userId: data.userId,
        companyId: resolvedCompanyId,
        roles,
      },
    });
  }

  async updateItem(id: string, data: any, companyId: string) {
    const existing = await this.prisma.memberships.findFirst({
      where: {
        id,
        ...(companyId ? { companyId } : {}),
      },
    });

    if (!existing) {
      throw new NotFoundException('Membership não encontrada');
    }

    const roles = Array.isArray(data?.roles)
      ? data.roles.filter((role: unknown): role is string => typeof role === 'string' && role.length > 0)
      : typeof data?.role === 'string' && data.role.length > 0
        ? [data.role]
        : existing.roles;

    return this.prisma.memberships.update({
      where: { id },
      data: {
        roles,
      },
    });
  }

  async deleteItem(id: string, companyId: string) {
    const deleted = await this.prisma.memberships.deleteMany({
      where: {
        id,
        ...(companyId ? { companyId } : {}),
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Membership não encontrada');
    }

    return { id };
  }
}
