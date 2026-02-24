import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CompaniesService {
  private prisma: PrismaService;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  async findAll() {
    return this.prisma.companies.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.companies.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return company;
  }

  async create(createCompanyDto: any) {
    return this.prisma.companies.create({
      data: {
        name: createCompanyDto?.name,
        cnpj: createCompanyDto?.cnpj ?? null,
        plan: createCompanyDto?.plan ?? 'basic',
        active: createCompanyDto?.active ?? true,
      },
    });
  }

  async update(id: string, updateCompanyDto: any) {
    const existing = await this.prisma.companies.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return this.prisma.companies.update({
      where: { id },
      data: {
        ...(updateCompanyDto?.name !== undefined ? { name: updateCompanyDto.name } : {}),
        ...(updateCompanyDto?.cnpj !== undefined ? { cnpj: updateCompanyDto.cnpj } : {}),
        ...(updateCompanyDto?.plan !== undefined ? { plan: updateCompanyDto.plan } : {}),
        ...(updateCompanyDto?.active !== undefined ? { active: updateCompanyDto.active } : {}),
        updated_at: new Date(),
      },
    });
  }

  async delete(id: string) {
    const deleted = await this.prisma.companies.deleteMany({
      where: { id },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return { message: 'Empresa deletada com sucesso' };
  }

  async activate(id: string) {
    const updated = await this.prisma.companies.updateMany({
      where: { id },
      data: { active: true, updated_at: new Date() },
    });

    if (updated.count === 0) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return this.findOne(id);
  }

  async deactivate(id: string) {
    const updated = await this.prisma.companies.updateMany({
      where: { id },
      data: { active: false, updated_at: new Date() },
    });

    if (updated.count === 0) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return this.findOne(id);
  }
}
