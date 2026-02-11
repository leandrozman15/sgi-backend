import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";

@Injectable()
export class ClientsService {
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

  async list(req: { companyId: string }, limit = 200) {
    const rows = await this.prisma.client.findMany({
      where: { 
        companyId: req.companyId, 
        deletedAt: null 
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 500),
    });
    return rows.map(r => this.toPublic(r));
  }

  async getById(req: { companyId: string }, id: string) {
    const row = await this.prisma.client.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });

    if (!row) {
      throw new NotFoundException("Cliente não encontrado ou já removido.");
    }

    return this.toPublic(row);
  }

  async create(req: { companyId: string }, dto: CreateClientDto) {
    const { nome, ...rest } = dto;
    const row = await this.prisma.client.create({
      data: {
        companyId: req.companyId,
        nome: nome,
        data: rest,
      },
    });
    return this.toPublic(row);
  }

  async update(req: { companyId: string }, id: string, dto: UpdateClientDto) {
    const exists = await this.prisma.client.findFirst({
      where: { id, companyId: req.companyId, deletedAt: null },
    });

    if (!exists) {
      throw new NotFoundException("Cliente não encontrado ou já removido.");
    }

    const { nome, ...rest } = dto;
    const existingData = (exists.data as any) || {};
    const finalData = { ...existingData, ...rest };

    const row = await this.prisma.client.update({
      where: { id },
      data: {
        nome: nome ?? undefined,
        data: finalData,
      },
    });
    return this.toPublic(row);
  }

  async remove(req: { companyId: string }, id: string) {
    const result = await this.prisma.client.updateMany({
      where: { id, companyId: req.companyId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    
    if (result.count === 0) {
      throw new NotFoundException("Cliente não encontrado ou já removido.");
    }

    return { ok: true };
  }
}
