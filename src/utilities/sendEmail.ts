import nodemailer, { SendMailOptions } from 'nodemailer';

import { BadRequestError } from '../app/errors/request/apiError';
import config from '../config';

// Define a type for the mail options
interface MailOptions {
  from: string;
  to: string;
  subject: string;
  html: any;
}

// Define the sendMail function
const sendMail = async ({ from, to, subject, html }: MailOptions): Promise<boolean> => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.gmail_app_user,
        pass: config.gmail_app_password,
      },
    });

    const mailOptions: SendMailOptions = {
      from,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);

    // STRICT validation
    if (!info.messageId || info.accepted.length === 0) {
      throw new Error('Email Server Error! Failed to send mail!');
    }
    return true;
  } catch (error: any) {
    throw new BadRequestError(error);
  }
};

export default sendMail;
