import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailService } from '../email/email.service';

type ParcelaInfo = {
  numero: string;
  vencimento: Date;
  valor: number;
};

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // Daily at 08:00 (server time). On Render, server is UTC; 08:00 UTC ≈ 05:00 BRT.
  // Use cron pattern "0 11 * * *" → 08:00 BRT (UTC-3).
  @Cron('0 11 * * *', { name: 'boleto-reminders' })
  async runBoletoReminders() {
    try {
      const startedAt = new Date();
      this.logger.log(`Running boleto reminders job at ${startedAt.toISOString()}`);

      const sales = await this.prisma.sales.findMany({
        where: { deletedAt: null },
        select: { id: true, companyId: true, data: true },
      });

      let sentCount = 0;
      let skippedCount = 0;
      const today = this.startOfDay(new Date());

      for (const sale of sales as any[]) {
        const data = sale.data || {};
        const status = data.nfeStatus;
        if (!status || String(status).toUpperCase() === 'CANCELADA' || String(status).toUpperCase() === 'PENDENTE') continue;

        const parcelas = this.extractParcelas(data);
        if (parcelas.length === 0) continue;

        const pagos: Record<string, any> = data.duplicatasPagamentos || {};
        const reminderLog: Record<string, { preDue?: string; onDue?: string }> = data.reminderLog || {};

        let saleReminderChanged = false;

        for (const p of parcelas) {
          if (pagos?.[p.numero]?.pago) continue;
          const diffDays = this.daysBetween(today, this.startOfDay(p.vencimento));
          let type: 'pre-due' | 'on-due' | null = null;
          if (diffDays === 3) type = 'pre-due';
          else if (diffDays === 0) type = 'on-due';
          if (!type) continue;

          const alreadySent = type === 'pre-due'
            ? !!reminderLog[p.numero]?.preDue
            : !!reminderLog[p.numero]?.onDue;
          if (alreadySent) { skippedCount++; continue; }

          try {
            const result = await this.emailService.sendBoletoReminderEmail({
              companyId: sale.companyId,
              saleId: sale.id,
              parcelaNumero: p.numero,
              totalParcelas: parcelas.length,
              vencimento: p.vencimento,
              valor: p.valor,
              type,
            });
            if (result.success) {
              sentCount++;
              const entry = reminderLog[p.numero] || {};
              if (type === 'pre-due') entry.preDue = new Date().toISOString();
              else entry.onDue = new Date().toISOString();
              reminderLog[p.numero] = entry;
              saleReminderChanged = true;
            } else {
              this.logger.warn(`Reminder send failed for sale ${sale.id} parcela ${p.numero}: ${result.error}`);
            }
          } catch (err: any) {
            this.logger.error(`Reminder send error for sale ${sale.id} parcela ${p.numero}: ${err?.message || err}`);
          }
        }

        if (saleReminderChanged) {
          try {
            await this.prisma.sales.update({
              where: { id: sale.id },
              data: { data: { ...(data || {}), reminderLog } },
            });
          } catch (updErr) {
            this.logger.warn(`Failed to persist reminderLog for sale ${sale.id}: ${updErr}`);
          }
        }
      }

      this.logger.log(`Boleto reminders job finished. Sent=${sentCount} Skipped=${skippedCount} ScannedSales=${sales.length}`);
    } catch (err: any) {
      this.logger.error(`Reminders cron failed: ${err?.message || err}`);
    }
  }

  private extractParcelas(data: any): ParcelaInfo[] {
    const snap = data?.nfePayloadSnapshot ?? null;
    const cobr =
      data?.Cobranca ??
      data?.cobranca ??
      snap?.Cobranca ??
      snap?.cobranca ??
      snap?.cobr ??
      null;
    if (!cobr) return [];
    const raw: any[] = Array.isArray(cobr.Parcelas)
      ? cobr.Parcelas
      : Array.isArray(cobr.parcelas)
      ? cobr.parcelas
      : Array.isArray(cobr.Dup)
      ? cobr.Dup
      : Array.isArray(cobr.dup)
      ? cobr.dup
      : [];
    return raw
      .map((p: any, idx: number) => {
        const numero = String(p.Numero ?? p.numero ?? p.nDup ?? p.ndup ?? idx + 1);
        const vRaw = p.Vencimento ?? p.vencimento ?? p.dVenc ?? p.dvenc ?? null;
        const venc = vRaw ? new Date(vRaw) : null;
        const valor = Number(p.Valor ?? p.valor ?? p.vDup ?? p.vdup ?? 0);
        return { numero, vencimento: venc, valor };
      })
      .filter((p): p is ParcelaInfo => !!p.vencimento && !Number.isNaN((p.vencimento as Date).getTime()));
  }

  private startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private daysBetween(a: Date, b: Date): number {
    const ms = b.getTime() - a.getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24));
  }
}
