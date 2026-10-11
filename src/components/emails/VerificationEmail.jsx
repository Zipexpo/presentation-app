import { Html, Head, Preview, Body, Container, Text, Link, Section } from '@react-email/components';

/**
 * Sent when someone registers. `url` is the full verification link (built in lib/registration.js),
 * so the template doesn't guess the route: the old one pointed at /api/verify, which never existed.
 */
export default function VerificationEmail({ name, email, url, via }) {
  return (
    <Html>
      <Head />
      <Preview>Xác nhận email để kích hoạt tài khoản</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={h1}>Xác nhận email của bạn</Text>
          <Text style={text}>Chào {name || 'bạn'},</Text>
          <Text style={text}>
            Bạn vừa tạo tài khoản với email <b>{email}</b>
            {via ? ` (đăng ký từ ${via})` : ''}. Bấm nút bên dưới để kích hoạt tài khoản. Liên kết có hiệu lực 24 giờ.
          </Text>
          <Section style={buttonContainer}>
            <Link style={button} href={url}>
              Xác nhận email
            </Link>
          </Section>
          <Text style={small}>
            Tài khoản này dùng chung cho hệ thống thuyết trình và Teamwo. Nếu bạn không đăng ký, hãy bỏ qua email này.
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

const small = {
  fontSize: '13px',
  lineHeight: '1.4',
  color: '#8a8a8a',
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
