import nodemailer from 'nodemailer';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_CONFIGURED = !!(SENDGRID_API_KEY && SENDGRID_API_KEY !== 'your-sendgrid-api-key');

const transporter = EMAIL_CONFIGURED
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'apikey',
        pass: SENDGRID_API_KEY,
      },
    })
  : null;

if (!EMAIL_CONFIGURED) {
  console.warn('WARNING: Email not configured (SENDGRID_API_KEY not set). Emails will be skipped.');
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!transporter || !EMAIL_CONFIGURED) {
    console.log(`[Email Skipped] To: ${options.to}, Subject: ${options.subject}`);
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'ReModel Sync'}" <${process.env.EMAIL_FROM || 'noreply@remodelsync.com'}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

export { EMAIL_CONFIGURED };
export default transporter;
