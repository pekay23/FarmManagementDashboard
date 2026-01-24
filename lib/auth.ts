import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import pool from "@/lib/pg";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const client = await pool.connect();
        try {
          // ✅ Fetch farm_id AND the new is_superadmin flag
          const result = await client.query(
            "SELECT id, email, password, farm_id, is_superadmin FROM users WHERE LOWER(email) = LOWER($1)", 
            [credentials.email]
          );
          const user = result.rows[0];

          if (!user) return null;

          const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);
          if (!isPasswordCorrect) return null;
          
          return {
            id: user.id,
            email: user.email,
            farm_id: user.farm_id,
            is_superadmin: user.is_superadmin, // ✅ Return is_superadmin
          };
        } finally {
          client.release();
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.farm_id = (user as any).farm_id;
        token.is_superadmin = (user as any).is_superadmin; // ✅ Pass to token
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).farm_id = token.farm_id;
        (session.user as any).is_superadmin = token.is_superadmin; // ✅ Pass to session
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
