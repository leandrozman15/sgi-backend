import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { Tenant } from '../common/decorators/tenant.decorator';
import { AsaasService } from './asaas.service';
import { PrismaService } from '../common/prisma/prisma.service';

@Controller('asaas/payments')
export class AsaasPaymentController {
  private readonly logger = new Logger(AsaasPaymentController.name);

  constructor(
    private readonly asaas: AsaasService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── POST /asaas/payments — crear cobrança avulsa ─────────

  @Post()
  @Roles('MASTER', 'ADMIN', 'GERENTE')
  async createPayment(
    @Tenant() companyId: string,
    @Req() req: any,
    @Body()
    body: {
      billingType: 'CREDIT_CARD' | 'PIX' | 'BOLETO' | 'UNDEFINED';
      value: number;
      dueDate: string;
      description?: string;
      externalReference?: string;
      // Boleto
      daysAfterDueDateToRegistrationCancellation?: number;
      postalService?: boolean;
      // Credit card
      creditCard?: {
        holderName: string;
        number: string;
        expiryMonth: string;
        expiryYear: string;
        ccv: string;
      };
      creditCardHolderInfo?: {
        name: string;
        email: string;
        cpfCnpj: string;
        postalCode: string;
        addressNumber: string;
        addressComplement?: string | null;
        phone?: string;
        mobilePhone?: string;
      };
      creditCardToken?: string;
      // Installments
      installmentCount?: number;
      installmentValue?: number;
      totalValue?: number;
      // Discount, interest, fine
      discount?: { value: number; dueDateLimitDays?: number; type?: 'FIXED' | 'PERCENTAGE' };
      interest?: { value: number; type?: 'PERCENTAGE' };
      fine?: { value: number; type?: 'FIXED' | 'PERCENTAGE' };
      // Split
      split?: Array<{ walletId: string; fixedValue?: number; percentualValue?: number }>;
      // Callback (redirect after payment)
      callback?: { successUrl: string; autoRedirect?: boolean };
      // PIX automático
      pixAutomaticAuthorizationId?: string;
    },
  ) {
    const {
      billingType,
      value,
      dueDate,
      description,
      creditCard,
      creditCardHolderInfo,
      creditCardToken,
      installmentCount,
      installmentValue,
      totalValue,
      discount,
      interest,
      fine,
      postalService,
      daysAfterDueDateToRegistrationCancellation,
      split,
      callback,
      pixAutomaticAuthorizationId,
    } = body;

    if (!value || value <= 0) {
      throw new BadRequestException('Valor inválido');
    }
    if (!dueDate) {
      throw new BadRequestException('Data de vencimento obrigatória');
    }
    if (!['CREDIT_CARD', 'PIX', 'BOLETO', 'UNDEFINED'].includes(billingType)) {
      throw new BadRequestException('billingType inválido');
    }

    // Credit card requires either card data or token
    if (billingType === 'CREDIT_CARD') {
      if (!creditCardToken && (!creditCard || !creditCardHolderInfo)) {
        throw new BadRequestException(
          'Para pagamento com cartão, envie creditCard + creditCardHolderInfo ou creditCardToken',
        );
      }
    }

    // Installments validation
    if (installmentCount && installmentCount > 1) {
      if (!installmentValue && !totalValue) {
        throw new BadRequestException(
          'installmentValue ou totalValue é obrigatório para parcelamento',
        );
      }
      if (installmentCount > 21) {
        throw new BadRequestException(
          'Máximo de 21 parcelas (Visa/Master). Outras bandeiras: máx 12.',
        );
      }
    }

    // Do NOT use installment fields for 1x payments
    if (installmentCount === 1) {
      throw new BadRequestException(
        'Para cobranças avulsas (1x), não use installmentCount/installmentValue/totalValue. Use apenas value.',
      );
    }

    // Get company
    const company = await this.prisma.companies.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, cnpj: true },
    });
    if (!company) {
      throw new BadRequestException('Empresa não encontrada');
    }

    // Ensure customer in Asaas
    let customerId: string;
    try {
      customerId = await this.asaas.ensureCustomer({
        companyId,
        companyName: company.name,
        cnpj: company.cnpj || null,
      });
    } catch (err: any) {
      this.logger.error(`Falha ao criar/buscar cliente Asaas: ${err?.message}`);
      throw new BadRequestException(
        this.parseAsaasError(err?.message) ||
          'Falha ao registrar empresa no gateway de pagamentos.',
      );
    }

    // Get remoteIp from request
    const remoteIp =
      req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.ip ||
      req.connection?.remoteAddress ||
      undefined;

    // Build payment payload — all Asaas /v3/payments fields
    const paymentData: Record<string, any> = {
      customer: customerId,
      billingType,
      value,
      dueDate,
      description: description || `Cobrança SGI Industrial - ${company.name}`,
      externalReference: body.externalReference || companyId,
    };

    // Credit card
    if (billingType === 'CREDIT_CARD') {
      if (creditCardToken) {
        paymentData.creditCardToken = creditCardToken;
      } else if (creditCard && creditCardHolderInfo) {
        paymentData.creditCard = creditCard;
        paymentData.creditCardHolderInfo = creditCardHolderInfo;
      }
      if (remoteIp) {
        paymentData.remoteIp = remoteIp;
      }
    }

    // Installments (only for 2+ parcelas)
    if (installmentCount && installmentCount >= 2) {
      paymentData.installmentCount = installmentCount;
      if (totalValue) {
        paymentData.totalValue = totalValue;
      } else if (installmentValue) {
        paymentData.installmentValue = installmentValue;
      }
    }

    // Boleto specific
    if (daysAfterDueDateToRegistrationCancellation !== undefined) {
      paymentData.daysAfterDueDateToRegistrationCancellation = daysAfterDueDateToRegistrationCancellation;
    }
    if (postalService !== undefined) {
      paymentData.postalService = postalService;
    }

    // Discount, interest, fine
    if (discount) paymentData.discount = discount;
    if (interest) paymentData.interest = interest;
    if (fine) paymentData.fine = fine;

    // Split
    if (split && Array.isArray(split) && split.length > 0) {
      paymentData.split = split;
    }

    // Callback (redirect)
    if (callback) paymentData.callback = callback;

    // PIX automatic
    if (pixAutomaticAuthorizationId) {
      paymentData.pixAutomaticAuthorizationId = pixAutomaticAuthorizationId;
    }

    this.logger.log(
      `Criando pagamento: type=${billingType} value=${value} company=${companyId}` +
        (installmentCount ? ` parcelas=${installmentCount}` : ''),
    );

    try {
      const payment = await this.asaas.createPayment(paymentData);
      return payment;
    } catch (err: any) {
      this.logger.error(`Falha ao criar pagamento Asaas: ${err?.message}`);
      throw new BadRequestException(
        this.parseAsaasError(err?.message) ||
          'Falha ao criar cobrança. Verifique os dados e tente novamente.',
      );
    }
  }

  // ─── GET /asaas/payments/:id — buscar dados de um pagamento

  @Get(':id')
  @Roles('MASTER', 'ADMIN', 'GERENTE')
  async getPayment(@Param('id') paymentId: string) {
    return this.asaas.getPayment(paymentId);
  }

  // ─── GET /asaas/payments/:id/pix — QR code PIX ────────────

  @Get(':id/pix')
  @Roles('MASTER', 'ADMIN', 'GERENTE')
  async getPixQrCode(@Param('id') paymentId: string) {
    return this.asaas.getPaymentPixQrCode(paymentId);
  }

  // ─── POST /asaas/payments/tokenize — tokenizar cartão ─────

  @Post('tokenize')
  @Roles('MASTER', 'ADMIN', 'GERENTE')
  async tokenizeCreditCard(
    @Tenant() companyId: string,
    @Req() req: any,
    @Body()
    body: {
      creditCard: {
        holderName: string;
        number: string;
        expiryMonth: string;
        expiryYear: string;
        ccv: string;
      };
      creditCardHolderInfo: {
        name: string;
        email: string;
        cpfCnpj: string;
        postalCode: string;
        addressNumber: string;
        addressComplement?: string | null;
        phone?: string;
        mobilePhone?: string;
      };
    },
  ) {
    const { creditCard, creditCardHolderInfo } = body;

    if (!creditCard || !creditCardHolderInfo) {
      throw new BadRequestException(
        'creditCard e creditCardHolderInfo são obrigatórios',
      );
    }

    // Get company
    const company = await this.prisma.companies.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, cnpj: true },
    });
    if (!company) {
      throw new BadRequestException('Empresa não encontrada');
    }

    // Ensure customer
    let customerId: string;
    try {
      customerId = await this.asaas.ensureCustomer({
        companyId,
        companyName: company.name,
        cnpj: company.cnpj || null,
      });
    } catch (err: any) {
      throw new BadRequestException(
        this.parseAsaasError(err?.message) ||
          'Falha ao registrar empresa no gateway.',
      );
    }

    const remoteIp =
      req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.ip ||
      req.connection?.remoteAddress ||
      undefined;

    try {
      const result = await this.asaas.tokenizeCreditCard({
        customer: customerId,
        creditCard,
        creditCardHolderInfo,
        remoteIp: remoteIp || undefined,
      });

      // Returns: creditCardNumber (last 4 digits), creditCardBrand, creditCardToken
      return result;
    } catch (err: any) {
      this.logger.error(`Falha ao tokenizar cartão: ${err?.message}`);
      throw new BadRequestException(
        this.parseAsaasError(err?.message) ||
          'Falha ao tokenizar cartão de crédito.',
      );
    }
  }

  private parseAsaasError(raw?: string): string | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.errors && Array.isArray(parsed.errors)) {
        return parsed.errors
          .map((e: any) => e.description || e.code || 'Erro desconhecido')
          .join('; ');
      }
      if (parsed?.message) return parsed.message;
    } catch {}
    return raw.length > 200 ? raw.substring(0, 200) + '...' : raw;
  }
}
