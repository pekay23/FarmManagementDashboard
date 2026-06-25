import { Pool } from 'pg';

// Declare a global type to prevent TypeScript errors on the global object
declare global {
  var pgPool: Pool | undefined;
}

if (!global.pgPool) {
  global.pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10, // Limit max connections to prevent exhaustion
    idleTimeoutMillis: 30000, // Close idle clients after 30s
    connectionTimeoutMillis: 10000, // Allow time for Neon cold starts
    statement_timeout: 5000, // Safety: timeout long-running queries
  });
}

const pool = global.pgPool;

export default pool;
