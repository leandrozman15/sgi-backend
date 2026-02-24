import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class SaleService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  private normalizeData(input: any): Record<string, any> {
    if (input?.data && typeof input.data === 'object') {
      return input.data;
    }

    const {
      id,
      companyId,
      createdAt,
      updatedAt,
      ...rest
    } = input || {};

    return rest;
  }

  private toClient(entity: any) {
    const extra = entity?.data && typeof entity.data === 'object' ? entity.data : {};

    return {
      ...entity,
      ...extra,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return [];
    }

    const rows = await this.prisma.sales.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.toClient(row));
  }

  async findById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    const row = await this.prisma.sales.findFirst({
      where: {
        id,
        companyId,
      },
    });

    return row ? this.toClient(row) : null;
  }

  async findByAccessKey(accessKey: string, companyId: string) {
    if (!companyId || !accessKey) {
      return null;
    }

    const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>
      `
        SELECT *
        FROM "sales"
        WHERE "companyId" = ${companyId}
          AND COALESCE(data->>'chaveAcesso', '') = ${accessKey}
        ORDER BY "createdAt" DESC
        LIMIT 1
      `;

    return rows[0] ? this.toClient(rows[0]) : null;
  }

  async getFiscalHistory(saleId: string, companyId: string) {
    if (!companyId) {
      return [];
    }

    return this.prisma.sales_fiscal_documents.findMany({
      where: {
        company_id: companyId,
        sale_id: saleId,
      },
      include: {
        events: {
          orderBy: {
            created_at: 'desc',
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async upsertFiscalDocument(saleId: string, companyId: string, payload: any) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const sale = await this.prisma.sales.findFirst({
      where: {
        id: saleId,
        companyId,
      },
    });

    if (!sale) {
      throw new NotFoundException('Venda não encontrada');
    }

    const accessKey = payload?.accessKey ? String(payload.accessKey) : undefined;
    const now = new Date();
    const commonData = {
      document_type: payload?.documentType ?? 'NFE',
      document_number: payload?.documentNumber ? String(payload.documentNumber) : null,
      series: payload?.series ? String(payload.series) : null,
      access_key: accessKey ?? null,
      status: payload?.status ? String(payload.status) : null,
      issue_date: payload?.issueDate ? new Date(payload.issueDate) : null,
      authorization_date: payload?.authorizationDate ? new Date(payload.authorizationDate) : null,
      cancellation_date: payload?.cancellationDate ? new Date(payload.cancellationDate) : null,
      sefaz_status_code: payload?.sefazStatusCode ? String(payload.sefazStatusCode) : null,
      sefaz_status_message: payload?.sefazStatusMessage ? String(payload.sefazStatusMessage) : null,
      protocol_number: payload?.protocolNumber ? String(payload.protocolNumber) : null,
      xml_url: payload?.xmlUrl ? String(payload.xmlUrl) : null,
      danfe_url: payload?.danfeUrl ? String(payload.danfeUrl) : null,
      data: payload?.data && typeof payload.data === 'object' ? payload.data : undefined,
      updated_at: now,
    };

    if (accessKey) {
      return this.prisma.sales_fiscal_documents.upsert({
        where: {
          company_id_access_key: {
            company_id: companyId,
            access_key: accessKey,
          },
        },
        create: {
          company_id: companyId,
          sale_id: saleId,
          ...commonData,
        },
        update: {
          sale_id: saleId,
          ...commonData,
        },
      });
    }

    return this.prisma.sales_fiscal_documents.create({
      data: {
        company_id: companyId,
        sale_id: saleId,
        ...commonData,
      },
    });
  }

  async createFiscalEvent(saleId: string, companyId: string, payload: any) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const sale = await this.prisma.sales.findFirst({
      where: {
        id: saleId,
        companyId,
      },
      select: {
        id: true,
      },
    });

    if (!sale) {
      throw new NotFoundException('Venda não encontrada');
    }

    let fiscalDocumentId = payload?.fiscalDocumentId ? String(payload.fiscalDocumentId) : '';

    if (!fiscalDocumentId) {
      const fallbackDoc = await this.prisma.sales_fiscal_documents.findFirst({
        where: {
          company_id: companyId,
          sale_id: saleId,
        },
        orderBy: {
          updated_at: 'desc',
        },
        select: {
          id: true,
        },
      });

      if (!fallbackDoc) {
        throw new NotFoundException('Documento fiscal não encontrado para a venda');
      }

      fiscalDocumentId = fallbackDoc.id;
    }

    return this.prisma.sales_fiscal_events.create({
      data: {
        company_id: companyId,
        fiscal_document_id: fiscalDocumentId,
        event_type: payload?.eventType ? String(payload.eventType) : 'NFE_EVENT',
        event_status: payload?.eventStatus ? String(payload.eventStatus) : null,
        event_date: payload?.eventDate ? new Date(payload.eventDate) : new Date(),
        protocol_number: payload?.protocolNumber ? String(payload.protocolNumber) : null,
        reason: payload?.reason ? String(payload.reason) : null,
        data: payload?.data && typeof payload.data === 'object' ? payload.data : undefined,
      },
    });
  }

  async createItem(data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const normalized = this.normalizeData(data);

    const created = await this.prisma.sales.create({
      data: {
        id: randomUUID(),
        companyId,
        data: normalized,
        updatedAt: new Date(),
      },
    });

    return this.toClient(created);
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await this.prisma.sales.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Venda não encontrada');
    }

    const merged = {
      ...(existing?.data && typeof existing.data === 'object' ? existing.data : {}),
      ...this.normalizeData(data),
    };

    const updated = await this.prisma.sales.update({
      where: { id },
      data: {
        data: merged,
        updatedAt: new Date(),
      },
    });

    return this.toClient(updated);
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const deleted = await this.prisma.sales.deleteMany({
      where: {
        id,
        companyId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Venda não encontrada');
    }

    return { id };
  }
}
