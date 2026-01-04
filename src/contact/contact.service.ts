import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer'; // Import Nest Mailer
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactMessage } from './entities/contact.entity';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(ContactMessage)
    private contactRepository: Repository<ContactMessage>,
    private readonly mailerService: MailerService, // Inject Service
  ) {}

  async create(createContactDto: CreateContactDto) {
    try {
      // 1. Save to Database
      const newMessage = this.contactRepository.create(createContactDto);
      await this.contactRepository.save(newMessage);

      // 2. Send User Acknowledgment (Async)
      this.mailerService
        .sendMail({
          to: createContactDto.email,
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
        })
        .catch((err) => console.error('Failed to send user email:', err));

      // 3. Send Admin Notification (Async)
      this.mailerService
        .sendMail({
          to: 'admin@hopn.eu', // Change to your admin email
          subject: `New Contact Form Submission: ${createContactDto.subject}`,
          html: `
            <h3>New Contact Request</h3>
            <p><strong>Name:</strong> ${createContactDto.fullName}</p>
            <p><strong>Email:</strong> ${createContactDto.email}</p>
            <p><strong>Subject:</strong> ${createContactDto.subject}</p>
            <hr/>
            <p><strong>Message:</strong></p>
            <p>${createContactDto.message}</p>
          `,
        })
        .catch((err) => console.error('Failed to send admin email:', err));

      return { success: true, message: 'Message saved successfully' };
    } catch (error) {
      console.error('Error processing contact message:', error);
      throw new InternalServerErrorException('Failed to process request');
    }
  }
}
