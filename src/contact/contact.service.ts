import {
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import sgMail from '@sendgrid/mail'; // FIXED IMPORT
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactMessage } from './entities/contact.entity';

@Injectable()
export class ContactService implements OnModuleInit {
  constructor(
    @InjectRepository(ContactMessage)
    private contactRepository: Repository<ContactMessage>,
  ) {}

  onModuleInit() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY is not defined in .env');
    }
    sgMail.setApiKey(apiKey);
  }

  async create(createContactDto: CreateContactDto) {
    try {
      // 1. Save to Database
      const newMessage = this.contactRepository.create(createContactDto);
      await this.contactRepository.save(newMessage);

      // 2. Prepare Email Data
      const senderEmail = process.env.SENDGRID_FROM_EMAIL || 'no-reply@hopn.eu';

      // --- USER ACKNOWLEDGMENT EMAIL ---
      const userHtml = this.generateEmailTemplate(
        `We received your message`,
        `
          <p style="margin: 0 0 16px;">Hello <strong style="color: #ffffff;">${createContactDto.fullName}</strong>,</p>
          <p style="margin: 0 0 24px;">
            Thank you for contacting <strong>HOPn</strong>. We have successfully received your inquiry regarding "<em>${createContactDto.subject}</em>".
          </p>
          <p style="margin: 0 0 24px;">
            Our team is reviewing your message and will get back to you shortly.
          </p>
          <div style="background-color: #1e293b; border-left: 4px solid #22d3ee; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
            <p style="margin: 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Your Message</p>
            <p style="margin: 8px 0 0; color: #e2e8f0; font-style: italic;">"${createContactDto.message}"</p>
          </div>
        `,
      );

      // --- ADMIN NOTIFICATION EMAIL ---
      const adminHtml = this.generateEmailTemplate(
        `New Contact Submission`,
        `
          <p style="margin: 0 0 16px;"><strong>New inquiry received from website.</strong></p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
            <tr>
              <td width="100" style="padding-bottom: 8px; color: #94a3b8;">Name:</td>
              <td style="padding-bottom: 8px; color: #ffffff;"><strong>${createContactDto.fullName}</strong></td>
            </tr>
            <tr>
              <td style="padding-bottom: 8px; color: #94a3b8;">Email:</td>
              <td style="padding-bottom: 8px; color: #22d3ee;">${createContactDto.email}</td>
            </tr>
            <tr>
              <td style="padding-bottom: 8px; color: #94a3b8;">Subject:</td>
              <td style="padding-bottom: 8px; color: #ffffff;">${createContactDto.subject}</td>
            </tr>
          </table>
          <div style="background-color: #1e293b; padding: 16px; border-radius: 4px;">
            <p style="margin: 0; color: #ffffff;">${createContactDto.message}</p>
          </div>
        `,
      );

      const userMsg = {
        to: createContactDto.email,
        from: { name: 'HOPn Support', email: senderEmail },
        subject: `We received your message: ${createContactDto.subject}`,
        html: userHtml,
      };

      const adminMsg = {
        to: 'admin@hopn.eu', // Replace with real admin email
        from: { name: 'HOPn System', email: senderEmail },
        subject: `[New Inquiry] ${createContactDto.subject}`,
        html: adminHtml,
      };

      // 3. Send emails
      await Promise.all([
        sgMail
          .send(userMsg)
          .catch((err) => console.error('User email failed', err)),
        sgMail
          .send(adminMsg)
          .catch((err) => console.error('Admin email failed', err)),
      ]);

      return { success: true, message: 'Message saved successfully' };
    } catch (error) {
      console.error('Error processing contact message:', error);
      throw new InternalServerErrorException('Failed to process request');
    }
  }

  /**
   * Generates a professional, dark-themed HTML email wrapper
   */
  private generateEmailTemplate(title: string, content: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; background-color: #020617; color: #cbd5e1; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          a { color: #22d3ee; text-decoration: none; }
          .wrapper { width: 100%; table-layout: fixed; background-color: #020617; padding-bottom: 40px; }
          .content { max-width: 600px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5); }
          .header { background-color: #0f172a; padding: 30px 40px; border-bottom: 1px solid #1e293b; text-align: center; }
          .logo { color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; display: inline-block; }
          .logo-accent { color: #22d3ee; }
          .body { padding: 40px; color: #cbd5e1; line-height: 1.6; font-size: 16px; }
          .footer { padding: 30px; text-align: center; font-size: 12px; color: #64748b; background-color: #020617; }
        </style>
      </head>
      <body>
        <table class="wrapper" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td align="center">
              <br/><br/>
              <table class="content" cellpadding="0" cellspacing="0" role="presentation" width="100%">
                
                <tr>
                  <td class="header">
                    <div class="logo">
                      HOP<span class="logo-accent">n</span>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td class="body">
                    <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">${title}</h2>
                    ${content}
                    
                    <br/>
                    <p style="margin-bottom: 0;">
                      Best regards,<br/>
                      <strong style="color: #22d3ee;">The HOPn Team</strong>
                    </p>
                  </td>
                </tr>

              </table>
              
              <div class="footer">
                <p style="margin: 0 0 8px;">Pioneering Tomorrow's Technology, Today.</p>
                <p style="margin: 0;">
                  HOPn &bull; Weichterstr 1, Buchloe, Germany &bull; <a href="https://hopn.eu">hopn.eu</a>
                </p>
              </div>

            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }
}
