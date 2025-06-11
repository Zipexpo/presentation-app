import { Html, Head, Preview, Body, Container, Text, Link, Section } from '@react-email/components';

export default function VerificationEmail({ email, token }) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/api/verify?token=${token}`;

  return (
    <Html>
      <Head />
      <Preview>Verify your email address</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={h1}>Email Verification</Text>
          <Text style={text}>Hello,</Text>
          <Text style={text}>
            Please click the link below to verify your email address ({email}) for the Presentation Management System.
          </Text>
          <Section style={buttonContainer}>
            <Link style={button} href={verificationUrl}>
              Verify Email
            </Link>
          </Section>
          <Text style={text}>
            If you didn't request this, please ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
};

const h1 = {
  fontSize: '24px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#484848',
};

const text = {
  fontSize: '16px',
  lineHeight: '1.4',
  color: '#484848',
  margin: '16px 0',
};

const buttonContainer = {
  textAlign: 'center',
  margin: '24px 0',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center',
  display: 'block',
  padding: '12px',
  width: '200px',
  margin: '0 auto',
};