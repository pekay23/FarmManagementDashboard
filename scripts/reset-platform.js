const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL not found.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const SUPER_ADMIN_EMAIL = 'admin@hughesfarms.com'; // Change if your email is different

async function resetPlatform() {
  const client = await pool.connect();
  try {
    console.log("🔥 STARTING PLATFORM RESET...");
    console.log(`⚠️  This will delete ALL data except for ${SUPER_ADMIN_EMAIL}`);
    console.log("Waiting 5 seconds... Press Ctrl+C to cancel.");
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    await client.query('BEGIN');

    // 1. Delete all farm-related data (Cascade handles most, but let's be explicit for safety)
    console.log("🗑️  Deleting Crops...");
    await client.query('DELETE FROM crops');
    await client.query('DELETE FROM crop_treatments');

    console.log("🗑️  Deleting Livestock...");
    await client.query('DELETE FROM livestock');
    await client.query('DELETE FROM livestock_vaccinations');
    await client.query('DELETE FROM livestock_treatments');
    await client.query('DELETE FROM livestock_weight_logs');

    console.log("🗑️  Deleting Inventory & Sales...");
    await client.query('DELETE FROM inventory');
    await client.query('DELETE FROM sales');
    await client.query('DELETE FROM sale_items');
    await client.query('DELETE FROM expenses');

    console.log("🗑️  Deleting Tasks & Employees...");
    await client.query('DELETE FROM tasks');
    await client.query('DELETE FROM task_assignments');
    await client.query('DELETE FROM employees');

    // 2. Delete all users EXCEPT the Super Admin
    console.log("👤 Deleting Users...");
    await client.query("DELETE FROM users WHERE email != $1", [SUPER_ADMIN_EMAIL]);

    // 3. Delete all Farms (except Default if you want to keep it, but usually we wipe them)
    // Note: Users are linked to farms, so we must delete users first (done above).
    console.log("🚜 Deleting Farms...");
    // We keep the farm linked to the Super Admin if they have one, otherwise wipe all
    await client.query(`
        DELETE FROM farms 
        WHERE id NOT IN (
            SELECT farm_id FROM users WHERE email = $1 AND farm_id IS NOT NULL
        )
    `, [SUPER_ADMIN_EMAIL]);

    await client.query('COMMIT');
    console.log("\n✅ PLATFORM RESET COMPLETE.");
    console.log(`Only ${SUPER_ADMIN_EMAIL} remains.`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ ERROR:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

resetPlatform();
