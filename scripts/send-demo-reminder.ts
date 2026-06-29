/**
 * Envia um e-mail demo do lembrete de boleto para teste.
 * Uso: npx ts-node scripts/send-demo-reminder.ts <email>
 */
import 'dotenv/config';
import { ResendEmailProvider } from '../src/email/email.provider';
import { FLUXION_LOGO_BASE64 } from '../src/email/fluxion-logo';

function formatNFeNumber(num: number | string): string {
  const n = String(num).replace(/\D/g, '').padStart(9, '0');
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`;
}

function formatCpfCnpj(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return value;
}

function formatDateBR(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function main() {
  const to = process.argv[2] || 'leozman15@gmail.com';

  const emitenteNome = 'Fluxion Indústria Ltda (DEMO)';
  const emitenteCnpj = '12345678000199';
  const destinatarioNome = 'Leandro Zman';
  const destinatarioCnpj = formatCpfCnpj('98765432100');
  const numeroNFe = '12345';
  const numeroNFeFormatado = formatNFeNumber(numeroNFe);
  const parcelaNumero = '2';
  const totalParcelas = 3;
  const vencimento = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const vencFmt = formatDateBR(vencimento);
  const valor = 1547.9;
  const valorFmt = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const chaveAcesso = '35240612345678000199550010000123451000123456';
  const isDueToday = false;

  const headline = isDueToday
    ? `O boleto da NF-e nº ${numeroNFeFormatado} vence hoje, dia ${vencFmt}.`
    : `O boleto da NF-e nº ${numeroNFeFormatado} vencerá em 3 dias, no dia ${vencFmt}.`;
  const subject = `[DEMO] Lembrete: boleto vence em 3 dias — NF-e ${numeroNFeFormatado} (Parcela ${parcelaNumero}/${totalParcelas})`;

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
        <p style="font-size: 16px; margin: 0 0 12px;">Olá, <strong>${destinatarioNome}</strong>.</p>
        <p style="font-size: 15px; color: #374151;">${headline}</p>

        <h3 style="margin-top: 24px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Algumas informações sobre o boleto</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 8px;">
          <tr><td style="padding: 6px 0; color: #6b7280;">Emitido por</td><td style="padding: 6px 0; text-align: right;"><strong>${emitenteNome}</strong> (${formatCpfCnpj(emitenteCnpj)})</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Emitido para</td><td style="padding: 6px 0; text-align: right;"><strong>${destinatarioNome}</strong> (${destinatarioCnpj})</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Vencimento</td><td style="padding: 6px 0; text-align: right;"><strong>${vencFmt}</strong></td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Parcela</td><td style="padding: 6px 0; text-align: right;"><strong>${parcelaNumero}/${totalParcelas}</strong></td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Valor</td><td style="padding: 6px 0; text-align: right;"><strong>${valorFmt}</strong></td></tr>
        </table>

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

        <p style="font-size: 13px; color: #9ca3af; margin-top: 24px;">Se você já efetuou o pagamento, por favor desconsidere este e-mail.</p>
        <p style="font-size: 12px; color: #dc2626; margin-top: 16px; padding: 8px; background: #fef2f2; border-radius: 4px;"><strong>⚠️ Este é um e-mail de DEMONSTRAÇÃO enviado para teste.</strong></p>
      </div>
      <div style="background: #f9fafb; padding: 20px 32px; text-align: center; font-size: 12px; color: #6b7280;">
        <img src="cid:fluxion-logo" alt="Fluxion" style="height: 32px; display: inline-block; margin-bottom: 8px;" />
        <div style="margin-top: 4px; color: #9ca3af;"><a href="https://www.fluxi-on.com" style="color: #9ca3af; text-decoration: none;">www.fluxi-on.com</a></div>
      </div>
    </div>
  `;

  const text = [
    `[DEMO]`,
    `Olá, ${destinatarioNome}.`,
    ``,
    headline,
    ``,
    `Emitido por: ${emitenteNome} (${formatCpfCnpj(emitenteCnpj)})`,
    `Emitido para: ${destinatarioNome} (${destinatarioCnpj})`,
    `Vencimento: ${vencFmt}`,
    `Parcela: ${parcelaNumero}/${totalParcelas}`,
    `Valor: ${valorFmt}`,
    ``,
    `Chave de Acesso da NF-e: ${chaveAcesso}`,
    ``,
    `Se você já efetuou o pagamento, por favor desconsidere este e-mail.`,
    ``,
    `${emitenteNome}`,
  ].join('\n');

  const provider = new ResendEmailProvider();
  console.log(`Enviando demo para ${to}...`);
  const result = await provider.send({
    to,
    subject,
    html,
    text,
    attachments: [
      {
        filename: 'logofluxion.png',
        content: FLUXION_LOGO_BASE64,
        contentType: 'image/png',
        contentId: 'fluxion-logo',
      },
    ],
  });

  if (result.success) {
    console.log(`✅ Enviado! messageId=${result.messageId}`);
  } else {
    console.error(`❌ Falhou: ${result.error}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
