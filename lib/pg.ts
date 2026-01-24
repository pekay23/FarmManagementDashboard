import { Pool } from 'pg';

// Declare a global type to prevent TypeScript errors on the global object
declare global {
  var pgPool: Pool | undefined;
}

let pool: Pool;

if (!global.pgPool) {
  global.pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Critical for Neon
    max: 10, // Limit max connections to prevent exhaustion
    idleTimeoutMillis: 30000, // Close idle clients after 30s
    connectionTimeoutMillis: 2000, // Fail fast if DB is down
  });
}

pool = global.pgPool;

export default pool;
