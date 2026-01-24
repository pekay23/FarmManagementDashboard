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
          console.log("🔍 Attempting login for:", credentials.email);

          // 1. Fetch User AND farm_id
          const result = await client.query(
            "SELECT id, email, password, role, farm_id FROM users WHERE LOWER(email) = LOWER($1)", 
            [credentials.email]
          );
          const user = result.rows[0];

          if (!user) {
            console.log("❌ User not found.");
            return null;
          }

          const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordCorrect) {
            console.log("❌ Password mismatch.");
            return null;
          }

          console.log("🎉 Login successful!", user.email, "Farm:", user.farm_id);

          // 2. Return object with farm_id
          return {
            id: user.id,
            email: user.email,
            role: user.role,
            farm_id: user.farm_id, // <--- CRITICAL
          };
        } catch (error) {
          console.error("🔥 Auth Error:", error);
          return null;
        } finally {
          client.release();
        }
      },
    }),
  ],
  callbacks: {
    // 3. Persist farm_id to the Token
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = (user as any).id;
        token.farm_id = (user as any).farm_id; // <--- CRITICAL
      }
      return token;
    },
    // 4. Persist farm_id to the Session (so APIs can see it)
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).farm_id = token.farm_id; // <--- CRITICAL
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
