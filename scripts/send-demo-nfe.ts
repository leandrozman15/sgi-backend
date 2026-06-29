/**
 * Envia um e-mail demo da NF-e para teste.
 * Uso: npx ts-node scripts/send-demo-nfe.ts <email>
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

async function main() {
  const to = process.argv[2] || 'leozman15@gmail.com';

  const emitenteRazao = 'Fluxion Indústria Ltda (DEMO)';
  const emitenteCnpj = '12345678000199';
  const destinatarioNome = 'Leandro Zman';
  const destinatarioCpfCnpj = formatCpfCnpj('98765432100');
  const tipoDoc = 'NF-e';
  const numeroNFe = '12345';
  const numeroFormatado = formatNFeNumber(numeroNFe);
  const serie = 1;
  const valorTotal = 4870.55;
  const valorFormatado = valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const naturezaOperacao = 'Venda de mercadoria';
  const chaveAcesso = '35240612345678000199550010000123451000123456';
  const isCancelada = false;
  const hasPdfAttached = true;
  const hasXmlAttached = true;

  const headerGradient = isCancelada ? '#dc2626, #991b1b' : '#1a56db, #1e40af';
  const subject = `[DEMO] ${tipoDoc} Nº ${numeroFormatado} | ${emitenteRazao}`;

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
        <p style="font-size: 16px; margin: 0 0 12px;">Olá, <strong>${destinatarioNome}</strong>.</p>
        <p style="font-size: 15px; color: #374151;">
          Segue em anexo a ${tipoDoc} nº <strong>${numeroFormatado}</strong> referente à operação de <strong>${naturezaOperacao}</strong>.
        </p>

        <h3 style="margin-top: 24px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Dados da Nota Fiscal</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 8px;">
          <tr><td style="padding: 6px 0; color: #6b7280;">Emitido por</td><td style="padding: 6px 0; text-align: right;"><strong>${emitenteRazao}</strong> (${formatCpfCnpj(emitenteCnpj)})</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Emitido para</td><td style="padding: 6px 0; text-align: right;"><strong>${destinatarioNome}</strong> (${destinatarioCpfCnpj})</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">${tipoDoc} Nº</td><td style="padding: 6px 0; text-align: right;"><strong>${numeroFormatado}</strong></td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Série</td><td style="padding: 6px 0; text-align: right;"><strong>${serie}</strong></td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Valor Total</td><td style="padding: 6px 0; text-align: right;"><strong>${valorFormatado}</strong></td></tr>
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

        <p style="font-size: 13px; color: #6b7280; margin-top: 24px;">${hasPdfAttached ? 'O DANFE está anexado a este e-mail' : ''}${hasPdfAttached && hasXmlAttached ? ', junto com o XML da NF-e.' : (hasPdfAttached ? '.' : (hasXmlAttached ? 'O XML da NF-e está anexado a este e-mail.' : ''))}</p>
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
    `Segue em anexo a ${tipoDoc} nº ${numeroFormatado} referente à operação de ${naturezaOperacao}.`,
    ``,
    `Emitido por: ${emitenteRazao} (${formatCpfCnpj(emitenteCnpj)})`,
    `Emitido para: ${destinatarioNome} (${destinatarioCpfCnpj})`,
    `${tipoDoc} Nº: ${numeroFormatado}`,
    `Série: ${serie}`,
    `Valor Total: ${valorFormatado}`,
    ``,
    `Chave de Acesso da NF-e: ${chaveAcesso}`,
    ``,
    `www.fluxi-on.com`,
  ].join('\n');

  const provider = new ResendEmailProvider();
  console.log(`Enviando demo NF-e para ${to}...`);
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
