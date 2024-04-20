import NextAuth from "next-auth";
import User from "@/models/user";
// import GitHub from "next-auth/providers/github"
// import Google from "next-auth/providers/google"
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import {authConfig} from "./auth.config";
import CredentialsProvider from "next-auth/providers/credentials";
import {connectToDb} from "@/lib/mongodb";
import bcrypt from "bcryptjs";
 
const login = async (credentials) => {
    try {
      connectToDb();
      const user = await User.findOne({ username: credentials.username });
  
      if (!user) throw new Error("Wrong credentials!");
  
      const isPasswordCorrect = await bcrypt.compare(
        credentials.password,
        user.password
      );
  
      if (!isPasswordCorrect) throw new Error("Wrong credentials!");
  
      return user;
    } catch (err) {
      console.log(err);
      throw new Error("Failed to login!");
    }
  };

export const { auth, handlers, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        CredentialsProvider({
            async authorize(credentials) {
              try {
                const user = await login(credentials);
                return user;
              } catch (err) {
                return null;
              }
            },
          })],
        callbacks: {
          async signIn({ user, account, profile }) {
            if (account.provider === "github") {
              connectToDb();
              try {
                const user = await User.findOne({ email: profile.email });
      
                if (!user) {
                  const newUser = new User({
                    username: profile.login,
                    email: profile.email,
                    image: profile.avatar_url,
                  });
      
                  await newUser.save();
                }
              } catch (err) {
                console.log(err);
                return false;
              }
            }
            return true;
          },
          ...authConfig.callbacks,
        }
    // providers
})