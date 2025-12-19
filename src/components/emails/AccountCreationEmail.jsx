import * as React from 'react';
import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Link,
    Preview,
    Section,
    Text,
    Hr,
} from '@react-email/components';

export const AccountCreationEmail = ({ name, email, password, url, teacherName }) => (
    <Html>
        <Head />
        <Preview>Welcome to Presentation App - Your Account Details</Preview>
        <Body style={main}>
            <Container style={container}>
                <Heading style={h1}>Welcome, {name}!</Heading>
                <Text style={text}>
                    {teacherName
                        ? `${teacherName} has added you to the class and created an account for you.`
                        : 'Your account has been created for the Presentation App.'}
                </Text>
                <Section style={box}>
                    <Text style={paragraph}>
                        <strong>Email:</strong> {email}
                    </Text>
                    <Text style={paragraph}>
                        <strong>Temporary Password:</strong> {password}
                    </Text>
                </Section>
                <Text style={text}>
                    <strong>Important:</strong> You will be required to change your password upon your first login.
                </Text>
                <Section style={btnContainer}>
                    <Link style={button} href={url}>
                        Login to Dashboard
                    </Link>
                </Section>
                <Hr style={hr} />
                <Text style={footer}>
                    If you did not request this account, please contact the administrator.
                </Text>
            </Container>
        </Body>
    </Html>
);

export default AccountCreationEmail;

const main = {
    backgroundColor: '#ffffff',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
};

const h1 = {
    color: '#333',
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: '30px 0',
};

const text = {
    color: '#333',
    fontSize: '16px',
    lineHeight: '26px',
};

const box = {
    padding: '24px',
    backgroundColor: '#f2f3f3',
    borderRadius: '4px',
    margin: '24px 0',
};

const paragraph = {
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0',
    marginBottom: '10px',
};

const btnContainer = {
    textAlign: 'center',
    margin: '32px 0',
};

const button = {
    backgroundColor: '#007ee6',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '16px',
    textDecoration: 'none',
    textAlign: 'center',
    display: 'block',
    padding: '12px',
    width: '200px',
    margin: '0 auto',
};

const hr = {
    borderColor: '#e6ebf1',
    margin: '20px 0',
};

const footer = {
    color: '#8898aa',
    fontSize: '12px',
};
