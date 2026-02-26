import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class SaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private getBrasilNfeToken(): string {
    const token =
      this.configService.get<string>('BRASIL_NFE_API_KEY') ??
      this.configService.get<string>('BRASIL_NFE_TOKEN');

    if (!token) {
      throw new InternalServerErrorException('Token da Brasil NF-e não configurado. Defina BRASIL_NFE_API_KEY.');
    }

    return token;
  }

  private async resolveBrasilNfeToken(companyId: string): Promise<string> {
    if (companyId) {
      const credentials = await this.prisma.companies.findFirst({
        where: { id: companyId },
        select: {
          brasil_nfe_company_token: true,
          brasil_nfe_personal_token: true,
        },
      });

      const tenantToken = credentials?.brasil_nfe_company_token?.trim() || credentials?.brasil_nfe_personal_token?.trim();
      if (tenantToken) {
        return tenantToken;
      }
    }

    return this.getBrasilNfeToken();
  }

  private getBrasilNfeBaseUrl(): string {
    return (
      this.configService.get<string>('BRASIL_NFE_API_URL') ??
      'https://api.brasilnfe.com.br/services/fiscal'
    );
  }

  private buildBrasilNfeUrl(path: string): string {
    const base = this.getBrasilNfeBaseUrl().replace(/\/$/, '');
    const suffix = path.startsWith('/') ? path : `/${path}`;
    return `${base}${suffix}`;
  }

  private asProtocolNumber(payload: any): string | undefined {
    const value = payload?.Protocolo ?? payload?.ProtocoloAutorizacao ?? payload?.ProtocoloCancelamento;
    return value ? String(value) : undefined;
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

  async emitNfe(saleId: string, companyId: string, payload: any) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const sale = await this.findById(saleId, companyId);
    if (!sale) {
      throw new NotFoundException('Venda não encontrada');
    }

    const url = this.buildBrasilNfeUrl('/EnviarNotaFiscal');
    const token = await this.resolveBrasilNfeToken(companyId);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Token: token,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      const success = response.ok && (responseData?.ReturnNF?.Ok === true || responseData?.Return?.Ok === true);

      if (!success) {
        const message = responseData?.ReturnNF?.DsStatusRespostaSefaz || responseData?.Error || 'Erro na SEFAZ';
        await this.updateItem(saleId, { nfeStatus: 'ERRO', nfeErro: message }, companyId);

        const fiscalDoc = await this.upsertFiscalDocument(saleId, companyId, {
          documentType: 'NFE',
          status: 'ERRO',
          sefazStatusMessage: message,
          data: { request: payload, response: responseData },
        });

        await this.createFiscalEvent(saleId, companyId, {
          fiscalDocumentId: fiscalDoc?.id,
          eventType: 'EMISSAO',
          eventStatus: 'ERRO',
          eventDate: new Date().toISOString(),
          reason: message,
          data: { response: responseData },
        });

        return { success: false, message, data: responseData };
      }

      const nfe = responseData?.ReturnNF ?? responseData?.Return;
      const protocol = this.asProtocolNumber(responseData?.ReturnNF ?? responseData);

      await this.updateItem(saleId, {
        nfeStatus: 'EMITIDA',
        numeroNFe: nfe?.Numero,
        chaveAcesso: nfe?.ChaveNF,
        pdfNFe: responseData?.Base64File,
        xmlNFe: responseData?.Base64Xml,
        statusSefaz: nfe?.DsStatusRespostaSefaz,
        dataEmissaoNFe: new Date().toISOString(),
      }, companyId);

      const fiscalDoc = await this.upsertFiscalDocument(saleId, companyId, {
        documentType: 'NFE',
        documentNumber: nfe?.Numero,
        series: nfe?.Serie,
        accessKey: nfe?.ChaveNF,
        status: 'EMITIDA',
        issueDate: new Date().toISOString(),
        authorizationDate: new Date().toISOString(),
        sefazStatusCode: nfe?.CStat,
        sefazStatusMessage: nfe?.DsStatusRespostaSefaz,
        protocolNumber: protocol,
        data: { request: payload, response: responseData },
      });

      await this.createFiscalEvent(saleId, companyId, {
        fiscalDocumentId: fiscalDoc?.id,
        eventType: 'EMISSAO',
        eventStatus: 'SUCESSO',
        eventDate: new Date().toISOString(),
        protocolNumber: protocol,
        reason: nfe?.DsStatusRespostaSefaz,
        data: { response: responseData },
      });

      return {
        success: true,
        data: responseData,
        message: `NF-e ${nfe?.Numero ?? ''} emitida com sucesso!`.trim(),
      };
    } catch (error: any) {
      const message = error?.message || 'Erro interno na emissão da NF-e.';
      await this.updateItem(saleId, { nfeStatus: 'ERRO', nfeErro: message }, companyId);

      await this.upsertFiscalDocument(saleId, companyId, {
        documentType: 'NFE',
        status: 'ERRO',
        sefazStatusMessage: message,
        data: { request: payload },
      });

      return { success: false, message };
    }
  }

  async cancelNfe(saleId: string, companyId: string, justificativa: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    if (!justificativa || justificativa.length < 15) {
      throw new BadRequestException('A justificativa deve conter pelo menos 15 caracteres.');
    }

    const sale = await this.findById(saleId, companyId);
    if (!sale) {
      throw new NotFoundException('Venda não encontrada');
    }

    if (!sale.chaveAcesso) {
      throw new BadRequestException('Chave de acesso da NF-e não encontrada na venda.');
    }

    const url = this.buildBrasilNfeUrl('/CancelNF');
    const token = await this.resolveBrasilNfeToken(companyId);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Token: token,
        },
        body: JSON.stringify({
          ChaveNF: sale.chaveAcesso,
          Justificativa: justificativa,
          NumeroSequencial: 1,
        }),
      });

      const responseData = await response.json();
      const success = response.ok && responseData?.Status === 1;

      if (!success) {
        const message = responseData?.Error || responseData?.DsMotivo || 'Erro no cancelamento.';

        await this.upsertFiscalDocument(saleId, companyId, {
          documentType: 'NFE',
          accessKey: sale.chaveAcesso,
          status: 'ERRO_CANCELAMENTO',
          sefazStatusMessage: message,
          data: { justificativa, response: responseData },
        });

        await this.createFiscalEvent(saleId, companyId, {
          eventType: 'CANCELAMENTO',
          eventStatus: 'ERRO',
          eventDate: new Date().toISOString(),
          reason: message,
          data: { justificativa, response: responseData },
        });

        return { success: false, message, data: responseData };
      }

      const protocol = this.asProtocolNumber(responseData);

      await this.updateItem(saleId, { nfeStatus: 'CANCELADA' }, companyId);

      const fiscalDoc = await this.upsertFiscalDocument(saleId, companyId, {
        documentType: 'NFE',
        accessKey: sale.chaveAcesso,
        status: 'CANCELADA',
        cancellationDate: new Date().toISOString(),
        sefazStatusCode: responseData?.Status,
        sefazStatusMessage: responseData?.DsMotivo,
        protocolNumber: protocol,
        data: { response: responseData },
      });

      await this.createFiscalEvent(saleId, companyId, {
        fiscalDocumentId: fiscalDoc?.id,
        eventType: 'CANCELAMENTO',
        eventStatus: 'SUCESSO',
        eventDate: new Date().toISOString(),
        protocolNumber: protocol,
        reason: justificativa,
        data: { response: responseData },
      });

      return {
        success: true,
        message: responseData?.DsMotivo || 'Cancelamento processado.',
        data: responseData,
      };
    } catch (error: any) {
      const message = error?.message || 'Erro interno no cancelamento da NF-e.';

      await this.upsertFiscalDocument(saleId, companyId, {
        documentType: 'NFE',
        accessKey: sale?.chaveAcesso,
        status: 'ERRO_CANCELAMENTO',
        sefazStatusMessage: message,
        data: { justificativa },
      });

      await this.createFiscalEvent(saleId, companyId, {
        eventType: 'CANCELAMENTO',
        eventStatus: 'ERRO',
        eventDate: new Date().toISOString(),
        reason: message,
        data: { justificativa },
      });

      return { success: false, message };
    }
  }

  async emitNfeComplementar(saleId: string, companyId: string, payload: any) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const sale = await this.findById(saleId, companyId);
    if (!sale) {
      throw new NotFoundException('Venda não encontrada');
    }

    const url = this.buildBrasilNfeUrl('/EnviarNotaFiscalComplementar');
    const token = await this.resolveBrasilNfeToken(companyId);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Token: token,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      const success = response.ok && responseData?.ReturnNF?.Ok;

      if (!success) {
        const message = responseData?.error?.message || 'Erro na NF-e complementar.';

        await this.upsertFiscalDocument(saleId, companyId, {
          documentType: 'NFE_COMPLEMENTAR',
          status: 'ERRO',
          sefazStatusMessage: message,
          data: { request: payload, response: responseData },
        });

        await this.createFiscalEvent(saleId, companyId, {
          eventType: 'EMISSAO_COMPLEMENTAR',
          eventStatus: 'ERRO',
          eventDate: new Date().toISOString(),
          reason: message,
          data: { response: responseData },
        });

        return { success: false, message, data: responseData };
      }

      const nfe = responseData?.ReturnNF;
      const protocol = this.asProtocolNumber(nfe);

      const fiscalDoc = await this.upsertFiscalDocument(saleId, companyId, {
        documentType: 'NFE_COMPLEMENTAR',
        documentNumber: nfe?.Numero,
        series: nfe?.Serie,
        accessKey: nfe?.ChaveNF,
        status: 'EMITIDA',
        issueDate: new Date().toISOString(),
        authorizationDate: new Date().toISOString(),
        sefazStatusCode: nfe?.CStat,
        sefazStatusMessage: nfe?.DsStatusRespostaSefaz,
        protocolNumber: protocol,
        data: { request: payload, response: responseData },
      });

      await this.createFiscalEvent(saleId, companyId, {
        fiscalDocumentId: fiscalDoc?.id,
        eventType: 'EMISSAO_COMPLEMENTAR',
        eventStatus: 'SUCESSO',
        eventDate: new Date().toISOString(),
        protocolNumber: protocol,
        reason: nfe?.DsStatusRespostaSefaz,
        data: { response: responseData },
      });

      return {
        success: true,
        message: nfe?.DsStatusRespostaSefaz,
        data: { respostaApi: responseData },
      };
    } catch (error: any) {
      const message = error?.message || 'Erro interno na NF-e complementar.';

      await this.upsertFiscalDocument(saleId, companyId, {
        documentType: 'NFE_COMPLEMENTAR',
        status: 'ERRO',
        sefazStatusMessage: message,
        data: { request: payload },
      });

      await this.createFiscalEvent(saleId, companyId, {
        eventType: 'EMISSAO_COMPLEMENTAR',
        eventStatus: 'ERRO',
        eventDate: new Date().toISOString(),
        reason: message,
      });

      return { success: false, message };
    }
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
