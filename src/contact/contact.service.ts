import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactMessage } from './entities/contact.entity';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(ContactMessage)
    private contactRepository: Repository<ContactMessage>,
    private readonly mailerService: MailerService,
  ) {}

  async create(createContactDto: CreateContactDto) {
    try {
      //Save to Database
      const newMessage = this.contactRepository.create(createContactDto);
      await this.contactRepository.save(newMessage);

      // Respond immediately
      const response = { success: true, message: 'Message saved successfully' };

      // Send emails asynchronously (non-blocking)
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
        .catch((err) => console.error('Failed to send user email', err));

      this.mailerService
        .sendMail({
          to: 'admin@hopn.eu',
          subject: `New Contact Form Submission: ${createContactDto.subject}`,
          html: `<p>New message from <strong>${createContactDto.fullName}</strong> (${createContactDto.email}):</p><p>${createContactDto.message}</p>`,
        })
        .catch((err) => console.error('Failed to send admin email', err));

      return response;
    } catch (error) {
      console.error('Error processing contact message:', error);
      throw new InternalServerErrorException('Failed to process request');
    }
  }
}
