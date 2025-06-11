import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { connectToDB } from './db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export const authOptions = {
  providers: [
    // 1. Keep your existing credentials provider
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        await connectToDB();
        const user = await User.findOne({ email: credentials.email });
        
        if (!user || !user.emailVerified) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        return {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    }),

    // 2. Add Google provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),

    // 3. Add Microsoft provider
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID
    })
  ],

  callbacks: {
    // 4. Add account linking logic
    async signIn({ user, account, profile }) {
      await connectToDB();

      // For credentials login, just verify email
      if (account.provider === 'credentials') {
        const existingUser = await User.findOne({ email: user.email });
        return !!existingUser;
      }

      // For social providers (Google/Microsoft)
      const existingUser = await User.findOne({ email: profile.email });

      // If user exists (via email/password)
      if (existingUser) {
        // Check if this social account is already linked
        const isLinked = existingUser.accounts?.some(
          acc => acc.provider === account.provider && 
                acc.providerAccountId === account.providerAccountId
        );

        // If not linked, add the new provider
        if (!isLinked) {
          await User.findByIdAndUpdate(existingUser._id, {
            $push: {
              accounts: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                accessToken: account.access_token,
                refreshToken: account.refresh_token
              }
            }
          });
        }

        // Update user object for session
        user.id = existingUser._id;
        user.role = existingUser.role;
        return true;
      }

      // New user - create account
      const newUser = new User({
        email: profile.email,
        name: profile.name,
        role: 'student', // Default role
        emailVerified: true, // Social logins are verified
        accounts: [{
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          accessToken: account.access_token,
          refreshToken: account.refresh_token
        }]
      });

      await newUser.save();
      user.id = newUser._id;
      user.role = newUser.role;
      return true;
    },

    // 5. Keep your existing JWT and session callbacks
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    }
  },

  // 6. Keep your existing pages configuration
  pages: {
    signIn: '/login',
    signUp: '/register',
    verifyRequest: '/verify-email',
    error: '/error'
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);