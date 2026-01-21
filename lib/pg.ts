// lib/pg.ts
import { Pool } from 'pg';

// This is the connection for the SERVER side (API Routes)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true, // Critical for Neon
});

export default pool;
