import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { AsaasService } from './asaas.service';
import { PrismaService } from '../common/prisma/prisma.service';
import * as admin from 'firebase-admin';

/**
 * Receives Asaas webhooks (public – no Firebase auth).
 * Updates Firestore billing doc + Postgres company plan.
 *
 * Asaas sends:
 *  - PAYMENT_CONFIRMED  → activate/keep plan
 *  - PAYMENT_RECEIVED   → activate/keep plan
 *  - PAYMENT_OVERDUE    → mark pending_payment
 *  - PAYMENT_DELETED    → informational
 *  - SUBSCRIPTION_CREATED / UPDATED / DELETED
 */
@Controller('asaas/webhooks')
export class AsaasWebhookController {
  private readonly logger = new Logger(AsaasWebhookController.name);

  constructor(
    private readonly asaas: AsaasService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── main handler ─────────────────────────────────────────

  @Post()
  @Public()
  @HttpCode(200)
  async handleWebhook(
    @Headers('asaas-access-token') accessToken: string | undefined,
    @Body() body: any,
  ) {
    // 1) validate webhook token
    if (!this.asaas.validateWebhookToken(accessToken || '')) {
      this.logger.warn('Webhook token inválido');
      throw new BadRequestException('Token inválido');
    }

    const event: string = body?.event || '';
    const payment = body?.payment;
    const subscription = body?.subscription;

    this.logger.log(`📨 Webhook event=${event}`);

    try {
      switch (event) {
        case 'PAYMENT_CONFIRMED':
        case 'PAYMENT_RECEIVED':
          await this.onPaymentConfirmed(payment);
          break;

        case 'PAYMENT_OVERDUE':
        case 'PAYMENT_REFUNDED':
        case 'PAYMENT_CHARGEBACK_REQUESTED':
          await this.onPaymentOverdue(payment);
          break;

        case 'PAYMENT_DELETED':
          this.logger.log(`Pagamento deletado: ${payment?.id}`);
          break;

        default:
          this.logger.log(`Evento ignorado: ${event}`);
      }
    } catch (err: any) {
      this.logger.error(`Erro processando webhook: ${err?.message}`, err?.stack);
      // Still return 200 so Asaas doesn't retry infinitely
    }

    return { received: true };
  }

  // ─── event handlers ───────────────────────────────────────

  private async onPaymentConfirmed(payment: any) {
    if (!payment) return;

    const companyId = payment.externalReference || '';
    const subscriptionId = payment.subscription || '';

    if (!companyId) {
      this.logger.warn('Pagamento confirmado sem externalReference');
      return;
    }

    this.logger.log(
      `✅ Pagamento confirmado: payment=${payment.id} company=${companyId} subscription=${subscriptionId}`,
    );

    // Determine plan from subscription description or value
    let planId = 'basic';
    let billingCycle: 'monthly' | 'annual' = 'monthly';
    let paymentMethod: string | null = payment.billingType || null;

    if (subscriptionId) {
      try {
        const sub = await this.asaas.getSubscription(subscriptionId);
        planId = this.planIdFromValue(sub?.value, sub?.cycle);
        billingCycle = sub?.cycle === 'YEARLY' ? 'annual' : 'monthly';
        paymentMethod = sub?.billingType || paymentMethod;
      } catch (err: any) {
        this.logger.warn(`Não foi possível buscar subscription ${subscriptionId}: ${err?.message}`);
        planId = this.planIdFromValue(payment.value);
      }
    } else {
      planId = this.planIdFromValue(payment.value);
    }

    // Update Postgres
    await this.updatePostgresPlan(companyId, planId, true);

    // Update Firestore
    await this.updateFirestoreBilling(companyId, {
      currentPlanId: planId,
      billingCycle,
      status: 'active',
      lastPaymentAt: new Date().toISOString(),
      nextPaymentAt: payment.dueDate || null,
      asaasSubscriptionId: subscriptionId || null,
      asaasCustomerId: payment.customer || null,
      paymentMethod,
      pendingChange: null,
    });

    // Log to subscription_history
    await this.logSubscriptionEvent(companyId, {
      event: 'payment_confirmed',
      paymentId: payment.id,
      subscriptionId,
      planId,
      billingCycle,
      value: payment.value,
      date: new Date().toISOString(),
    });
  }

  private async onPaymentOverdue(payment: any) {
    if (!payment) return;

    const companyId = payment.externalReference || '';
    if (!companyId) return;

    this.logger.warn(
      `⚠️ Pagamento atrasado/reembolsado: payment=${payment.id} company=${companyId}`,
    );

    // Mark as pending_payment but do NOT deactivate immediately
    await this.updateFirestoreBilling(companyId, {
      status: 'pending_payment',
    });

    await this.logSubscriptionEvent(companyId, {
      event: 'payment_overdue',
      paymentId: payment.id,
      date: new Date().toISOString(),
    });
  }

  // ─── helpers ──────────────────────────────────────────────

  private planIdFromValue(value?: number, cycle?: string): string {
    if (!value || value <= 0) return 'basic';

    // If annual, convert to monthly-equivalent
    const monthly = cycle === 'YEARLY' ? value / 12 / 0.9 : value;

    if (monthly >= 1100) return 'enterprise';
    if (monthly >= 700) return 'pro';
    return 'basic';
  }

  private async updatePostgresPlan(
    companyId: string,
    plan: string,
    active: boolean,
  ) {
    try {
      await this.prisma.companies.update({
        where: { id: companyId },
        data: { plan, active, updated_at: new Date() },
      });
      this.logger.log(`Postgres plan atualizado: ${companyId} → ${plan}`);
    } catch (err: any) {
      this.logger.error(
        `Falha ao atualizar Postgres plan: ${err?.message}`,
      );
    }
  }

  private async updateFirestoreBilling(
    companyId: string,
    updates: Record<string, any>,
  ) {
    try {
      if (admin.apps.length === 0) {
        this.logger.warn('Firebase Admin não inicializado – skip Firestore update');
        return;
      }

      const db = admin.firestore();
      const docRef = db
        .collection('companies')
        .doc(companyId)
        .collection('billing')
        .doc('main');

      await docRef.set(
        {
          ...updates,
          updatedAt: new Date().toISOString(),
          updatedBy: 'asaas-webhook',
        },
        { merge: true },
      );

      this.logger.log(`Firestore billing atualizado: ${companyId}`);
    } catch (err: any) {
      this.logger.error(
        `Falha ao atualizar Firestore billing: ${err?.message}`,
      );
    }
  }

  private async logSubscriptionEvent(
    companyId: string,
    eventData: Record<string, any>,
  ) {
    try {
      const { randomUUID } = await import('crypto');
      await this.prisma.$queryRaw`
        INSERT INTO subscription_history (id, company_id, data, created_at, updated_at)
        VALUES (${randomUUID()}, ${companyId}, ${eventData}, NOW(), NOW())
      `;
    } catch (err: any) {
      this.logger.warn(
        `Falha ao registrar subscription_history: ${err?.message}`,
      );
    }
  }
}
