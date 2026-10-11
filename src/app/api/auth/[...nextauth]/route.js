import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { connectToDB } from '@/lib/db';
import User from '@/models/User';
import DomainRole from '@/models/DomainRole';
import bcrypt from 'bcryptjs';

/** Emails are matched case-insensitively ("An@x.com" signed up, "an@x.com" typed). */
function findUserByEmail(email) {
  const escaped = String(email).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return User.findOne({ email: new RegExp(`^${escaped}$`, 'i') });
}

/** The fields the session carries, always taken from the database row. */
function sessionFields(u) {
  return {
    id: u._id,
    role: u.role,
    mustChangePassword: !!u.mustChangePassword,
    profileCompleted: u.profileCompleted !== false,
  };
}

export const authOptions = {
  providers: [
    // 1. Keep your existing credentials provider
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      // Errors are thrown as codes; /login maps them to messages. Returning null for every case
      // showed the literal "CredentialsSignin", and a Google-only account (no password) crashed
      // bcrypt with "Illegal arguments".
      async authorize(credentials) {
        await connectToDB();
        const email = String(credentials?.email || '').trim();
        const user = email ? await findUserByEmail(email) : null;
        if (!user) throw new Error('invalid');
        if (!user.password) throw new Error('no_password');
        const isValid = await bcrypt.compare(String(credentials?.password || ''), user.password);
        if (!isValid) throw new Error('invalid');
        if (!user.emailVerified) throw new Error('unverified');
        if (user.active === false) throw new Error('disabled');

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

    // 2/3. Google and Microsoft only when configured: an unconfigured provider still showed a
    // button on /login that ended on /error?error=Configuration.
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          authorization: { params: { prompt: "consent", access_type: "offline", response_type: "code" } }
        })]
      : []),
    ...(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET
      ? [AzureADProvider({
          clientId: process.env.AZURE_AD_CLIENT_ID,
          clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
          tenantId: process.env.AZURE_AD_TENANT_ID
        })]
      : []),
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

      // Signing in with a password while signed in is switching accounts, not linking one.
      if (currentSession?.user && account.provider !== 'credentials') {
        // User is logged in. We are LINKING this new account to them.
        const currentUser = await User.findById(currentSession.user.id);

        if (!currentUser) return false;

        // Check if this provider account is already linked to ANY user
        const accountAlreadyLinked = await User.findOne({
          'accounts.provider': account.provider,
          'accounts.providerAccountId': account.providerAccountId
        });

        // Linking keeps the person signed in as themselves: without this the new token took the
        // provider's account id as `id` and lost the role, so /profile crashed and teachers got 403.
        Object.assign(user, sessionFields(currentUser));

        if (accountAlreadyLinked) {
          if (accountAlreadyLinked._id.toString() === currentUser._id.toString()) {
            // Already linked to THIS user. Just allow signin.
            return true;
          } else {
            // Linked to ANOTHER user. block it.
            // We return false or throw an error. 
            // NextAuth will redirect to error page.
            // ideally return string URL or false.
            return '/profile?error=AccountAlreadyLinked';
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

      // Credentials were fully checked in authorize() (password, verified, active).
      if (account.provider === 'credentials') return true;

      // For social providers (Google/Microsoft)
      const email = profile?.email || user?.email;
      const existingUser = await findUserByEmail(email);
      if (existingUser && existingUser.active === false) return '/login?error=disabled';

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

        // Google/Microsoft just proved this address belongs to the person. If the account was
        // still waiting for its emailed link, whoever registered it may not be them: drop that
        // password and pending link, and let them set their own on /complete-profile.
        if (!existingUser.emailVerified) {
          existingUser.emailVerified = true;
          existingUser.password = undefined;
          existingUser.verificationToken = undefined;
          existingUser.verificationTokenExpires = undefined;
          existingUser.verificationReturnTo = undefined;
          existingUser.profileCompleted = false;
          await existingUser.save();
        }

        // Update user object for session (both flags too: a returning Google user skipped the
        // forced password change and the profile completion otherwise).
        Object.assign(user, sessionFields(existingUser));
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
      if (trigger === "update") {
        // Re-read from the database instead of trusting the client: update({ role: 'admin' })
        // from the browser console used to be merged straight into the token.
        await connectToDB();
        const fresh = token.id ? await User.findById(token.id).catch(() => null) : null;
        if (!fresh || fresh.active === false) return { ...token, role: undefined };
        const f = sessionFields(fresh);
        return { ...token, role: f.role, mustChangePassword: f.mustChangePassword, profileCompleted: f.profileCompleted };
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