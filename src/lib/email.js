import { Resend } from 'resend';

/**
 * Sender for every email. Resend's sandbox address only delivers to the Resend account owner, so
 * without EMAIL_FROM on a verified domain students never receive activation or reset links.
 */
const FROM = process.env.EMAIL_FROM || 'Presentation App <onboarding@resend.dev>';
if (!process.env.EMAIL_FROM) {
  console.error('[email] EMAIL_FROM is not set: falling back to onboarding@resend.dev, which only delivers to the Resend account owner.');
}
import AccountCreationEmail from '@/components/emails/AccountCreationEmail';
import PasswordChangedEmail from '@/components/emails/PasswordChangedEmail';
import VerificationEmail from '@/components/emails/VerificationEmail';
import PasswordResetEmail from '@/components/emails/PasswordResetEmail';

export const sendAccountCreationEmail = async (email, name, password, teacherName) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: FROM,
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

export const sendPasswordChangedEmail = async (email, name) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: FROM,
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

/**
 * The email that activates a self-registered account. It used to be a console.log placeholder,
 * so registration "succeeded" but no one ever received a link and the account stayed locked.
 */
export const sendVerificationEmail = async ({ email, name, url, via }) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [email],
      subject: 'Xác nhận email để kích hoạt tài khoản',
      react: VerificationEmail({ name, email, url, via }),
    });
    if (error) {
      console.error('Error sending verification email:', error);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

/** Password reset link (lib/registration.js requestPasswordReset). */
export const sendPasswordResetEmail = async ({ email, name, url }) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [email],
      subject: 'Đặt lại mật khẩu',
      react: PasswordResetEmail({ name, url }),
    });
    if (error) {
      console.error('Error sending reset email:', error);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Error sending reset email:', error);
    return { success: false, error: error.message };
  }
};
