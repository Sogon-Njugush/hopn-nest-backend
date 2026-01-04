import {
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import sgMail from '@sendgrid/mail';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactMessage } from './entities/contact.entity';

@Injectable()
export class ContactService implements OnModuleInit {
  constructor(
    @InjectRepository(ContactMessage)
    private contactRepository: Repository<ContactMessage>,
  ) {}

  // Initialize SendGrid when the module loads
  onModuleInit() {
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY is not defined in .env');
    }

    sgMail.setApiKey(apiKey);
  }

  async sendTest() {
    try {
      // Force string type using || '' fallback or ! operator
      const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'no-reply@hopn.eu';

      const msg = {
        to: 'josephnjuguna00@gmail.com',
        from: fromEmail,
        subject: 'Test Email via SendGrid',
        html: '<p>Hello, this is a test email sent using SendGrid!</p>',
      };

      await sgMail.send(msg);
      console.log('Test email sent successfully');
    } catch (err) {
      console.error('Test email failed:', err);
    }
  }

  async create(createContactDto: CreateContactDto) {
    try {
      // 1. Save to Database
      const newMessage = this.contactRepository.create(createContactDto);
      await this.contactRepository.save(newMessage);

      // 2. Prepare Email Data
      // Use fallback to ensure it's always a string
      const senderEmail = process.env.SENDGRID_FROM_EMAIL || 'no-reply@hopn.eu';

      const userMsg = {
        to: createContactDto.email,
        from: senderEmail,
        subject: `We received your message: ${createContactDto.subject}`,
        html: `
          <h3>Hello ${createContactDto.fullName},</h3>
          <p>Thank you for contacting HOPn. We have received your message and will get back to you shortly.</p>
          <br/>
          <p><strong>Your Message:</strong></p>
          <p><em>${createContactDto.message}</em></p>
          <br/>
          <p>Best regards,</p>
          <p>The HOPn Team</p>
        `,
      };

      const adminMsg = {
        to: 'admin@hopn.eu',
        from: senderEmail,
        subject: `New Contact Form Submission: ${createContactDto.subject}`,
        html: `<p>New message from <strong>${createContactDto.fullName}</strong> (${createContactDto.email}):</p><p>${createContactDto.message}</p>`,
      };

      // 3. Send emails
      sgMail
        .send(userMsg)
        .catch((err) => console.error('User email failed', err));
      sgMail
        .send(adminMsg)
        .catch((err) => console.error('Admin email failed', err));

      return { success: true, message: 'Message saved successfully' };
    } catch (error) {
      console.error('Error processing contact message:', error);
      throw new InternalServerErrorException('Failed to process request');
    }
  }
}
