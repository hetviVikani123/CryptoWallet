import nodemailer from 'nodemailer';
import logger from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Create transporter with environment variables
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // If email is not configured, just log the email (development mode)
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        logger.warn('Email service not configured. Email content:');
        logger.info(`To: ${options.to}`);
        logger.info(`Subject: ${options.subject}`);
        logger.info(`Content: ${options.text || options.html}`);
        return true;
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || `"CryptoWallet" <${process.env.EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${options.to}. MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  async sendOTP(email: string, otp: string, purpose: string): Promise<boolean> {
    const subject = this.getOTPSubject(purpose);
    const html = this.getOTPTemplate(otp, purpose);

    return await this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  private getOTPSubject(purpose: string): string {
    const subjects: Record<string, string> = {
      registration: 'Verify Your Email - CryptoWallet',
      login: 'Your Login OTP - CryptoWallet',
      'password-reset': 'Password Reset OTP - CryptoWallet',
      transaction: 'Transaction Verification OTP - CryptoWallet',
    };
    return subjects[purpose] || 'Your OTP - CryptoWallet';
  }

  private getOTPTemplate(otp: string, purpose: string): string {
    const titles: Record<string, string> = {
      registration: 'Welcome to CryptoWallet!',
      login: 'Login Verification',
      'password-reset': 'Password Reset Request',
      transaction: 'Transaction Verification',
    };

    const messages: Record<string, string> = {
      registration: 'Thank you for registering with CryptoWallet. Please use the OTP below to verify your email address.',
      login: 'Please use the OTP below to complete your login.',
      'password-reset': 'You requested to reset your password. Use the OTP below to proceed.',
      transaction: 'Please verify this transaction with the OTP below.',
    };

    const title = titles[purpose] || 'Verification Required';
    const message = messages[purpose] || 'Please use the OTP below.';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .content {
            padding: 30px;
          }
          .otp-box {
            background: #f8f9fa;
            border: 2px dashed #667eea;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            margin: 25px 0;
          }
          .otp-code {
            font-size: 36px;
            font-weight: bold;
            color: #667eea;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px;
            margin: 20px 0;
            font-size: 14px;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
          }
          .footer a {
            color: #667eea;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>₵ CryptoWallet</h1>
          </div>
          <div class="content">
            <h2>${title}</h2>
            <p>${message}</p>
            <div class="otp-box">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #6c757d;">Your OTP Code</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #6c757d;">Valid for 10 minutes</p>
            </div>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> Never share this OTP with anyone. CryptoWallet staff will never ask for your OTP.
            </div>
            <p style="margin-top: 20px;">If you didn't request this OTP, please ignore this email or contact our support team immediately.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} CryptoWallet. All rights reserved.</p>
            <p>
              <a href="#">Help Center</a> | 
              <a href="#">Terms of Service</a> | 
              <a href="#">Privacy Policy</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendWelcomeEmail(email: string, name: string, walletId: string): Promise<boolean> {
    const subject = 'Welcome to CryptoWallet!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .wallet-info { background: #f8f9fa; border-radius: 10px; padding: 20px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>₵ CryptoWallet</h1>
          </div>
          <div class="content">
            <h2>Welcome aboard, ${name}! 🎉</h2>
            <p>Your CryptoWallet account has been successfully created and verified.</p>
            <div class="wallet-info">
              <h3>Your Wallet Details</h3>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Wallet ID:</strong> <code style="background: #e9ecef; padding: 5px 10px; border-radius: 5px;">${walletId}</code></p>
              <p><strong>Initial Balance:</strong> ₵0.00</p>
            </div>
            <p>You can now start managing your digital coins, make transfers, and track your transactions.</p>
            <p style="margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/login" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Login to Dashboard
              </a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} CryptoWallet. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({ to: email, subject, html });
  }

  async sendTransactionEmail(
    email: string,
    name: string,
    transactionType: 'sent' | 'received' | 'deposit' | 'withdrawal',
    amount: number,
    transactionId: string,
    otherPartyName?: string,
    otherPartyWalletId?: string,
    status: string = 'completed'
  ): Promise<boolean> {
    const subjects: Record<string, string> = {
      sent: 'Coins Sent Successfully',
      received: 'Coins Received',
      deposit: 'Deposit Request Submitted',
      withdrawal: 'Withdrawal Request Submitted',
    };

    const subject = `${subjects[transactionType]} - CryptoWallet`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .transaction-box { background: #f8f9fa; border-left: 4px solid #667eea; border-radius: 5px; padding: 20px; margin: 20px 0; }
          .amount { font-size: 32px; font-weight: bold; color: ${transactionType === 'received' ? '#10b981' : '#667eea'}; text-align: center; margin: 20px 0; }
          .details { margin: 15px 0; }
          .details p { margin: 8px 0; display: flex; justify-content: space-between; }
          .label { color: #6c757d; }
          .value { font-weight: 500; }
          .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
          .status.completed { background: #d1fae5; color: #059669; }
          .status.pending { background: #fef3c7; color: #d97706; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>₵ CryptoWallet</h1>
            <p style="margin: 0; font-size: 16px;">Transaction Notification</p>
          </div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>${this.getTransactionMessage(transactionType, status)}</p>
            
            <div class="amount">
              ${transactionType === 'sent' || transactionType === 'withdrawal' ? '-' : '+'}₵${amount.toLocaleString('en-IN')}
            </div>
            
            <div class="transaction-box">
              <h3 style="margin-top: 0;">Transaction Details</h3>
              <div class="details">
                <p><span class="label">Transaction ID:</span> <span class="value">${transactionId}</span></p>
                <p><span class="label">Type:</span> <span class="value">${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)}</span></p>
                <p><span class="label">Amount:</span> <span class="value">₵${amount.toLocaleString('en-IN')}</span></p>
                ${otherPartyName ? `<p><span class="label">${transactionType === 'sent' ? 'To' : 'From'}:</span> <span class="value">${otherPartyName}</span></p>` : ''}
                ${otherPartyWalletId ? `<p><span class="label">Wallet ID:</span> <span class="value">${otherPartyWalletId}</span></p>` : ''}
                <p><span class="label">Status:</span> <span class="status ${status}">${status}</span></p>
                <p><span class="label">Date:</span> <span class="value">${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</span></p>
              </div>
            </div>
            
            ${status === 'pending' ? `
              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <strong>⏳ Pending Approval:</strong> Your ${transactionType} request is pending admin approval. You will receive another email once it's processed.
              </div>
            ` : ''}
            
            <p style="margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/history" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Transaction History
              </a>
            </p>
          </div>
          <div class="footer">
            <p>If you did not initiate this transaction, please contact support immediately.</p>
            <p>&copy; ${new Date().getFullYear()} CryptoWallet. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({ to: email, subject, html });
  }

  private getTransactionMessage(type: string, status: string): string {
    const messages: Record<string, Record<string, string>> = {
      sent: {
        completed: 'Your coins have been sent successfully!',
        pending: 'Your transfer is being processed.',
      },
      received: {
        completed: 'You have received coins in your wallet!',
        pending: 'Coins are being transferred to your wallet.',
      },
      deposit: {
        completed: 'Your deposit has been approved and credited to your wallet!',
        pending: 'Your deposit request has been submitted and is pending admin approval.',
      },
      withdrawal: {
        completed: 'Your withdrawal has been processed successfully!',
        pending: 'Your withdrawal request has been submitted and is pending admin approval.',
      },
    };

    return messages[type]?.[status] || 'Transaction processed.';
  }
}

export default new EmailService();
