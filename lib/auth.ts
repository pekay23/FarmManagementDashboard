import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { Pool } from 'pg';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: true 
});

export const authOptions: NextAuthOptions = {
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
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
          const result = await client.query("SELECT * FROM users WHERE email = $1", [credentials.email]);
          const user = result.rows[0];

          if (!user) return null;

          const isValid = await compare(credentials.password, user.password);

          if (!isValid) return null;

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
