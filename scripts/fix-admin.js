const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');

// Point to .env.local
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});

async function fixAdmin() {
  const email = 'floowdis@gmail.com';
  const plainPassword = '123';

  try {
    console.log("🚀 Connecting to database...");

    // ✅ STEP 1: Add the 'role' column if it doesn't exist
    console.log("🛠️  Ensuring 'role' column exists...");
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Viewer';
    `);

    // ✅ STEP 2: Generate the password hash
    console.log("🛠️  Generating new hash for '123'...");
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(plainPassword, salt);
    
    // ✅ STEP 3: Insert or Update the user
    console.log("🚀 Saving Admin account...");
    const query = `
      INSERT INTO users (email, password, role)
      VALUES ($1, $2, 'Admin')
      ON CONFLICT (email) 
      DO UPDATE SET password = $2, role = 'Admin';
    `;

    await pool.query(query, [email.toLowerCase(), hash]);
    
    console.log("✅ SUCCESS!");
    console.log(`User: ${email} is now an Admin with password: ${plainPassword}`);

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    console.log("\n💡 Tip: If it says 'relation users does not exist', check if your table is named 'User' (capital U).");
  } finally {
    await pool.end();
  }
}

fixAdmin();
