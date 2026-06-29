import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ResendEmailProvider, IEmailProvider, EmailAttachment } from './email.provider';
import { FLUXION_LOGO_BASE64 } from './fluxion-logo';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly provider: IEmailProvider;

  constructor(private readonly prisma: PrismaService) {
    this.provider = new ResendEmailProvider();
  }

  private formatNFeNumber(num: number | string): string {
    const n = String(num).replace(/\D/g, '').padStart(9, '0');
    return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`;
  }

  private formatCpfCnpj(value: string): string {
    if (!value) return '';
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (digits.length === 14) {
      return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  }

  async sendInvoiceEmail(
    companyId: string,
    invoiceId: string,
    overrideTo?: string,
    extraAttachments?: Array<{ filename: string; content: string; contentType?: string }>,
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
    const isCancelada = String(nfeStatus).toUpperCase() === 'CANCELADA';

    // Load company (emitente) data
    const company = await this.prisma.companies.findFirst({ where: { id: companyId } });

    // Resolve recipient email: override > sale data > client contacts lookup
    let recipientEmail =
      overrideTo ||
      saleData.clienteEmail ||
      saleData.destinatario?.email ||
      saleData.tomador?.email;

    // Fallback: lookup from nfePayloadSnapshot
    if (!recipientEmail) {
      const snap = saleData.nfePayloadSnapshot || {};
      recipientEmail = snap.Cliente?.Contato?.Email;
    }

    // Fallback: lookup client by ID and check contacts array
    if (!recipientEmail && saleData.clienteId) {
      try {
        const client = await this.prisma.clients.findFirst({
          where: { id: saleData.clienteId, companyId },
        });
        if (client) {
          const clientData = (client as any).data || {};
          const contacts = Array.isArray(clientData.contacts) ? clientData.contacts : [];
          const contactWithEmail = contacts.find((c: any) => c?.email);
          if (contactWithEmail) {
            recipientEmail = contactWithEmail.email;
          }
        }
      } catch (lookupErr) {
        this.logger.warn(`Failed to lookup client email: ${lookupErr}`);
      }
    }

    if (!recipientEmail) {
      return { success: false, error: 'E-mail do destinatário não encontrado na nota.' };
    }

    // Emitente info from company record
    const emitente = {
      razaoSocial: company?.name || saleData.emitenteRazaoSocial || saleData.emitente?.razaoSocial || 'Empresa',
      cnpj: company?.cnpj || saleData.emitenteCnpj || saleData.emitente?.cnpj || '',
      email: saleData.emitenteEmail || saleData.emitente?.email || '',
    };

    // Extract real NF-e number and série from snapshot
    const snap = saleData.nfePayloadSnapshot || {};
    const rawNumeroNFe = saleData.numeroNFe || saleData.numeroDocumento || saleData.numeroNota;
    const serie = snap.Serie ?? saleData.serie ?? 1;
    const numeroFormatado = rawNumeroNFe ? this.formatNFeNumber(rawNumeroNFe) : invoiceId.slice(0, 8);

    const tipoDoc = saleData.tipoDocumento || 'NF-e';

    // Destinatário info from snapshot.Cliente or sale data
    const cliente = snap.Cliente || {};
    const destinatario = {
      nome: cliente.NmCliente || saleData.clienteNome || '',
      cpfCnpj: this.formatCpfCnpj(cliente.CpfCnpj || ''),
      email: cliente.Contato?.Email || recipientEmail,
      telefone: cliente.Contato?.Telefone || '',
      endereco: cliente.Endereco ? [
        cliente.Endereco.Logradouro,
        cliente.Endereco.Numero ? `nº ${cliente.Endereco.Numero}` : '',
        cliente.Endereco.Complemento || '',
        cliente.Endereco.Bairro,
        `${cliente.Endereco.Municipio || ''}/${cliente.Endereco.Uf || ''}`,
        cliente.Endereco.Cep ? `CEP: ${cliente.Endereco.Cep}` : '',
      ].filter(Boolean).join(', ') : '',
      ie: cliente.Ie || '',
    };

    // Chave de acesso
    const chaveAcesso = saleData.chaveAcesso || '';
    const chaveFormatada = chaveAcesso ? chaveAcesso.replace(/(\d{4})/g, '$1 ').trim() : '';

    // Natureza da operação
    const naturezaOperacao = snap.NaturezaOperacao || '';

    // Valor total
    const valorTotal = saleData.valorTotal;
    const valorFormatado = valorTotal != null
      ? Number(valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : '';

    const attachments: EmailAttachment[] = [];

    if (saleData.xmlNFe || saleData.nfeXml) {
      attachments.push({
        filename: `${tipoDoc.replace(/\s/g, '_')}_${numeroFormatado}.xml`,
        content: saleData.xmlNFe || saleData.nfeXml,
        contentType: 'application/xml',
      });
    }

    if (saleData.pdfNFe || saleData.danfePdf) {
      attachments.push({
        filename: `DANFE${isCancelada ? '_CANCELADA' : ''}_${numeroFormatado}.pdf`,
        content: saleData.pdfNFe || saleData.danfePdf,
        contentType: 'application/pdf',
      });
    }

    if (Array.isArray(extraAttachments)) {
      for (const att of extraAttachments) {
        if (att?.filename && att?.content) {
          attachments.push({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType || 'application/octet-stream',
          });
        }
      }
    }

    attachments.push({
      filename: 'logofluxion.png',
      content: FLUXION_LOGO_BASE64,
      contentType: 'image/png',
      contentId: 'fluxion-logo',
    });

    const subject = `${isCancelada ? '[CANCELADA] ' : ''}${tipoDoc} Nº ${numeroFormatado} | ${emitente.razaoSocial}`;

    const headerGradient = isCancelada ? '#dc2626, #991b1b' : '#1a56db, #1e40af';
    const headerSubtitle = isCancelada
      ? `<span style="color: #fecaca;">NF-e Cancelada</span>`
      : `${tipoDoc} Nº ${numeroFormatado} — Série ${serie}`;
    const hasXmlAttached = !!(saleData.xmlNFe || saleData.nfeXml);
    const hasPdfAttached = !!(saleData.pdfNFe || saleData.danfePdf);

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, ${headerGradient}); padding: 24px 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">
            ${isCancelada ? 'NF-e Cancelada' : 'Nota Fiscal Eletrônica'}
          </h1>
          <p style="color: ${isCancelada ? '#fecaca' : '#bfdbfe'}; margin: 8px 0 0; font-size: 14px;">
            ${tipoDoc} Nº ${numeroFormatado} — Série ${serie}
          </p>
        </div>
        <div style="padding: 32px;">
          ${isCancelada ? `
          <div style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #dc2626;border-radius:6px;padding:14px 18px;margin:0 0 20px;">
            <p style="margin:0;color:#991b1b;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">NF-e Cancelada na SEFAZ</p>
            <p style="margin:6px 0 0;color:#7f1d1d;font-size:13px;line-height:1.5;">O DANFE em anexo refere-se ao documento original emitido e não possui validade fiscal após o cancelamento.</p>
          </div>` : ''}

          <p style="font-size: 16px; margin: 0 0 12px;">Olá, <strong>${destinatario.nome || 'Cliente'}</strong>.</p>
          <p style="font-size: 15px; color: #374151;">
            Segue em anexo a ${tipoDoc} nº <strong>${numeroFormatado}</strong>${naturezaOperacao ? ` referente à operação de <strong>${naturezaOperacao}</strong>` : ''}.
          </p>

          <h3 style="margin-top: 24px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Dados da Nota Fiscal</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 8px;">
            <tr><td style="padding: 6px 0; color: #6b7280;">Emitido por</td><td style="padding: 6px 0; text-align: right;"><strong>${emitente.razaoSocial}</strong>${emitente.cnpj ? ` (${this.formatCpfCnpj(emitente.cnpj)})` : ''}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Emitido para</td><td style="padding: 6px 0; text-align: right;"><strong>${destinatario.nome}</strong>${destinatario.cpfCnpj ? ` (${destinatario.cpfCnpj})` : ''}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">${tipoDoc} Nº</td><td style="padding: 6px 0; text-align: right;"><strong>${numeroFormatado}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Série</td><td style="padding: 6px 0; text-align: right;"><strong>${serie}</strong></td></tr>
            ${valorFormatado ? `<tr><td style="padding: 6px 0; color: #6b7280;">Valor Total</td><td style="padding: 6px 0; text-align: right;"><strong>${valorFormatado}</strong></td></tr>` : ''}
          </table>

          ${chaveAcesso ? `
          <h3 style="margin-top: 24px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Como consultar a NF-e</h3>
          <p style="font-size: 14px; margin: 8px 0; color: #374151;">
            Chave de Acesso da NF-e:<br>
            <code style="display: inline-block; background: #f3f4f6; padding: 8px 12px; border-radius: 4px; word-break: break-all; font-size: 13px; margin-top: 4px;">${chaveAcesso}</code>
          </p>
          <p style="font-size: 13px; color: #6b7280;">
            Acesse o Portal da Nota Fiscal Eletrônica em
            <a href="https://www.nfe.fazenda.gov.br/" style="color: #1a56db;">nfe.fazenda.gov.br</a>
            e use a chave acima na opção "Consultar Resumo da NF-e".
          </p>
          ` : ''}

          <p style="font-size: 13px; color: #6b7280; margin-top: 24px;">${hasPdfAttached ? 'O DANFE está anexado a este e-mail' : ''}${hasPdfAttached && hasXmlAttached ? ', junto com o XML da NF-e.' : (hasPdfAttached ? '.' : (hasXmlAttached ? 'O XML da NF-e está anexado a este e-mail.' : ''))}</p>
        </div>
        <div style="background: #f9fafb; padding: 20px 32px; text-align: center; font-size: 12px; color: #6b7280;">
          <img src="cid:fluxion-logo" alt="Fluxion" style="height: 32px; display: inline-block; margin-bottom: 8px;" />
          <div style="margin-top: 4px; color: #9ca3af;"><a href="https://www.fluxi-on.com" style="color: #9ca3af; text-decoration: none;">www.fluxi-on.com</a></div>
        </div>
      </div>
    `;

    const text = [
      `Olá, ${destinatario.nome || 'Cliente'}.`,
      ``,
      isCancelada ? `*** NF-e CANCELADA na SEFAZ — documento sem validade fiscal após o cancelamento ***` : '',
      isCancelada ? `` : '',
      `Segue em anexo a ${tipoDoc} nº ${numeroFormatado}${naturezaOperacao ? ` referente à operação de ${naturezaOperacao}` : ''}.`,
      ``,
      `Emitido por: ${emitente.razaoSocial}${emitente.cnpj ? ` (${this.formatCpfCnpj(emitente.cnpj)})` : ''}`,
      `Emitido para: ${destinatario.nome}${destinatario.cpfCnpj ? ` (${destinatario.cpfCnpj})` : ''}`,
      `${tipoDoc} Nº: ${numeroFormatado}`,
      `Série: ${serie}`,
      valorFormatado ? `Valor Total: ${valorFormatado}` : '',
      chaveAcesso ? `\nChave de Acesso da NF-e: ${chaveAcesso}` : '',
      ``,
      `www.fluxi-on.com`,
    ].filter(Boolean).join('\n');

    this.logger.log(`Sending ${tipoDoc} ${numeroFormatado} to ${recipientEmail}`);

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

      // Persist user-attached files (boletos etc.) so reminders can reuse them.
      const existingBoletos = Array.isArray(saleData.boletos) ? saleData.boletos : [];
      const newBoletos = Array.isArray(extraAttachments)
        ? extraAttachments
            .filter((a) => a?.filename && a?.content)
            .map((a) => ({
              filename: a.filename,
              content: a.content,
              contentType: a.contentType || 'application/octet-stream',
              addedAt: new Date().toISOString(),
            }))
        : [];
      const mergedBoletos = newBoletos.length ? [...existingBoletos, ...newBoletos] : existingBoletos;

      await this.prisma.sales.update({
        where: { id: invoiceId },
        data: {
          data: {
            ...(saleData || {}),
            boletos: mergedBoletos,
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

  private formatDateBR(value: string | Date): string {
    try {
      const d = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) return String(value || '');
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      return `${dd}/${mm}/${yy}`;
    } catch {
      return String(value || '');
    }
  }

  async sendBoletoReminderEmail(params: {
    companyId: string;
    saleId: string;
    parcelaNumero: string;
    totalParcelas: number;
    vencimento: Date;
    valor: number;
    type: 'pre-due' | 'on-due';
  }): Promise<{ success: boolean; messageId?: string; sentTo?: string; error?: string }> {
    const { companyId, saleId, parcelaNumero, totalParcelas, vencimento, valor, type } = params;

    const sale = await this.prisma.sales.findFirst({ where: { id: saleId, companyId } });
    if (!sale) return { success: false, error: 'Venda não encontrada' };

    const saleData = (sale as any).data || {};
    const snap = saleData.nfePayloadSnapshot || {};
    const cliente = snap.Cliente || {};

    let recipientEmail =
      saleData.clienteEmail ||
      saleData.destinatario?.email ||
      cliente?.Contato?.Email ||
      null;

    if (!recipientEmail && saleData.clienteId) {
      const client = await this.prisma.clients.findFirst({ where: { id: saleData.clienteId, companyId } });
      if (client) {
        const clientData = (client as any).data || {};
        const contacts = Array.isArray(clientData.contacts) ? clientData.contacts : [];
        const contactWithEmail = contacts.find((c: any) => c?.email);
        if (contactWithEmail) recipientEmail = contactWithEmail.email;
      }
    }

    if (!recipientEmail) return { success: false, error: 'E-mail do destinatário não encontrado' };

    const company = await this.prisma.companies.findFirst({ where: { id: companyId } });
    const emitenteNome = company?.name || saleData.emitenteRazaoSocial || 'Empresa';
    const emitenteCnpj = company?.cnpj || saleData.emitenteCnpj || '';
    const destinatarioNome = cliente?.NmCliente || saleData.clienteNome || '';
    const destinatarioCnpj = this.formatCpfCnpj(cliente?.CpfCnpj || saleData.clienteCpfCnpj || '');
    const chaveAcesso = saleData.chaveAcesso || '';
    const numeroNFe = saleData.numeroNFe || saleData.numeroDocumento || saleData.numeroNota || saleId.slice(0, 8);
    const numeroNFeFormatado = numeroNFe ? this.formatNFeNumber(numeroNFe) : '';
    const vencFmt = this.formatDateBR(vencimento);
    const valorFmt = Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const isDueToday = type === 'on-due';
    const headline = isDueToday
      ? `O boleto da NF-e nº ${numeroNFeFormatado} vence hoje, dia ${vencFmt}.`
      : `O boleto da NF-e nº ${numeroNFeFormatado} vencerá em 3 dias, no dia ${vencFmt}.`;
    const subject = isDueToday
      ? `Boleto vence hoje — NF-e ${numeroNFeFormatado} (Parcela ${parcelaNumero}/${totalParcelas})`
      : `Lembrete: boleto vence em 3 dias — NF-e ${numeroNFeFormatado} (Parcela ${parcelaNumero}/${totalParcelas})`;

    const attachments: EmailAttachment[] = [];
    const boletos = Array.isArray(saleData.boletos) ? saleData.boletos : [];
    for (const b of boletos) {
      if (b?.filename && b?.content) {
        attachments.push({
          filename: b.filename,
          content: b.content,
          contentType: b.contentType || 'application/pdf',
        });
      }
    }
    if (saleData.pdfNFe || saleData.danfePdf) {
      attachments.push({
        filename: `DANFE_${numeroNFeFormatado || numeroNFe}.pdf`,
        content: saleData.pdfNFe || saleData.danfePdf,
        contentType: 'application/pdf',
      });
    }

    attachments.push({
      filename: 'logofluxion.png',
      content: FLUXION_LOGO_BASE64,
      contentType: 'image/png',
      contentId: 'fluxion-logo',
    });

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, ${isDueToday ? '#dc2626, #991b1b' : '#f59e0b, #b45309'}); padding: 24px 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">
            ${isDueToday ? 'Boleto vence hoje' : 'Lembrete: boleto a vencer'}
          </h1>
          <p style="color: #fef3c7; margin: 8px 0 0; font-size: 14px;">
            Parcela ${parcelaNumero} de ${totalParcelas}
          </p>
        </div>
        <div style="padding: 32px;">
          <p style="font-size: 16px; margin: 0 0 12px;">Olá, <strong>${destinatarioNome || 'Cliente'}</strong>.</p>
          <p style="font-size: 15px; color: #374151;">${headline}</p>

          <h3 style="margin-top: 24px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Algumas informações sobre o boleto</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 8px;">
            <tr><td style="padding: 6px 0; color: #6b7280;">Emitido por</td><td style="padding: 6px 0; text-align: right;"><strong>${emitenteNome}</strong>${emitenteCnpj ? ` (${this.formatCpfCnpj(emitenteCnpj)})` : ''}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Emitido para</td><td style="padding: 6px 0; text-align: right;"><strong>${destinatarioNome}</strong>${destinatarioCnpj ? ` (${destinatarioCnpj})` : ''}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Vencimento</td><td style="padding: 6px 0; text-align: right;"><strong>${this.formatDateBR(vencimento)}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Parcela</td><td style="padding: 6px 0; text-align: right;"><strong>${parcelaNumero}/${totalParcelas}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Valor</td><td style="padding: 6px 0; text-align: right;"><strong>${valorFmt}</strong></td></tr>
          </table>

          ${chaveAcesso ? `
          <h3 style="margin-top: 24px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Como consultar a NF-e</h3>
          <p style="font-size: 14px; margin: 8px 0; color: #374151;">
            Chave de Acesso da NF-e:<br>
            <code style="display: inline-block; background: #f3f4f6; padding: 8px 12px; border-radius: 4px; word-break: break-all; font-size: 13px; margin-top: 4px;">${chaveAcesso}</code>
          </p>
          <p style="font-size: 13px; color: #6b7280;">
            Acesse o Portal da Nota Fiscal Eletrônica em
            <a href="https://www.nfe.fazenda.gov.br/" style="color: #1a56db;">nfe.fazenda.gov.br</a>
            e use a chave acima na opção "Consultar Resumo da NF-e".
          </p>
          ` : ''}

          ${boletos.length > 0 ? `<p style="font-size: 13px; color: #6b7280; margin-top: 16px;">O boleto está anexado a este e-mail.</p>` : ''}

          <p style="font-size: 13px; color: #9ca3af; margin-top: 24px;">Se você já efetuou o pagamento, por favor desconsidere este e-mail.</p>
        </div>
        <div style="background: #f9fafb; padding: 20px 32px; text-align: center; font-size: 12px; color: #6b7280;">
          <img src="cid:fluxion-logo" alt="Fluxion" style="height: 32px; display: inline-block; margin-bottom: 8px;" />
          <div style="margin-top: 4px; color: #9ca3af;"><a href="https://www.fluxi-on.com" style="color: #9ca3af; text-decoration: none;">www.fluxi-on.com</a></div>
        </div>
      </div>
    `;

    const text = [
      `Olá, ${destinatarioNome || 'Cliente'}.`,
      ``,
      headline,
      ``,
      `Emitido por: ${emitenteNome}${emitenteCnpj ? ` (${this.formatCpfCnpj(emitenteCnpj)})` : ''}`,
      `Emitido para: ${destinatarioNome}${destinatarioCnpj ? ` (${destinatarioCnpj})` : ''}`,
      `Vencimento: ${this.formatDateBR(vencimento)}`,
      `Parcela: ${parcelaNumero}/${totalParcelas}`,
      `Valor: ${valorFmt}`,
      chaveAcesso ? `\nChave de Acesso da NF-e: ${chaveAcesso}` : '',
      `\nSe você já efetuou o pagamento, por favor desconsidere este e-mail.`,
      ``,
      `${emitenteNome}`,
    ].filter(Boolean).join('\n');

    this.logger.log(`Sending boleto reminder (${type}) for sale ${saleId} parcela ${parcelaNumero} to ${recipientEmail}`);
    const result = await this.provider.send({ to: recipientEmail, subject, html, text, attachments });

    await this.prisma.invoice_email_logs.create({
      data: {
        company_id: companyId,
        invoice_id: saleId,
        sent_to: recipientEmail,
        status: result.success ? 'sent' : 'failed',
        provider_message_id: result.messageId || null,
        error_message: result.error || `reminder:${type}:parcela=${parcelaNumero}`,
      },
    });

    return result.success
      ? { success: true, messageId: result.messageId, sentTo: recipientEmail }
      : { success: false, error: result.error || 'Falha ao enviar lembrete', sentTo: recipientEmail };
  }
}
