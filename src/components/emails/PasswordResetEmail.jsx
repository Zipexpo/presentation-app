import { Html, Head, Preview, Body, Container, Text, Link, Section } from '@react-email/components';

export default function PasswordResetEmail({ name, url }) {
  return (
    <Html>
      <Head />
      <Preview>Đặt lại mật khẩu</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={h1}>Đặt lại mật khẩu</Text>
          <Text style={text}>Chào {name || 'bạn'},</Text>
          <Text style={text}>
            Có yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Bấm nút bên dưới để chọn mật khẩu mới. Liên kết có hiệu lực 1 giờ.
          </Text>
          <Section style={buttonContainer}>
            <Link style={button} href={url}>Đặt mật khẩu mới</Link>
          </Section>
          <Text style={small}>
            Nếu bạn không yêu cầu, hãy bỏ qua email này: mật khẩu hiện tại vẫn giữ nguyên.
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
const container = { margin: '0 auto', padding: '20px 0 48px' };
const h1 = { fontSize: '24px', lineHeight: '1.3', fontWeight: '700', color: '#484848' };
const text = { fontSize: '16px', lineHeight: '1.4', color: '#484848', margin: '16px 0' };
const small = { fontSize: '13px', lineHeight: '1.4', color: '#8a8a8a', margin: '16px 0' };
const buttonContainer = { textAlign: 'center', margin: '24px 0' };
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
