import * as React from 'react';
import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Text,
    Hr,
    Section,
} from '@react-email/components';

export const PasswordChangedEmail = ({ name, email }) => (
    <Html>
        <Head />
        <Preview>Your password has been changed</Preview>
        <Body style={main}>
            <Container style={container}>
                <Heading style={h1}>Password Changed</Heading>
                <Text style={text}>
                    Hello {name},
                </Text>
                <Text style={text}>
                    The password for your account associated with <strong>{email}</strong> has been successfully changed.
                </Text>
                <Section style={box}>
                    <Text style={paragraph}>
                        If you did not make this change, please contact your administrator immediately.
                    </Text>
                </Section>
                <Hr style={hr} />
                <Text style={footer}>
                    Presentation App System
                </Text>
            </Container>
        </Body>
    </Html>
);

export default PasswordChangedEmail;

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
    padding: '15px',
    backgroundColor: '#fff0f0',
    borderRadius: '4px',
    margin: '24px 0',
    border: '1px solid #ffe0e0',
};

const paragraph = {
    fontSize: '14px',
    lineHeight: '24px',
    margin: '0',
    color: '#d32f2f',
};

const hr = {
    borderColor: '#e6ebf1',
    margin: '20px 0',
};

const footer = {
    color: '#8898aa',
    fontSize: '12px',
};
