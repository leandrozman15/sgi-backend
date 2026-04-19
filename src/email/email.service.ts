import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ResendEmailProvider, IEmailProvider, EmailAttachment } from './email.provider';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly provider: IEmailProvider;

  constructor(private readonly prisma: PrismaService) {
    this.provider = new ResendEmailProvider();
  }

  async sendInvoiceEmail(
    companyId: string,
    invoiceId: string,
    overrideTo?: string,
  ): Promise<{ success: boolean; messageId?: string; sentTo?: string; error?: string }> {
    const sale = await this.prisma.sales.findFirst({
      where: { id: invoiceId, companyId },
    });

    if (!sale) {
      return { success: false, error: 'Nota fiscal não encontrada.' };
    }

    const saleData = (sale as any).data || {};
    const nfeStatus = saleData.nfeStatus;
    if (!nfeStatus || nfeStatus === 'Pendente') {
      return { success: false, error: 'Nota fiscal ainda não foi autorizada.' };
    }

    const recipientEmail =
      overrideTo ||
      saleData.clienteEmail ||
      saleData.destinatario?.email ||
      saleData.tomador?.email;

    if (!recipientEmail) {
      return { success: false, error: 'E-mail do destinatário não encontrado na nota.' };
    }

    const emitente = {
      razaoSocial: saleData.emitenteRazaoSocial || saleData.emitente?.razaoSocial || 'Empresa',
      cnpj: saleData.emitenteCnpj || saleData.emitente?.cnpj || '',
      email: saleData.emitenteEmail || saleData.emitente?.email || '',
    };

    const numeroNota =
      saleData.numeroDocumento ||
      saleData.numeroNota ||
      invoiceId.slice(0, 8);

    const tipoDoc = saleData.tipoDocumento || 'NF-e';

    const attachments: EmailAttachment[] = [];

    if (saleData.xmlNFe || saleData.nfeXml) {
      attachments.push({
        filename: `${tipoDoc.replace(/\s/g, '_')}_${numeroNota}.xml`,
        content: saleData.xmlNFe || saleData.nfeXml,
        contentType: 'application/xml',
      });
    }

    if (saleData.pdfNFe || saleData.danfePdf) {
      attachments.push({
        filename: `DANFE_${numeroNota}.pdf`,
        content: saleData.pdfNFe || saleData.danfePdf,
        contentType: 'application/pdf',
      });
    }

    const subject = `${tipoDoc} ${numeroNota} — ${emitente.razaoSocial}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Nota Fiscal Eletrônica</h2>
        <p>Prezado(a),</p>
        <p>Segue em anexo a <strong>${tipoDoc} nº ${numeroNota}</strong>.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #666;">Razão Social:</td>
            <td style="padding: 4px 0;"><strong>${emitente.razaoSocial}</strong></td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #666;">CNPJ:</td>
            <td style="padding: 4px 0;">${emitente.cnpj}</td>
          </tr>
          ${emitente.email ? `
          <tr>
            <td style="padding: 4px 0; color: #666;">E-mail:</td>
            <td style="padding: 4px 0;">${emitente.email}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 4px 0; color: #666;">Nº da Nota:</td>
            <td style="padding: 4px 0;"><strong>${numeroNota}</strong></td>
          </tr>
        </table>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">
          Este e-mail foi gerado automaticamente pelo sistema Fluxion Documentos.<br/>
          Em caso de dúvidas, responda este e-mail para contatar o emissor.
        </p>
      </div>
    `;

    const text = [
      `Nota Fiscal Eletrônica`,
      ``,
      `Segue a ${tipoDoc} nº ${numeroNota}.`,
      ``,
      `Razão Social: ${emitente.razaoSocial}`,
      `CNPJ: ${emitente.cnpj}`,
      emitente.email ? `E-mail: ${emitente.email}` : '',
      `Nº da Nota: ${numeroNota}`,
      ``,
      `Este e-mail foi gerado automaticamente pelo Fluxion Documentos.`,
    ].filter(Boolean).join('\n');

    this.logger.log(`Sending ${tipoDoc} ${numeroNota} to ${recipientEmail}`);

    const result = await this.provider.send({
      to: recipientEmail,
      subject,
      html,
      text,
      replyTo: emitente.email || undefined,
      attachments,
    });

    await this.prisma.invoice_email_logs.create({
      data: {
        company_id: companyId,
        invoice_id: invoiceId,
        sent_to: recipientEmail,
        status: result.success ? 'sent' : 'failed',
        provider_message_id: result.messageId || null,
        error_message: result.error || null,
      },
    });

    try {
      const emailStatus = result.success ? 'sent' : 'failed';
      const emailSentAt = result.success ? new Date().toISOString() : undefined;

      await this.prisma.sales.update({
        where: { id: invoiceId },
        data: {
          data: {
            ...(saleData || {}),
            emailStatus,
            emailSentAt,
            emailSentTo: recipientEmail,
          },
        },
      });
    } catch (updateErr) {
      this.logger.warn(`Failed to update sale emailStatus: ${updateErr}`);
    }

    if (result.success) {
      return { success: true, messageId: result.messageId, sentTo: recipientEmail };
    }

    return {
      success: false,
      error: result.error || 'Falha ao enviar e-mail.',
      sentTo: recipientEmail,
    };
  }

  async getEmailLogs(companyId: string, invoiceId: string) {
    return this.prisma.invoice_email_logs.findMany({
      where: { company_id: companyId, invoice_id: invoiceId },
      orderBy: { sent_at: 'desc' },
    });
  }
}
