import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { Tenant } from '../common/decorators/tenant.decorator';
import { AsaasService } from './asaas.service';
import { PrismaService } from '../common/prisma/prisma.service';
import * as admin from 'firebase-admin';

/** Plan value mapping (monthly BRL) */
const PLAN_VALUES: Record<string, number> = {
  basic: 497,
  pro: 897,
  enterprise: 1250,
};

const ANNUAL_DISCOUNT = 0.1; // 10%

@Controller('asaas/subscriptions')
export class AsaasSubscriptionController {
  private readonly logger = new Logger(AsaasSubscriptionController.name);

  constructor(
    private readonly asaas: AsaasService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── POST /asaas/subscriptions — create a new subscription ─

  @Post()
  @Roles('MASTER', 'ADMIN', 'GERENTE')
  async createSubscription(
    @Tenant() companyId: string,
    @Body()
    body: {
      planId: string;
      billingCycle: 'monthly' | 'annual';
      billingType: 'CREDIT_CARD' | 'PIX';
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
        phone?: string;
      };
    },
  ) {
    const { planId, billingCycle, billingType, creditCard, creditCardHolderInfo } = body;

    // Validate plan
    const monthlyPrice = PLAN_VALUES[planId];
    if (!monthlyPrice) {
      throw new BadRequestException(`Plano inválido: ${planId}`);
    }

    // Validate billing type
    if (!['CREDIT_CARD', 'PIX'].includes(billingType)) {
      throw new BadRequestException('billingType deve ser CREDIT_CARD ou PIX');
    }

    // Credit card requires card data
    if (billingType === 'CREDIT_CARD' && (!creditCard || !creditCardHolderInfo)) {
      throw new BadRequestException(
        'Dados do cartão (creditCard e creditCardHolderInfo) são obrigatórios para CREDIT_CARD',
      );
    }

    // Calculate value
    const cycle = billingCycle === 'annual' ? 'YEARLY' : 'MONTHLY';
    let value: number;
    if (billingCycle === 'annual') {
      value = Math.round(monthlyPrice * 12 * (1 - ANNUAL_DISCOUNT));
    } else {
      value = monthlyPrice;
    }

    // Get company info for Asaas customer
    const company = await this.prisma.companies.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, cnpj: true },
    });

    if (!company) {
      throw new BadRequestException('Empresa não encontrada');
    }

    // Get admin email
    const adminUser = await this.prisma.user_companies.findFirst({
      where: { company_id: companyId, role: 'ADMIN' },
      include: { users: { select: { email: true } } },
    });

    // Ensure Asaas customer exists
    let customerId: string;
    try {
      customerId = await this.asaas.ensureCustomer({
        companyId,
        companyName: company.name,
        adminEmail: adminUser?.users?.email || null,
        cnpj: company.cnpj || null,
      });
    } catch (err: any) {
      this.logger.error(`Falha ao criar/buscar cliente Asaas: ${err?.message}`);
      const parsed = this.parseAsaasError(err?.message);
      throw new BadRequestException(
        parsed || 'Falha ao registrar empresa no gateway de pagamentos. Verifique o CNPJ da empresa.',
      );
    }

    // Next due date = today + 1 day
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 1);
    const nextDueDate = nextDue.toISOString().split('T')[0]; // YYYY-MM-DD

    // Build subscription payload
    const subscriptionData: any = {
      customer: customerId,
      billingType,
      value,
      cycle,
      description: `SGI Industrial – Plano ${planId} (${billingCycle === 'annual' ? 'anual' : 'mensal'})`,
      externalReference: companyId,
      nextDueDate,
    };

    if (billingType === 'CREDIT_CARD' && creditCard && creditCardHolderInfo) {
      subscriptionData.creditCard = creditCard;
      subscriptionData.creditCardHolderInfo = creditCardHolderInfo;
    }

    this.logger.log(
      `Criando subscription: plan=${planId} cycle=${cycle} value=${value} type=${billingType} company=${companyId}`,
    );

    let subscription: any;
    try {
      subscription = await this.asaas.createSubscription(subscriptionData);
    } catch (err: any) {
      this.logger.error(`Falha ao criar subscription Asaas: ${err?.message}`);
      const parsed = this.parseAsaasError(err?.message);
      throw new BadRequestException(
        parsed || 'Falha ao criar assinatura no gateway de pagamentos. Tente novamente.',
      );
    }

    // Update Firestore billing doc immediately
    await this.updateFirestoreBilling(companyId, {
      currentPlanId: planId,
      billingCycle,
      status: billingType === 'CREDIT_CARD' ? 'active' : 'pending_payment',
      asaasSubscriptionId: subscription.id || null,
      asaasCustomerId: customerId,
      paymentMethod: billingType,
      pendingChange: null,
    });

    // Update Postgres plan
    try {
      await this.prisma.companies.update({
        where: { id: companyId },
        data: {
          plan: planId,
          active: true,
          updated_at: new Date(),
        },
      });
    } catch (err: any) {
      this.logger.warn(`Falha ao atualizar plano no Postgres: ${err?.message}`);
    }

    // Log event
    try {
      const { randomUUID } = await import('crypto');
      await this.prisma.$queryRaw`
        INSERT INTO subscription_history (id, company_id, data, created_at, updated_at)
        VALUES (${randomUUID()}, ${companyId}, ${{
          event: 'subscription_created',
          subscriptionId: subscription.id,
          planId,
          billingCycle,
          billingType,
          value,
          date: new Date().toISOString(),
        }}, NOW(), NOW())
      `;
    } catch (err: any) {
      this.logger.warn(`Falha ao registrar histórico: ${err?.message}`);
    }

    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      billingType,
      value,
      cycle,
      nextDueDate,
      // If PIX, first payment will need QR code
      firstPaymentId: subscription.id ? undefined : null,
    };
  }

  // ─── GET /asaas/subscriptions — get current subscription ──

  @Get()
  @Roles('MASTER', 'ADMIN', 'GERENTE')
  async getSubscription(@Tenant() companyId: string) {
    // Read from Firestore billing doc
    try {
      if (admin.apps.length === 0) {
        return { subscription: null };
      }

      const db = admin.firestore();
      const docRef = db
        .collection('companies')
        .doc(companyId)
        .collection('billing')
        .doc('main');

      const snap = await docRef.get();
      if (!snap.exists) {
        return { subscription: null };
      }

      const billing = snap.data() || {};
      const subscriptionId = billing.asaasSubscriptionId;

      let asaasSubscription = null;
      if (subscriptionId) {
        try {
          asaasSubscription = await this.asaas.getSubscription(subscriptionId);
        } catch {
          // Subscription may have been deleted
        }
      }

      return {
        subscription: {
          id: subscriptionId,
          planId: billing.currentPlanId,
          billingCycle: billing.billingCycle,
          status: billing.status,
          paymentMethod: billing.paymentMethod,
          lastPaymentAt: billing.lastPaymentAt,
          nextPaymentAt: billing.nextPaymentAt,
          asaasStatus: asaasSubscription?.status || null,
          asaasNextDueDate: asaasSubscription?.nextDueDate || null,
          asaasValue: asaasSubscription?.value || null,
        },
      };
    } catch (err: any) {
      this.logger.error(`Erro ao buscar subscription: ${err?.message}`);
      return { subscription: null };
    }
  }

  // ─── GET /asaas/subscriptions/payments — list payments ────

  @Get('payments')
  @Roles('MASTER', 'ADMIN', 'GERENTE')
  async listPayments(@Tenant() companyId: string) {
    try {
      const payments = await this.asaas.listPaymentsByExternalRef(companyId);
      return payments;
    } catch (err: any) {
      this.logger.error(`Erro ao listar pagamentos: ${err?.message}`);
      return { data: [] };
    }
  }

  // ─── GET /asaas/subscriptions/pix-qrcode/:paymentId ───────

  @Get('pix-qrcode/:paymentId')
  @Roles('MASTER', 'ADMIN', 'GERENTE')
  async getPixQrCode(@Param('paymentId') paymentId: string) {
    return this.asaas.getPaymentPixQrCode(paymentId);
  }

  // ─── POST /asaas/subscriptions/upgrade — change plan ──────

  @Post('upgrade')
  @Roles('MASTER', 'ADMIN', 'GERENTE')
  async upgradePlan(
    @Tenant() companyId: string,
    @Body() body: { planId: string; billingCycle?: 'monthly' | 'annual' },
  ) {
    const { planId, billingCycle } = body;

    const monthlyPrice = PLAN_VALUES[planId];
    if (!monthlyPrice) {
      throw new BadRequestException(`Plano inválido: ${planId}`);
    }

    // Get current subscription from Firestore
    if (admin.apps.length === 0) {
      throw new BadRequestException('Firebase Admin não inicializado');
    }

    const db = admin.firestore();
    const docRef = db
      .collection('companies')
      .doc(companyId)
      .collection('billing')
      .doc('main');

    const snap = await docRef.get();
    const billing = snap.exists ? snap.data() || {} : {};

    const subscriptionId = billing.asaasSubscriptionId;
    if (!subscriptionId) {
      throw new BadRequestException(
        'Nenhuma assinatura ativa. Crie uma assinatura primeiro.',
      );
    }

    const cycle = (billingCycle || billing.billingCycle) === 'annual' ? 'YEARLY' : 'MONTHLY';
    let value: number;
    if (cycle === 'YEARLY') {
      value = Math.round(monthlyPrice * 12 * (1 - ANNUAL_DISCOUNT));
    } else {
      value = monthlyPrice;
    }

    // Update subscription on Asaas
    try {
      await this.asaas.updateSubscription(subscriptionId, {
        value,
        cycle,
        description: `SGI Industrial – Plano ${planId} (${cycle === 'YEARLY' ? 'anual' : 'mensal'})`,
      });
    } catch (err: any) {
      this.logger.error(`Falha ao atualizar subscription Asaas: ${err?.message}`);
      const parsed = this.parseAsaasError(err?.message);
      throw new BadRequestException(
        parsed || 'Falha ao atualizar assinatura no gateway de pagamentos.',
      );
    }

    const newBillingCycle = cycle === 'YEARLY' ? 'annual' : 'monthly';

    // Update Firestore
    await docRef.set(
      {
        currentPlanId: planId,
        billingCycle: newBillingCycle,
        pendingChange: null,
        updatedAt: new Date().toISOString(),
        updatedBy: 'plan-upgrade',
      },
      { merge: true },
    );

    // Update Postgres
    await this.prisma.companies.update({
      where: { id: companyId },
      data: { plan: planId, updated_at: new Date() },
    });

    // Log
    try {
      const { randomUUID } = await import('crypto');
      await this.prisma.$queryRaw`
        INSERT INTO subscription_history (id, company_id, data, created_at, updated_at)
        VALUES (${randomUUID()}, ${companyId}, ${{
          event: 'plan_upgraded',
          planId,
          billingCycle: newBillingCycle,
          value,
          date: new Date().toISOString(),
        }}, NOW(), NOW())
      `;
    } catch {}

    return {
      success: true,
      planId,
      billingCycle: newBillingCycle,
      value,
    };
  }

  // ─── DELETE /asaas/subscriptions/:id — cancel ─────────────

  @Delete(':id')
  @Roles('MASTER', 'ADMIN')
  async cancelSubscription(
    @Param('id') subscriptionId: string,
    @Tenant() companyId: string,
  ) {
    await this.asaas.cancelSubscription(subscriptionId);

    // Update Firestore
    await this.updateFirestoreBilling(companyId, {
      status: 'pending_payment',
      asaasSubscriptionId: null,
      paymentMethod: null,
      pendingChange: null,
    });

    // Log
    try {
      const { randomUUID } = await import('crypto');
      await this.prisma.$queryRaw`
        INSERT INTO subscription_history (id, company_id, data, created_at, updated_at)
        VALUES (${randomUUID()}, ${companyId}, ${{
          event: 'subscription_cancelled',
          subscriptionId,
          date: new Date().toISOString(),
        }}, NOW(), NOW())
      `;
    } catch {}

    return { success: true, cancelled: subscriptionId };
  }

  // ─── private helpers ──────────────────────────────────────

  private parseAsaasError(raw?: string): string | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.errors && Array.isArray(parsed.errors)) {
        return parsed.errors.map((e: any) => e.description || e.code || 'Erro desconhecido').join('; ');
      }
      if (parsed?.message) return parsed.message;
      if (parsed?.description) return parsed.description;
    } catch {
      // not JSON
    }
    return raw.length > 200 ? raw.substring(0, 200) + '...' : raw;
  }

  private async updateFirestoreBilling(
    companyId: string,
    updates: Record<string, any>,
  ) {
    try {
      if (admin.apps.length === 0) return;

      const db = admin.firestore();
      const docRef = db
        .collection('companies')
        .doc(companyId)
        .collection('billing')
        .doc('main');

      await docRef.set(
        { ...updates, updatedAt: new Date().toISOString() },
        { merge: true },
      );
    } catch (err: any) {
      this.logger.error(`Firestore update failed: ${err?.message}`);
    }
  }
}
