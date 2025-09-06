import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import { EmailLog } from '../database/entities/email-log.entity';
import { EmailActionData, EmailStatus } from '../workflow/types';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private templates = new Map<string, HandlebarsTemplateDelegate>();

  constructor(
    @InjectRepository(EmailLog)
    private readonly emailLogRepository: Repository<EmailLog>,
  ) {
    this.initializeTransporter();
    this.initializeTemplates();
  }

  private initializeTransporter(): void {
    // Create a test transporter (in production, use real SMTP)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
        pass: process.env.SMTP_PASS || 'ethereal.pass'
      }
    });

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.warn('SMTP connection failed, using mock mode:', error.message);
      } else {
        this.logger.log('SMTP connection established');
      }
    });
  }

  private initializeTemplates(): void {
    // United Welcome Email Template
    this.templates.set('united_welcome', Handlebars.compile(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>{{subject}}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #e91e63; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to United! 🪅</h1>
          </div>
          <div class="content">
            <h2>Hi {{userName}}!</h2>
            <p>Welcome to United! We're excited to have you on board.</p>
            <p>Here's how to get started:</p>
            <ul>
              <li>Explore our exclusive content</li>
              <li>Join our community discussions</li>
              <li>Access premium features</li>
            </ul>
            <p>Your subscription: <strong>{{product}}</strong></p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>The United Team</p>
          </div>
        </div>
      </body>
      </html>
    `));

    // Podcast Welcome Email Template
    this.templates.set('podcast_welcome', Handlebars.compile(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>{{subject}}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4caf50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to the Podcast! 🎧</h1>
          </div>
          <div class="content">
            <h2>Hi {{userName}}!</h2>
            <p>Welcome to our podcast community! Here's what you can do first:</p>
            <ul>
              <li>Listen to our latest episodes</li>
              <li>Subscribe to your favorite shows</li>
              <li>Join our listener community</li>
            </ul>
            <p>Your subscription: <strong>{{product}}</strong></p>
            <p>Happy listening!</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>The Podcast Team</p>
          </div>
        </div>
      </body>
      </html>
    `));

    // Generic Welcome Email Template
    this.templates.set('generic_welcome', Handlebars.compile(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>{{subject}}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196f3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome! 🎉</h1>
          </div>
          <div class="content">
            <h2>Hi {{userName}}!</h2>
            <p>Welcome to our platform! Here's how to get started:</p>
            <ul>
              <li>Explore our features</li>
              <li>Customize your experience</li>
              <li>Get help when you need it</li>
            </ul>
            <p>Your subscription: <strong>{{product}}</strong></p>
            <p>We're here to help you succeed!</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>Our Team</p>
          </div>
        </div>
      </body>
      </html>
    `));

    // Engagement Nudge Email Template
    this.templates.set('engagement_nudge', Handlebars.compile(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>{{subject}}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Getting Started Tips 💡</h1>
          </div>
          <div class="content">
            <h2>Hi {{userName}}!</h2>
            <p>Here are some helpful tips to get the most out of your subscription:</p>
            <ul>
              <li>Check out our FAQ section for common questions</li>
              <li>Explore our getting started guide</li>
              <li>Join our community for tips and discussions</li>
            </ul>
            <p>Need help? Our support team is here for you!</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>Our Support Team</p>
          </div>
        </div>
      </body>
      </html>
    `));

    // Value Highlight Email Template
    this.templates.set('value_highlight', Handlebars.compile(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>{{subject}}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #9c27b0; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Discover Your Key Benefits ✨</h1>
          </div>
          <div class="content">
            <h2>Hi {{userName}}!</h2>
            <p>Here are the main benefits and features of your subscription:</p>
            <ul>
              <li>Exclusive content and resources</li>
              <li>Priority customer support</li>
              <li>Advanced features and tools</li>
              <li>Community access and networking</li>
            </ul>
            <p>Make the most of your subscription and unlock its full potential!</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>Our Team</p>
          </div>
        </div>
      </body>
      </html>
    `));

    // Newsletter Welcome Template
    this.templates.set('newsletter_welcome', Handlebars.compile(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>{{subject}}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #607d8b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Our Newsletter! 📧</h1>
          </div>
          <div class="content">
            <h2>Hi {{userName}}!</h2>
            <p>Thanks for subscribing to our newsletter! You'll receive:</p>
            <ul>
              <li>Weekly updates and insights</li>
              <li>Exclusive content and offers</li>
              <li>Industry news and trends</li>
            </ul>
            <p>We're excited to keep you informed!</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>Our Newsletter Team</p>
          </div>
        </div>
      </body>
      </html>
    `));
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    templateId: string;
    data: Record<string, any>;
    executionId?: string;
    stepId?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { to, subject, templateId, data, executionId, stepId } = params;

    try {
      // Get template
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Render email content
      const html = template({ subject, ...data });
      const text = this.htmlToText(html);

      // Create email log
      const emailLog = this.emailLogRepository.create({
        executionId: executionId || 'unknown',
        stepId: stepId || 'unknown',
        to,
        subject,
        templateId,
        data,
        status: 'sent',
        sentAt: new Date()
      });

      // Send email (or mock in development)
      if (process.env.NODE_ENV === 'production' && this.transporter) {
        const info = await this.transporter.sendMail({
          from: process.env.FROM_EMAIL || 'noreply@example.com',
          to,
          subject,
          text,
          html
        });

        emailLog.providerResponse = { messageId: info.messageId };
        emailLog.status = 'sent';

        this.logger.log(`Email sent successfully to ${to}: ${info.messageId}`);
      } else {
        // Mock mode for development/testing
        emailLog.providerResponse = { messageId: `mock-${Date.now()}` };
        emailLog.status = 'sent';

        this.logger.log(`[MOCK] Email would be sent to ${to} with subject: ${subject}`);
        this.logger.log(`[MOCK] Template: ${templateId}`);
        this.logger.log(`[MOCK] Data:`, data);
      }

      // Save email log
      await this.emailLogRepository.save(emailLog);

      return {
        success: true,
        messageId: emailLog.providerResponse?.messageId
      };

    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);

      // Log failed email
      if (executionId && stepId) {
        await this.emailLogRepository.save({
          executionId,
          stepId,
          to,
          subject,
          templateId,
          data,
          status: 'failed',
          error: error.message,
          sentAt: new Date()
        });
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Get email statistics
  async getEmailStats(executionId?: string): Promise<{
    total: number;
    sent: number;
    failed: number;
    byTemplate: Record<string, number>;
  }> {
    const query = this.emailLogRepository.createQueryBuilder('email');

    if (executionId) {
      query.where('email.executionId = :executionId', { executionId });
    }

    const emails = await query.getMany();

    const stats = {
      total: emails.length,
      sent: emails.filter(e => e.status === 'sent').length,
      failed: emails.filter(e => e.status === 'failed').length,
      byTemplate: {} as Record<string, number>
    };

    emails.forEach(email => {
      stats.byTemplate[email.templateId] = (stats.byTemplate[email.templateId] || 0) + 1;
    });

    return stats;
  }

  // Get emails for execution
  async getEmailsForExecution(executionId: string): Promise<EmailLog[]> {
    return await this.emailLogRepository.find({
      where: { executionId },
      order: { sentAt: 'ASC' }
    });
  }
}
