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
        filename: `DANFE_${numeroFormatado}.pdf`,
        content: saleData.pdfNFe || saleData.danfePdf,
        contentType: 'application/pdf',
      });
    }

    const subject = `${tipoDoc} Nº ${numeroFormatado} | ${emitente.razaoSocial}`;

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a56db, #1e40af); padding: 24px 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px;">
            Nota Fiscal Eletrônica
          </h1>
          <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px;">
            ${tipoDoc} Nº ${numeroFormatado} — Série ${serie}
          </p>
        </div>

        <!-- Body -->
        <div style="padding: 32px;">
          <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Prezado(a) <strong>${destinatario.nome}</strong>,
          </p>
          <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Segue em anexo a ${tipoDoc} referente à operação de <strong>${naturezaOperacao || 'venda'}</strong>.
            ${valorFormatado ? `Valor total: <strong>${valorFormatado}</strong>.` : ''}
          </p>

          <!-- Emitente -->
          <div style="background: #f0f7ff; border-left: 4px solid #1a56db; border-radius: 4px; padding: 16px 20px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px; font-size: 13px; color: #1a56db; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
              Emitente
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 3px 0; color: #6b7280; font-size: 14px; width: 120px;">Razão Social:</td>
                <td style="padding: 3px 0; color: #111827; font-size: 14px; font-weight: 600;">${emitente.razaoSocial}</td>
              </tr>
              <tr>
                <td style="padding: 3px 0; color: #6b7280; font-size: 14px;">CNPJ:</td>
                <td style="padding: 3px 0; color: #111827; font-size: 14px;">${emitente.cnpj}</td>
              </tr>
            </table>
          </div>

          <!-- Destinatário -->
          <div style="background: #f9fafb; border-left: 4px solid #6b7280; border-radius: 4px; padding: 16px 20px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
              Destinatário
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 3px 0; color: #6b7280; font-size: 14px; width: 120px;">Nome:</td>
                <td style="padding: 3px 0; color: #111827; font-size: 14px; font-weight: 600;">${destinatario.nome}</td>
              </tr>
              ${destinatario.cpfCnpj ? `<tr>
                <td style="padding: 3px 0; color: #6b7280; font-size: 14px;">CPF/CNPJ:</td>
                <td style="padding: 3px 0; color: #111827; font-size: 14px;">${destinatario.cpfCnpj}</td>
              </tr>` : ''}
              ${destinatario.endereco ? `<tr>
                <td style="padding: 3px 0; color: #6b7280; font-size: 14px;">Endereço:</td>
                <td style="padding: 3px 0; color: #111827; font-size: 14px;">${destinatario.endereco}</td>
              </tr>` : ''}
              ${destinatario.ie ? `<tr>
                <td style="padding: 3px 0; color: #6b7280; font-size: 14px;">IE:</td>
                <td style="padding: 3px 0; color: #111827; font-size: 14px;">${destinatario.ie}</td>
              </tr>` : ''}
            </table>
          </div>

          <!-- Dados do documento -->
          <div style="background: #fffbeb; border-left: 4px solid #d97706; border-radius: 4px; padding: 16px 20px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px; font-size: 13px; color: #d97706; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
              Dados do Documento
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 3px 0; color: #6b7280; font-size: 14px; width: 120px;">${tipoDoc} Nº:</td>
                <td style="padding: 3px 0; color: #111827; font-size: 14px; font-weight: 600;">${numeroFormatado}</td>
              </tr>
              <tr>
                <td style="padding: 3px 0; color: #6b7280; font-size: 14px;">Série:</td>
                <td style="padding: 3px 0; color: #111827; font-size: 14px;">${serie}</td>
              </tr>
              ${valorFormatado ? `<tr>
                <td style="padding: 3px 0; color: #6b7280; font-size: 14px;">Valor Total:</td>
                <td style="padding: 3px 0; color: #111827; font-size: 14px; font-weight: 600;">${valorFormatado}</td>
              </tr>` : ''}
              ${chaveFormatada ? `<tr>
                <td style="padding: 3px 0; color: #6b7280; font-size: 14px;">Chave de Acesso:</td>
                <td style="padding: 3px 0; color: #111827; font-size: 12px; font-family: monospace;">${chaveFormatada}</td>
              </tr>` : ''}
            </table>
          </div>

          <!-- Attachments note -->
          <p style="color: #6b7280; font-size: 13px; text-align: center; margin: 24px 0 0; padding: 12px; background: #f3f4f6; border-radius: 6px;">
            📎 Em anexo: DANFE (PDF)${(saleData.xmlNFe || saleData.nfeXml) ? ' e XML da NF-e' : ''}
          </p>
        </div>

        <!-- Footer / Signature -->
        <div style="background: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 4px; color: #374151; font-size: 14px; font-weight: 600;">
            Equipe Fluxion
          </p>
          <p style="margin: 0 0 12px; color: #6b7280; font-size: 13px; line-height: 1.5;">
            Soluções em gestão industrial e documentos fiscais
          </p>
          <table style="border-collapse: collapse;">
            <tr>
              <td style="padding: 2px 0; font-size: 13px;">
                <span style="color: #6b7280;">🌐</span>
                <a href="https://www.fluxi-on.com" style="color: #1a56db; text-decoration: none; margin-left: 4px;">www.fluxi-on.com</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 2px 0; font-size: 13px;">
                <span style="color: #6b7280;">📧</span>
                <a href="mailto:comercial@fluxi-on.com" style="color: #1a56db; text-decoration: none; margin-left: 4px;">comercial@fluxi-on.com</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 2px 0; font-size: 13px;">
                <span style="color: #6b7280;">📞</span>
                <span style="color: #374151; margin-left: 4px;">+55 41 8846-1074</span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Legal -->
        <div style="padding: 16px 32px; text-align: center;">
          <p style="font-size: 11px; color: #9ca3af; margin: 0; line-height: 1.5;">
            Este e-mail foi gerado automaticamente pelo sistema Fluxion Documentos.<br/>
            Em caso de dúvidas, responda este e-mail ou entre em contato pelos canais acima.
          </p>
        </div>
      </div>
    `;

    const text = [
      `NOTA FISCAL ELETRÔNICA`,
      `${tipoDoc} Nº ${numeroFormatado} — Série ${serie}`,
      ``,
      `Prezado(a) ${destinatario.nome},`,
      ``,
      `Segue em anexo a ${tipoDoc} referente à operação de ${naturezaOperacao || 'venda'}.`,
      valorFormatado ? `Valor total: ${valorFormatado}` : '',
      ``,
      `--- EMITENTE ---`,
      `Razão Social: ${emitente.razaoSocial}`,
      `CNPJ: ${emitente.cnpj}`,
      ``,
      `--- DESTINATÁRIO ---`,
      `Nome: ${destinatario.nome}`,
      destinatario.cpfCnpj ? `CPF/CNPJ: ${destinatario.cpfCnpj}` : '',
      destinatario.endereco ? `Endereço: ${destinatario.endereco}` : '',
      ``,
      `--- DOCUMENTO ---`,
      `${tipoDoc} Nº: ${numeroFormatado}`,
      `Série: ${serie}`,
      valorFormatado ? `Valor Total: ${valorFormatado}` : '',
      chaveAcesso ? `Chave de Acesso: ${chaveAcesso}` : '',
      ``,
      `---`,
      `Equipe Fluxion`,
      `www.fluxi-on.com | comercial@fluxi-on.com | +55 41 8846-1074`,
      ``,
      `Este e-mail foi gerado automaticamente pelo sistema Fluxion Documentos.`,
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
