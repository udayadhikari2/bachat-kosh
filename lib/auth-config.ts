import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Invalid credentials");
          }

          await connectDB();
          const email = credentials.email.toLowerCase().trim();
          console.log("\n************************************");
          console.log("LOGIN ATTEMPT:", email);
          
          const user = await User.findOne({ email });
          console.log("USER FOUND IN DB:", !!user);

          if (!user || !user.isActive) {
            console.log("AUTH FAILED: User not found or inactive");
            console.log("************************************\n");
            throw new Error("User not found or inactive");
          }

          // Check password
          const isPasswordCorrect = await bcrypt.compare(
            credentials.password,
            user.password || ""
          );
          console.log("PASSWORD MATCH:", isPasswordCorrect);

          if (!isPasswordCorrect) {
            console.log("AUTH FAILED: Invalid password");
            console.log("************************************\n");
            throw new Error("Invalid password");
          }

          console.log("AUTH SUCCESSFUL");
          console.log("************************************\n");

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId?.toString(),
          };
        } catch (error) {
          console.error("\n!!!!!!!! AUTH ERROR !!!!!!!!\n", error);
          console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n");
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.organizationId = (user as any).organizationId;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
