const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixAllUsers() {
  try {
    const client = await pool.connect();
    console.log("🚀 Checking for orphaned users...");

    // 1. Get Default Farm ID
    const farmRes = await client.query("SELECT id FROM farms WHERE name = 'Default Farm' LIMIT 1");
    if (farmRes.rows.length === 0) {
        console.error("❌ No 'Default Farm' found. Please run create-farm.js first.");
        return;
    }
    const defaultFarmId = farmRes.rows[0].id;

    // 2. Update ALL users with no farm
    const updateRes = await client.query(
        "UPDATE users SET farm_id = $1 WHERE farm_id IS NULL RETURNING email",
        [defaultFarmId]
    );

    if (updateRes.rows.length > 0) {
        console.log(`✅ Fixed ${updateRes.rows.length} users:`);
        updateRes.rows.forEach(u => console.log(`   - ${u.email}`));
    } else {
        console.log("✅ All users are already assigned to a farm.");
    }

    client.release();
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await pool.end();
  }
}

fixAllUsers();
