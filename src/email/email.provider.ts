import { Resend } from 'resend';

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IEmailProvider {
  send(params: SendEmailParams): Promise<SendEmailResult>;
}

export class ResendEmailProvider implements IEmailProvider {
  private client: Resend | null = null;
  private from: string;

  constructor() {
    this.from = process.env.EMAIL_FROM || 'Fluxion Documentos <comercial@fluxi-on.com>';
  }

  private getClient(): Resend {
    if (!this.client) {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) throw new Error('RESEND_API_KEY env var is required');
      this.client = new Resend(apiKey);
    }
    return this.client;
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      const client = this.getClient();
      const { data, error } = await client.emails.send({
        from: this.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        replyTo: params.replyTo,
        attachments: params.attachments?.map((a) => ({
          filename: a.filename,
          content: typeof a.content === 'string'
            ? Buffer.from(a.content, 'base64')
            : a.content,
        })),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unknown email error' };
    }
  }
}
