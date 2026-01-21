import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { Pool } from 'pg';

// 1. Create the Pool with SSL (Required for Neon/Netlify)
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: true // CRITICAL: Neon requires this!
});

export const authOptions: NextAuthOptions = {
  session: { 
    strategy: "jwt",
    // 2. Offline Optimization: Keep session for 30 days
    maxAge: 30 * 24 * 60 * 60, 
  },
  pages: {
    signIn: '/login',
  },
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
          // 3. Find user (Case insensitive email search is usually safer)
          const result = await client.query("SELECT * FROM users WHERE email = $1", [credentials.email]);
          const user = result.rows[0];

          if (!user) return null;

          // 4. Check password
          const isValid = await compare(credentials.password, user.password);

          if (!isValid) return null;

          // 5. Return user object (NextAuth stores this in the token)
          return { 
            id: user.id, 
            name: user.name, 
            email: user.email 
          };
        } catch (error) {
          console.error("Login error:", error);
          return null;
        } finally {
          client.release();
        }
      }
    })
  ]
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
