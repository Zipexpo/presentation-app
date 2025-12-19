import { Resend } from 'resend';
import AccountCreationEmail from '@/components/emails/AccountCreationEmail';

export const sendAccountCreationEmail = async (email, name, password, teacherName) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Presentation App <onboarding@resend.dev>', // Default resend dev email
      to: [email],
      subject: 'Welcome to Presentation App - Your Account Details',
      react: AccountCreationEmail({
        name,
        email,
        password,
        url: process.env.NEXTAUTH_URL,
        teacherName
      }),
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

import PasswordChangedEmail from '@/components/emails/PasswordChangedEmail';

export const sendPasswordChangedEmail = async (email, name) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Presentation App <onboarding@resend.dev>',
      to: [email],
      subject: 'Security Alert: Password Changed',
      react: PasswordChangedEmail({
        name,
        email
      }),
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }

    console.log('Password change email sent:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};