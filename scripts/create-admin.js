const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize the database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createAdmin() {
  const email = 'floowdis@gmail.com';
  const password = '123';
  const role = 'Admin';

  const client = await pool.connect();
  try {
    console.log(`Checking if user ${email} exists...`);
    
    // Check if user already exists
    const check = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (check.rows.length > 0) {
      console.log('User already exists. Updating password and role to Admin...');
      const hashedPassword = await bcrypt.hash(password, 10);
      await client.query(
        'UPDATE users SET password = $1, role = $2 WHERE email = $3',
        [hashedPassword, role, email]
      );
      console.log('✅ User updated to Admin successfully!');
    } else {
      console.log('Creating new Admin account...');
      const hashedPassword = await bcrypt.hash(password, 10);
      await client.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
        [email, hashedPassword, role]
      );
      console.log('✅ Admin account created successfully!');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createAdmin();
