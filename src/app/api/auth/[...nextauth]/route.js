import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { connectToDB } from '@/lib/db';
import User from '@/models/User';
import DomainRole from '@/models/DomainRole';
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
        console.log('Login attempt:', credentials.email);

        const user = await User.findOne({ email: credentials.email });

        if (!user) {
          console.log('Login failed: User not found');
          return null;
        }

        if (!user.emailVerified) {
          console.log('Login failed: Email not verified');
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          console.log('Login failed: Invalid password');
          return null;
        }

        return {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          profileCompleted: user.profileCompleted,
          mustChangePassword: user.mustChangePassword,
        };
      }
    }),

    // 2. Add Google provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
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

      // 0. Check if user is already logged in (Account Linking Flow)
      // We need to retrieve the session. Since we are in the route handler, 
      // we might face issues getting headers directly in callback, 
      // but getServerSession works in App Router if imported.
      // Note: We need to import getServerSession from 'next-auth' 
      // AND use the LOCAL authOptions object (not imported from self to avoid circular dep if possible, 
      // but here we are IN the file defining it).

      // We can try to get the session. 
      // However, commonly in NextAuth v4 callbacks, you don't get the request object.
      // A workaround is to use the `email` to find the user if they exist.
      // BUT the user wants to link DIfferent emails.

      // Use `cookies` from Next.js headers to check for session token existence if getServerSession fails?
      // Actually, let's try obtaining the session.
      const { getServerSession } = await import('next-auth');
      const currentSession = await getServerSession(authOptions);

      if (currentSession?.user) {
        // User is logged in. We are LINKING this new account to them.
        const currentUser = await User.findById(currentSession.user.id);

        if (!currentUser) return false;

        // Check if this provider account is already linked to ANY user
        const accountAlreadyLinked = await User.findOne({
          'accounts.provider': account.provider,
          'accounts.providerAccountId': account.providerAccountId
        });

        if (accountAlreadyLinked) {
          if (accountAlreadyLinked._id.toString() === currentUser._id.toString()) {
            // Already linked to THIS user. Just allow signin.
            return true;
          } else {
            // Linked to ANOTHER user. block it.
            // We return false or throw an error. 
            // NextAuth will redirect to error page.
            // ideally return string URL or false.
            return '/student?error=AccountAlreadyLinked';
          }
        }

        // If it's not linked to anyone, link it to the current user
        await User.findByIdAndUpdate(currentUser._id, {
          $push: {
            accounts: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              email: profile?.email || user?.email, // Store email for reference
              accessToken: account.access_token,
              refreshToken: account.refresh_token
            }
          }
        });

        return true;
      }

      // --- Standard Login / Registration Flow (No active session) ---

      // For credentials login, just verify email
      if (account.provider === 'credentials') {
        const existingUser = await User.findOne({ email: user.email });
        return !!existingUser;
      }

      // For social providers (Google/Microsoft)
      const email = profile?.email || user?.email;
      const existingUser = await User.findOne({ email });

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
                email: email, // Store email
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

      // New user - determine role based on domain settings
      const domain = email.split('@')[1];
      let role = 'student';

      const domainRole = await DomainRole.findOne({ domain });
      if (domainRole) {
        role = domainRole.role;
      }

      const newUser = new User({
        email,
        name: profile?.name || user?.name || '',
        role,
        emailVerified: true, // Social logins are verified
        accounts: [{
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          email: email,
          accessToken: account.access_token,
          refreshToken: account.refresh_token
        }],
        profileCompleted: false,
      });

      await newUser.save();
      user.id = newUser._id;
      user.role = newUser.role;
      user.profileCompleted = newUser.profileCompleted;
      return true;
    },

    // 5. Keep your existing JWT and session callbacks
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session) {
        // Allow updating token when password is changed
        return { ...token, ...session.user, ...session };
      }

      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
        if (typeof user.profileCompleted !== 'undefined') {
          token.profileCompleted = user.profileCompleted;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.mustChangePassword = token.mustChangePassword ?? false;
      session.user.profileCompleted = token.profileCompleted ?? true;
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

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };