import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import VerificationEmail from '@/emails/verification-email';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendVerificationEmail(email, token) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify?token=${token}`;
  
  const emailHtml = render(
    <VerificationEmail 
      email={email} 
      verificationUrl={verificationUrl} 
    />
  );

  await transporter.sendMail({
    from: `"Presentation System" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify your email address",
    html: emailHtml,
  });
}