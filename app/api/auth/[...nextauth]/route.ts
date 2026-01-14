import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const handler = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: '/login', // We will build this custom page next
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
          // 1. Find user
          const result = await client.query("SELECT * FROM users WHERE email = $1", [credentials.email]);
          const user = result.rows[0];

          if (!user) return null;

          // 2. Check password (using bcrypt to compare hashed password)
          // For the very first manual test, if you manually inserted a plain text password in Neon, 
          // you can temporarily use: const isValid = credentials.password === user.password;
          const isValid = await compare(credentials.password, user.password);

          if (!isValid) return null;

          return { id: user.id, name: user.name, email: user.email };
        } finally {
          client.release();
        }
      }
    })
  ]
});

export { handler as GET, handler as POST };
