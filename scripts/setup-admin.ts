import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: '.env.local' });

async function setup() {
  const adminEmail = process.env.SETUP_ADMIN_EMAIL;
  const adminPassword = process.env.SETUP_ADMIN_PASSWORD;
  const farmName = process.env.SETUP_FARM_NAME || 'Default Farm';

  if (!adminEmail || !adminPassword || adminPassword.length < 12) {
    throw new Error('SETUP_ADMIN_EMAIL and a 12+ character SETUP_ADMIN_PASSWORD are required');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 2,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create default farm
    let farmId;
    const farmCheck = await client.query('SELECT id FROM farms WHERE name = $1 LIMIT 1', [farmName]);
    if (farmCheck.rows.length > 0) {
      farmId = farmCheck.rows[0].id;
    } else {
      const newFarm = await client.query('INSERT INTO farms (name) VALUES ($1) RETURNING id', [farmName]);
      farmId = newFarm.rows[0].id;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Create or reset the configured super admin.
    await client.query(`
      INSERT INTO users (email, password, is_superadmin, farm_id)
      VALUES ($1, $2, TRUE, $3)
      ON CONFLICT (email) 
      DO UPDATE SET password = $2, is_superadmin = TRUE, farm_id = $3
    `, [adminEmail, hashedPassword, farmId]);
    
    await client.query('COMMIT');
    console.log(`Super admin is ready: ${adminEmail}`);
    console.log('Farm ID:', farmId);
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    console.error('Error:', error instanceof Error ? error.message : error);
  } finally {
    client.release();
    await pool.end();
  }
}

setup();
