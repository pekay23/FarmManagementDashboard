const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const SUPER_ADMIN_EMAIL = 'admin@hughesfarms.com'; // Your email

async function promoteAdmin() {
  try {
    console.log(`🚀 Promoting ${SUPER_ADMIN_EMAIL} to Super Admin...`);
    
    // Set is_superadmin to true and NULL out the farm_id
    const res = await pool.query(
      "UPDATE users SET is_superadmin = TRUE, farm_id = NULL WHERE email = $1",
      [SUPER_ADMIN_EMAIL.toLowerCase()]
    );

    if (res.rowCount === 0) {
        console.log(`❌ User ${SUPER_ADMIN_EMAIL} not found.`);
    } else {
        console.log(`✅ Success! ${SUPER_ADMIN_EMAIL} is now a Super Admin.`);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await pool.end();
  }
}

promoteAdmin();
