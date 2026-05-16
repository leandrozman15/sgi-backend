import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { NumberSequenceService } from '../number-sequences/number-sequences.service';
import { randomUUID } from 'crypto';

@Injectable()
export class SaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly numberSequences: NumberSequenceService,
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

  /**
   * Returns the next NFe number to attempt for the given company/series.
   * The number is derived from the highest document_number among fiscal
   * documents that are **actually authorized** by SEFAZ
   * (status='EMITIDA' AND access_key IS NOT NULL).
   *
   * Rejected or pending attempts DO NOT consume the sequence — so a
   * failed emission is fully reusable on the next attempt.
   */
  async getNextNfeCandidate(companyId: string, series: number | string = 1): Promise<number> {
    if (!companyId) return 1;
    const seriesStr = String(series ?? 1);
    const rows = await this.prisma.sales_fiscal_documents.findMany({
      where: {
        company_id: companyId,
        document_type: 'NFE',
        status: 'EMITIDA',
        series: seriesStr,
        access_key: { not: null },
        document_number: { not: null },
      },
      select: { document_number: true },
    });
    let max = 0;
    for (const r of rows) {
      const n = Number(r.document_number);
      if (Number.isFinite(n) && n > max) max = n;
    }
    // Honor user-set override via number-sequences registry (acts as a floor)
    const floor = await this.numberSequences
      .getFloor(companyId, `nfe:${seriesStr}`)
      .catch(() => 0);
    return Math.max(max, floor) + 1;
  }

  async getNextNfeNumber(companyId: string, series: number | string = 1) {
    const next = await this.getNextNfeCandidate(companyId, series);
    return { series: Number(series) || 1, next };
  }

  private async parseProviderResponse(response: Response): Promise<any> {
    const rawResponse = await response.text();

    if (!rawResponse) {
      return null;
    }

    try {
      return JSON.parse(rawResponse);
    } catch {
      return { raw: rawResponse };
    }
  }

  private asString(value: any): string | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    return String(value);
  }

  private asDate(value: any): Date | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private extractNfsePayload(responseData: any): any {
    return (
      responseData?.Retorno ??
      responseData?.ReturnNfse ??
      responseData?.ReturnNFSe ??
      responseData?.ReturnNFSe ??
      responseData?.Return ??
      responseData
    );
  }

  private inferNfseStatus(returnData: any): string {
    const code = this.asString(
      returnData?.CodigoStatus ??
      returnData?.Codigo ??
      returnData?.Status ??
      returnData?.CStat,
    );

    if (!code) {
      return 'PROCESSANDO';
    }

    if (['100', '101', '1'].includes(code)) {
      return 'AUTORIZADA';
    }

    if (['135', '151'].includes(code)) {
      return 'CANCELADA';
    }

    if (['102', '103'].includes(code)) {
      return 'PROCESSANDO';
    }

    return 'ERRO';
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

  async upsertNfseDocument(companyId: string, payload: any) {
    const now = new Date();
    const verificationCode = this.asString(
      payload?.verificationCode ?? payload?.codigoVerificacao ?? payload?.CodigoVerificacao,
    );

    const commonData = {
      sale_id: this.asString(payload?.saleId),
      lot_number: this.asString(payload?.lotNumber ?? payload?.codLote ?? payload?.CodigoLote),
      rps_number: this.asString(payload?.rpsNumber ?? payload?.numeroRps ?? payload?.NumeroRps),
      verification_code: verificationCode,
      document_number: this.asString(payload?.documentNumber ?? payload?.numeroNfse ?? payload?.NumeroNfse),
      series: this.asString(payload?.series ?? payload?.serie),
      status: this.asString(payload?.status),
      provider_status_code: this.asString(payload?.providerStatusCode ?? payload?.statusCode),
      provider_message: this.asString(payload?.providerMessage ?? payload?.statusMessage),
      issue_date: this.asDate(payload?.issueDate),
      authorization_date: this.asDate(payload?.authorizationDate),
      cancellation_date: this.asDate(payload?.cancellationDate),
      protocol_number: this.asString(payload?.protocolNumber),
      xml_url: this.asString(payload?.xmlUrl),
      pdf_url: this.asString(payload?.pdfUrl),
      data: payload?.data && typeof payload.data === 'object' ? payload.data : undefined,
      updated_at: now,
    };

    if (verificationCode) {
      return this.prisma.sales_nfse_documents.upsert({
        where: {
          company_id_verification_code: {
            company_id: companyId,
            verification_code: verificationCode,
          },
        },
        create: {
          company_id: companyId,
          ...commonData,
        },
        update: {
          ...commonData,
        },
      });
    }

    return this.prisma.sales_nfse_documents.create({
      data: {
        company_id: companyId,
        ...commonData,
      },
    });
  }

  async createNfseEvent(companyId: string, payload: any) {
    let nfseDocumentId = this.asString(payload?.nfseDocumentId);

    if (!nfseDocumentId) {
      const fallbackDoc = await this.prisma.sales_nfse_documents.findFirst({
        where: {
          company_id: companyId,
          OR: [
            { verification_code: this.asString(payload?.verificationCode) ?? undefined },
            { lot_number: this.asString(payload?.lotNumber) ?? undefined },
          ],
        },
        orderBy: {
          updated_at: 'desc',
        },
        select: {
          id: true,
        },
      });

      nfseDocumentId = fallbackDoc?.id ?? null;
    }

    if (!nfseDocumentId) {
      throw new NotFoundException('Documento NFS-e não encontrado para registrar evento.');
    }

    return this.prisma.sales_nfse_events.create({
      data: {
        company_id: companyId,
        nfse_document_id: nfseDocumentId,
        event_type: this.asString(payload?.eventType) ?? 'NFSE_EVENT',
        event_status: this.asString(payload?.eventStatus),
        event_date: this.asDate(payload?.eventDate) ?? new Date(),
        protocol_number: this.asString(payload?.protocolNumber),
        reason: this.asString(payload?.reason),
        data: payload?.data && typeof payload.data === 'object' ? payload.data : undefined,
      },
    });
  }

  async transmitNfse(companyId: string, payload: any) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const token = await this.resolveBrasilNfeToken(companyId);
    const url = this.buildBrasilNfeUrl('/EnviarNotaFiscalServico');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Token: token,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await this.parseProviderResponse(response);
      const returnData = this.extractNfsePayload(responseData);

      const lotNumber = this.asString(returnData?.CodigoLote ?? returnData?.codLote ?? payload?.Lote?.NumeroLote);
      const verificationCode = this.asString(returnData?.CodigoVerificacao ?? returnData?.CodVerificacao);
      const documentNumber = this.asString(returnData?.NumeroNfse ?? returnData?.NumeroNota ?? returnData?.Numero);
      const rpsNumber = this.asString(returnData?.NumeroRps ?? payload?.nFSInfo?.NumeroRps ?? payload?.Rps?.Numero);
      const statusCode = this.asString(returnData?.CodigoStatus ?? returnData?.Codigo ?? returnData?.Status ?? returnData?.CStat);
      const providerMessage = this.asString(
        returnData?.Mensagem ??
        returnData?.MensagemRetorno ??
        returnData?.DsMotivo ??
        responseData?.Error ??
        responseData?.error?.message ??
        response.statusText,
      );

      const hasProviderError = Boolean(responseData?.Error || responseData?.error);
      const success = response.ok && !hasProviderError;
      const status = success ? this.inferNfseStatus(returnData) : 'ERRO';

      const nfseDocument = await this.upsertNfseDocument(companyId, {
        saleId: payload?.saleId,
        lotNumber,
        rpsNumber,
        verificationCode,
        documentNumber,
        status,
        providerStatusCode: statusCode,
        providerMessage,
        issueDate: success && documentNumber ? new Date().toISOString() : null,
        authorizationDate: success && status === 'AUTORIZADA' ? new Date().toISOString() : null,
        protocolNumber: this.asProtocolNumber(returnData),
        data: {
          request: payload,
          response: responseData,
          httpStatus: response.status,
        },
      });

      await this.createNfseEvent(companyId, {
        nfseDocumentId: nfseDocument.id,
        eventType: 'TRANSMISSAO',
        eventStatus: success ? 'SUCESSO' : 'ERRO',
        eventDate: new Date().toISOString(),
        protocolNumber: this.asProtocolNumber(returnData),
        reason: providerMessage,
        data: {
          request: payload,
          response: responseData,
          httpStatus: response.status,
        },
      });

      return {
        success,
        message: providerMessage,
        data: responseData,
        documentId: nfseDocument.id,
      };
    } catch (error: any) {
      const message = error?.message || 'Erro interno no envio da NFS-e.';

      const nfseDocument = await this.upsertNfseDocument(companyId, {
        saleId: payload?.saleId,
        lotNumber: payload?.codLote ?? payload?.Lote?.NumeroLote,
        rpsNumber: payload?.nFSInfo?.NumeroRps ?? payload?.Rps?.Numero,
        status: 'ERRO',
        providerMessage: message,
        data: {
          request: payload,
          error: error?.stack ? String(error.stack) : undefined,
        },
      });

      await this.createNfseEvent(companyId, {
        nfseDocumentId: nfseDocument.id,
        eventType: 'TRANSMISSAO',
        eventStatus: 'ERRO',
        eventDate: new Date().toISOString(),
        reason: message,
        data: {
          request: payload,
          error: error?.stack ? String(error.stack) : undefined,
        },
      });

      return {
        success: false,
        message,
      };
    }
  }

  async getNfseStatus(companyId: string, payload: any) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const token = await this.resolveBrasilNfeToken(companyId);
    const url = this.buildBrasilNfeUrl('/BuscarNotaFiscalServico');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Token: token,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await this.parseProviderResponse(response);
      const returnData = this.extractNfsePayload(responseData);

      const lotNumber = this.asString(payload?.codLote ?? payload?.CodigoLote ?? returnData?.CodigoLote ?? returnData?.codLote);
      const verificationCode = this.asString(returnData?.CodigoVerificacao ?? returnData?.CodVerificacao ?? payload?.CodigoVerificacao);
      const statusCode = this.asString(returnData?.CodigoStatus ?? returnData?.Codigo ?? returnData?.Status ?? returnData?.CStat);
      const providerMessage = this.asString(
        returnData?.Mensagem ??
        returnData?.MensagemRetorno ??
        returnData?.DsMotivo ??
        responseData?.Error ??
        responseData?.error?.message ??
        response.statusText,
      );

      const hasProviderError = Boolean(responseData?.Error || responseData?.error);
      const success = response.ok && !hasProviderError;

      const nfseDocument = await this.upsertNfseDocument(companyId, {
        saleId: payload?.saleId,
        lotNumber,
        rpsNumber: returnData?.NumeroRps ?? payload?.NumeroRps,
        verificationCode,
        documentNumber: returnData?.NumeroNfse ?? returnData?.NumeroNota ?? returnData?.Numero,
        status: success ? this.inferNfseStatus(returnData) : 'ERRO',
        providerStatusCode: statusCode,
        providerMessage,
        authorizationDate: success && this.inferNfseStatus(returnData) === 'AUTORIZADA' ? new Date().toISOString() : null,
        protocolNumber: this.asProtocolNumber(returnData),
        data: {
          statusRequest: payload,
          statusResponse: responseData,
          httpStatus: response.status,
        },
      });

      await this.createNfseEvent(companyId, {
        nfseDocumentId: nfseDocument.id,
        eventType: 'CONSULTA_STATUS',
        eventStatus: success ? 'SUCESSO' : 'ERRO',
        eventDate: new Date().toISOString(),
        protocolNumber: this.asProtocolNumber(returnData),
        reason: providerMessage,
        data: {
          request: payload,
          response: responseData,
          httpStatus: response.status,
        },
      });

      return {
        success,
        message: providerMessage,
        data: responseData,
        documentId: nfseDocument.id,
      };
    } catch (error: any) {
      const message = error?.message || 'Erro interno na consulta de status da NFS-e.';

      return {
        success: false,
        message,
      };
    }
  }

  async cancelNfse(companyId: string, payload: any) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const token = await this.resolveBrasilNfeToken(companyId);
    const url = this.buildBrasilNfeUrl('/CancelarNotaFiscal');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Token: token,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await this.parseProviderResponse(response);
      const returnData = this.extractNfsePayload(responseData);

      const verificationCode = this.asString(payload?.CodigoVerificacao ?? returnData?.CodigoVerificacao ?? returnData?.CodVerificacao);
      const statusCode = this.asString(returnData?.CodigoStatus ?? returnData?.Codigo ?? returnData?.Status ?? returnData?.CStat);
      const providerMessage = this.asString(
        returnData?.Mensagem ??
        returnData?.MensagemRetorno ??
        returnData?.DsMotivo ??
        responseData?.Error ??
        responseData?.error?.message ??
        response.statusText,
      );

      const hasProviderError = Boolean(responseData?.Error || responseData?.error);
      const success = response.ok && !hasProviderError;

      const nfseDocument = await this.upsertNfseDocument(companyId, {
        saleId: payload?.saleId,
        lotNumber: payload?.codLote,
        verificationCode,
        documentNumber: payload?.NumeroNfse ?? returnData?.NumeroNfse,
        status: success ? 'CANCELADA' : 'ERRO_CANCELAMENTO',
        providerStatusCode: statusCode,
        providerMessage,
        cancellationDate: success ? new Date().toISOString() : null,
        protocolNumber: this.asProtocolNumber(returnData),
        data: {
          cancelRequest: payload,
          cancelResponse: responseData,
          httpStatus: response.status,
        },
      });

      await this.createNfseEvent(companyId, {
        nfseDocumentId: nfseDocument.id,
        eventType: 'CANCELAMENTO',
        eventStatus: success ? 'SUCESSO' : 'ERRO',
        eventDate: new Date().toISOString(),
        protocolNumber: this.asProtocolNumber(returnData),
        reason: providerMessage,
        data: {
          request: payload,
          response: responseData,
          httpStatus: response.status,
        },
      });

      return {
        success,
        message: providerMessage,
        data: responseData,
        documentId: nfseDocument.id,
      };
    } catch (error: any) {
      const message = error?.message || 'Erro interno no cancelamento da NFS-e.';

      return {
        success: false,
        message,
      };
    }
  }

  async generateSped(companyId: string, payload: any) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const token = await this.resolveBrasilNfeToken(companyId);
    const url = this.buildBrasilNfeUrl('/GerarArquivoSped');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Token: token,
        },
        body: JSON.stringify(payload),
      });

      const data = await this.parseProviderResponse(response);
      const success = response.ok && !data?.Error;

      return {
        success,
        message: data?.Error || data?.Mensagem || response.statusText,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Erro interno ao gerar arquivo SPED.',
      };
    }
  }

  async unifySped(companyId: string, payload: any) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const token = await this.resolveBrasilNfeToken(companyId);
    const url = this.buildBrasilNfeUrl('/UnificarArquivoSped');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Token: token,
        },
        body: JSON.stringify(payload),
      });

      const data = await this.parseProviderResponse(response);
      const success = response.ok && !data?.Error;

      return {
        success,
        message: data?.Error || data?.Mensagem || response.statusText,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Erro interno ao unificar arquivo SPED.',
      };
    }
  }

  async recreateSped(companyId: string, codigo: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    if (!codigo?.trim()) {
      throw new BadRequestException('Código da solicitação SPED é obrigatório.');
    }

    const token = await this.resolveBrasilNfeToken(companyId);
    const normalizedCode = encodeURIComponent(codigo.trim());
    const pathUrl = this.buildBrasilNfeUrl(`/RecriarArquivoSped/${normalizedCode}`);
    const fallbackUrl = this.buildBrasilNfeUrl('/RecriarArquivoSped');

    try {
      let response = await fetch(pathUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Token: token,
        },
      });

      if (response.status === 404) {
        response = await fetch(fallbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Token: token,
          },
          body: JSON.stringify({ Codigo: codigo.trim() }),
        });
      }

      const data = await this.parseProviderResponse(response);
      const success = response.ok && !data?.Error;

      return {
        success,
        message: data?.Error || data?.Mensagem || response.statusText,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Erro interno ao recriar arquivo SPED.',
      };
    }
  }

  async getSped(companyId: string, codigo: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    if (!codigo?.trim()) {
      throw new BadRequestException('Código da solicitação SPED é obrigatório.');
    }

    const token = await this.resolveBrasilNfeToken(companyId);
    const normalizedCode = encodeURIComponent(codigo.trim());
    const pathUrl = this.buildBrasilNfeUrl(`/ObterArquivoSped/${normalizedCode}`);
    const fallbackUrl = this.buildBrasilNfeUrl('/ObterArquivoSped');

    try {
      let response = await fetch(pathUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Token: token,
        },
      });

      if (response.status === 404) {
        response = await fetch(fallbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Token: token,
          },
          body: JSON.stringify({ Codigo: codigo.trim() }),
        });
      }

      const data = await this.parseProviderResponse(response);
      const success = response.ok && !data?.Error;

      return {
        success,
        message: data?.Error || data?.Mensagem || response.statusText,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Erro interno ao obter arquivo SPED.',
      };
    }
  }

  async generateSintegra(companyId: string, payload: any) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const token = await this.resolveBrasilNfeToken(companyId);
    const url = this.buildBrasilNfeUrl('/GerarArquivoSintegra');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Token: token,
        },
        body: JSON.stringify(payload),
      });

      const data = await this.parseProviderResponse(response);
      const success = response.ok && !data?.Error;

      return {
        success,
        message: data?.Error || data?.Mensagem || response.statusText,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Erro interno ao gerar arquivo SINTEGRA.',
      };
    }
  }

  async generateFci(companyId: string, payload: any) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const token = await this.resolveBrasilNfeToken(companyId);
    const url = this.buildBrasilNfeUrl('/GerarArquivoFci');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Token: token,
        },
        body: JSON.stringify(payload),
      });

      const data = await this.parseProviderResponse(response);
      const success = response.ok && !data?.Error;

      return {
        success,
        message: data?.Error || data?.Mensagem || response.statusText,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Erro interno ao gerar arquivo FCI.',
      };
    }
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

    // PROFESSIONAL NUMBERING RULE
    // The NFe number is "consumed" ONLY when SEFAZ authorizes the document
    // (status EMITIDA + access_key persisted in sales_fiscal_documents).
    // Until then, every retry must reuse the same candidate number. We
    // therefore (re)derive Codigo from the authorized history when the
    // caller did not pass one, or passed 0/empty. This makes the frontend
    // free of stale local counters that previously caused "número en uso".
    const requestedSeries = Number(payload?.Serie ?? 1) || 1;
    const requestedCodigo = Number(payload?.Codigo);
    if (!Number.isFinite(requestedCodigo) || requestedCodigo <= 0) {
      payload = {
        ...payload,
        Serie: requestedSeries,
        Codigo: await this.getNextNfeCandidate(companyId, requestedSeries),
      };
    }
    const attemptedNumber = String(payload.Codigo);
    const attemptedSeries = String(payload.Serie ?? requestedSeries);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Token: token,
        },
        body: JSON.stringify(payload),
      });

      const rawResponse = await response.text();
      let responseData: any = null;
      try {
        responseData = rawResponse ? JSON.parse(rawResponse) : null;
      } catch {
        responseData = { raw: rawResponse };
      }

      const nfe = responseData?.ReturnNF ?? responseData?.Return;
      const sefazCode = nfe?.CStat !== undefined && nfe?.CStat !== null ? String(nfe.CStat) : '';
      const sefazMessage =
        nfe?.DsStatusRespostaSefaz ||
        responseData?.ReturnNF?.DsStatusRespostaSefaz ||
        responseData?.Return?.DsStatusRespostaSefaz ||
        responseData?.Error ||
        responseData?.error?.message ||
        response.statusText ||
        'Erro na SEFAZ';
      const okFlag = responseData?.ReturnNF?.Ok === true || responseData?.Return?.Ok === true;
      const isAuthorized = sefazCode ? ['100', '150'].includes(sefazCode) : false;
      const success = response.ok && (isAuthorized || (okFlag && !sefazCode));

      if (!success) {
        const message = sefazMessage;
        // SEFAZ explicitly rejected the document. The candidate number
        // remains FREE for the next attempt (we do NOT persist
        // status='EMITIDA', which is what the sequence helper looks at).
        await this.updateItem(saleId, { nfeStatus: 'REJEITADA', nfeErro: message }, companyId);

        const fiscalDoc = await this.upsertFiscalDocument(saleId, companyId, {
          documentType: 'NFE',
          documentNumber: attemptedNumber,
          series: attemptedSeries,
          status: 'REJEITADA',
          sefazStatusCode: sefazCode || null,
          sefazStatusMessage: message,
          data: { request: payload, response: responseData, httpStatus: response.status },
        });

        await this.createFiscalEvent(saleId, companyId, {
          fiscalDocumentId: fiscalDoc?.id,
          eventType: 'EMISSAO',
          eventStatus: 'REJEITADA',
          eventDate: new Date().toISOString(),
          reason: message,
          data: { response: responseData, httpStatus: response.status },
        });

        return { success: false, message, data: responseData, attemptedNumber: Number(attemptedNumber), reusable: true };
      }

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
      // Unknown state: we never received an authoritative SEFAZ response.
      // We MUST NOT consume the number here. Mark sale as
      // PENDENTE_CONSULTA so the operator (or a job) calls
      // POST /sales/:id/nfe/check to find out whether SEFAZ actually
      // authorized this number behind the scenes. Only after that
      // consultation can we decide to consume or release the number.
      await this.updateItem(saleId, { nfeStatus: 'PENDENTE_CONSULTA', nfeErro: message }, companyId);

      const fiscalDoc = await this.upsertFiscalDocument(saleId, companyId, {
        documentType: 'NFE',
        documentNumber: attemptedNumber,
        series: attemptedSeries,
        status: 'PENDENTE',
        sefazStatusMessage: message,
        data: { request: payload, error: error?.stack ? String(error.stack) : undefined },
      });

      await this.createFiscalEvent(saleId, companyId, {
        fiscalDocumentId: fiscalDoc?.id,
        eventType: 'EMISSAO',
        eventStatus: 'PENDENTE',
        eventDate: new Date().toISOString(),
        reason: message,
        data: { error: error?.stack ? String(error.stack) : undefined },
      });

      return { success: false, message, attemptedNumber: Number(attemptedNumber), pending: true, requiresConsult: true };
    }
  }

  /**
   * Consults SEFAZ (via Brasil NF-e) to find out whether a previously
   * attempted NFe was in fact authorized. Resolves the PENDENTE_CONSULTA
   * state by either:
   *   - committing the number (status='EMITIDA') when SEFAZ confirms
   *     authorization, or
   *   - releasing the number (status='REJEITADA') when SEFAZ has no
   *     record of the document.
   *
   * Accepts an optional accessKey (chave) or (series,number) hint; if
   * none provided we look them up from the last fiscal document attempt
   * recorded for this sale.
   */
  async checkNfeStatus(
    saleId: string,
    companyId: string,
    params: { accessKey?: string; series?: string | number; number?: string | number } = {},
  ) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const sale = await this.findById(saleId, companyId);
    if (!sale) {
      throw new NotFoundException('Venda não encontrada');
    }

    let accessKey = params.accessKey ? String(params.accessKey) : sale?.chaveAcesso || null;
    let series = params.series != null ? String(params.series) : null;
    let attemptedNumber = params.number != null ? String(params.number) : null;

    if (!accessKey || !series || !attemptedNumber) {
      const lastAttempt = await this.prisma.sales_fiscal_documents.findFirst({
        where: { company_id: companyId, sale_id: saleId, document_type: 'NFE' },
        orderBy: { created_at: 'desc' },
      });
      if (lastAttempt) {
        accessKey = accessKey || lastAttempt.access_key;
        series = series || lastAttempt.series;
        attemptedNumber = attemptedNumber || lastAttempt.document_number;
      }
    }

    if (!accessKey && !(series && attemptedNumber)) {
      throw new BadRequestException('Sem chave de acesso ou (série, número) para consultar a SEFAZ.');
    }

    const token = await this.resolveBrasilNfeToken(companyId);
    const candidatePaths = accessKey
      ? [`/BuscarNotaFiscal/${accessKey}`, `/ConsultaNotaFiscal/${accessKey}`, `/ConsultaProtocolo/${accessKey}`]
      : [
          `/BuscarNotaFiscal?serie=${encodeURIComponent(series!)}&numero=${encodeURIComponent(attemptedNumber!)}`,
          `/ConsultaNotaFiscal?serie=${encodeURIComponent(series!)}&numero=${encodeURIComponent(attemptedNumber!)}`,
        ];

    let responseData: any = null;
    let httpStatus = 0;
    let lastMessage = '';
    for (const path of candidatePaths) {
      try {
        const url = this.buildBrasilNfeUrl(path);
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', Token: token },
        });
        httpStatus = response.status;
        responseData = await this.parseProviderResponse(response);
        if (response.ok) break;
        lastMessage = responseData?.Error || responseData?.error?.message || response.statusText || '';
        // 404 likely means "not found", which is a definitive answer too — break.
        if (response.status === 404) break;
      } catch (err: any) {
        lastMessage = err?.message || 'Falha ao consultar SEFAZ.';
      }
    }

    const nfe = responseData?.ReturnNF ?? responseData?.Return ?? responseData;
    const sefazCode = nfe?.CStat != null ? String(nfe.CStat) : '';
    const sefazMessage =
      nfe?.DsStatusRespostaSefaz || responseData?.Error || responseData?.error?.message || lastMessage || '';
    const isAuthorized = sefazCode ? ['100', '150'].includes(sefazCode) : Boolean(nfe?.ChaveNF && nfe?.Numero);

    if (isAuthorized) {
      const confirmedKey = nfe?.ChaveNF || accessKey;
      const confirmedNumber = nfe?.Numero || attemptedNumber;
      const confirmedSeries = nfe?.Serie || series;
      const protocol = this.asProtocolNumber(nfe);

      await this.updateItem(
        saleId,
        {
          nfeStatus: 'EMITIDA',
          nfeErro: null,
          numeroNFe: confirmedNumber,
          chaveAcesso: confirmedKey,
          statusSefaz: nfe?.DsStatusRespostaSefaz,
          dataEmissaoNFe: new Date().toISOString(),
        },
        companyId,
      );

      const fiscalDoc = await this.upsertFiscalDocument(saleId, companyId, {
        documentType: 'NFE',
        documentNumber: confirmedNumber,
        series: confirmedSeries,
        accessKey: confirmedKey,
        status: 'EMITIDA',
        issueDate: new Date().toISOString(),
        authorizationDate: new Date().toISOString(),
        sefazStatusCode: sefazCode || null,
        sefazStatusMessage: sefazMessage,
        protocolNumber: protocol,
        data: { consult: responseData, httpStatus },
      });

      await this.createFiscalEvent(saleId, companyId, {
        fiscalDocumentId: fiscalDoc?.id,
        eventType: 'CONSULTA',
        eventStatus: 'SUCESSO',
        eventDate: new Date().toISOString(),
        protocolNumber: protocol,
        reason: sefazMessage,
        data: { consult: responseData, httpStatus },
      });

      return { success: true, authorized: true, number: confirmedNumber, accessKey: confirmedKey, message: sefazMessage };
    }

    // Not authorized → release the number for reuse.
    await this.updateItem(
      saleId,
      { nfeStatus: 'REJEITADA', nfeErro: sefazMessage || 'NFe não localizada na SEFAZ.' },
      companyId,
    );

    const fiscalDoc = await this.upsertFiscalDocument(saleId, companyId, {
      documentType: 'NFE',
      documentNumber: attemptedNumber,
      series,
      status: 'REJEITADA',
      sefazStatusCode: sefazCode || null,
      sefazStatusMessage: sefazMessage || 'NFe não localizada na SEFAZ.',
      data: { consult: responseData, httpStatus },
    });

    await this.createFiscalEvent(saleId, companyId, {
      fiscalDocumentId: fiscalDoc?.id,
      eventType: 'CONSULTA',
      eventStatus: 'REJEITADA',
      eventDate: new Date().toISOString(),
      reason: sefazMessage || 'NFe não localizada na SEFAZ.',
      data: { consult: responseData, httpStatus },
    });

    return {
      success: true,
      authorized: false,
      reusable: true,
      attemptedNumber: attemptedNumber ? Number(attemptedNumber) : null,
      message: sefazMessage || 'NFe não localizada na SEFAZ. Número liberado para nova tentativa.',
    };
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
