import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';

/**
 * Asaas API v3 client service.
 * Handles customers, subscriptions, and payment queries.
 */
@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);
  private cachedApiKey: string | null = null;

  private get apiKey(): string {
    if (this.cachedApiKey !== null) return this.cachedApiKey;

    // 1) env var
    const fromEnv = process.env.ASAAS_API_KEY?.trim();
    if (fromEnv) {
      this.cachedApiKey = fromEnv;
      return fromEnv;
    }

    // 2) Render secret file
    try {
      const fromFile = readFileSync('/etc/secrets/ASAAS_API_KEY', 'utf8').trim();
      if (fromFile) {
        this.cachedApiKey = fromFile;
        this.logger.log('ASAAS_API_KEY loaded from /etc/secrets/ASAAS_API_KEY');
        return fromFile;
      }
    } catch {
      // file not present (dev environment)
    }

    this.cachedApiKey = '';
    this.logger.warn('ASAAS_API_KEY not configured — API calls will fail');
    return '';
  }

  private get baseUrl(): string {
    return (
      process.env.ASAAS_API_BASE_URL?.trim() ||
      'https://api.asaas.com/v3'
    );
  }

  private get webhookToken(): string {
    const token = process.env.ASAAS_WEBHOOK_TOKEN?.trim() || '';
    if (!token) {
      this.logger.warn('ASAAS_WEBHOOK_TOKEN not configured');
    }
    return token;
  }

  /** Wallet ID — usado para split de pagamentos e transferências */
  get walletId(): string {
    const id = process.env.ASAAS_WALLET_ID?.trim() || '';
    if (!id) {
      this.logger.warn('ASAAS_WALLET_ID not configured');
    }
    return id;
  }

  // ─── helpers ──────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      accept: 'application/json',
      'content-type': 'application/json',
      access_token: this.apiKey,
    };
  }

  private async request<T = any>(
    method: string,
    path: string,
    body?: Record<string, any>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const opts: RequestInit = {
      method,
      headers: this.headers(),
      cache: 'no-store',
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    const text = await res.text();
    if (!res.ok) {
      this.logger.error(`Asaas ${method} ${path} → ${res.status}: ${text}`);
      throw new Error(text || res.statusText);
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  // ─── webhook token validation ─────────────────────────────

  validateWebhookToken(token: string): boolean {
    const expected = this.webhookToken;
    if (!expected) {
      // If no token configured, skip validation (dev mode)
      this.logger.warn('ASAAS_WEBHOOK_TOKEN not configured – skipping validation');
      return true;
    }
    return token === expected;
  }

  // ─── customers ────────────────────────────────────────────

  async findCustomerByExternalRef(externalRef: string) {
    const qs = new URLSearchParams({ externalReference: externalRef, limit: '1' });
    const res = await this.request<{ data?: any[] }>('GET', `/customers?${qs}`);
    return res?.data?.[0] ?? null;
  }

  async createCustomer(data: {
    name: string;
    email?: string;
    cpfCnpj?: string;
    externalReference: string;
  }) {
    return this.request('POST', '/customers', data);
  }

  async ensureCustomer(payload: {
    companyId: string;
    companyName: string;
    adminEmail?: string | null;
    cnpj?: string | null;
  }): Promise<string> {
    const existing = await this.findCustomerByExternalRef(payload.companyId);
    if (existing?.id) return existing.id;

    const created = await this.createCustomer({
      name: payload.companyName,
      email: payload.adminEmail || undefined,
      cpfCnpj: payload.cnpj || undefined,
      externalReference: payload.companyId,
    });

    if (!created?.id) throw new Error('Asaas não retornou o ID do cliente');
    return created.id;
  }

  // ─── subscriptions ────────────────────────────────────────

  async createSubscription(data: {
    customer: string;
    billingType: 'CREDIT_CARD' | 'PIX' | 'BOLETO';
    value: number;
    cycle: 'MONTHLY' | 'YEARLY';
    description?: string;
    externalReference?: string;
    nextDueDate?: string; // YYYY-MM-DD
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
  }) {
    return this.request('POST', '/subscriptions', data);
  }

  async getSubscription(subscriptionId: string) {
    return this.request('GET', `/subscriptions/${subscriptionId}`);
  }

  async updateSubscription(
    subscriptionId: string,
    data: Partial<{
      billingType: string;
      value: number;
      cycle: string;
      nextDueDate: string;
      description: string;
      status: string;
    }>,
  ) {
    return this.request('POST', `/subscriptions/${subscriptionId}`, data);
  }

  async cancelSubscription(subscriptionId: string) {
    return this.request('DELETE', `/subscriptions/${subscriptionId}`);
  }

  async listSubscriptionPayments(subscriptionId: string) {
    const qs = new URLSearchParams({ limit: '20' });
    return this.request(
      'GET',
      `/subscriptions/${subscriptionId}/payments?${qs}`,
    );
  }

  // ─── payments ─────────────────────────────────────────────

  async getPayment(paymentId: string) {
    return this.request('GET', `/payments/${paymentId}`);
  }

  async getPaymentPixQrCode(paymentId: string) {
    return this.request('GET', `/payments/${paymentId}/pixQrCode`);
  }

  async listPaymentsByExternalRef(externalRef: string) {
    const qs = new URLSearchParams({
      externalReference: externalRef,
      limit: '20',
    });
    return this.request('GET', `/payments?${qs}`);
  }

  // ─── one-off payments (credit card, PIX, boleto) ─────────

  async createPayment(data: Record<string, any>) {
    return this.request('POST', '/payments', data);
  }

  // ─── credit card tokenization ─────────────────────────────

  async tokenizeCreditCard(data: {
    customer: string;
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
    remoteIp?: string;
  }) {
    return this.request('POST', '/creditCard/tokenize', data);
  }
}
