const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const readline = require('readline');

// Load environment variables
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL not found.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createNewFarm() {
  try {
    console.log("\n🚜 --- NEW FARM PROVISIONING --- 🚜\n");

    // 1. Get Inputs
    const farmName = await question("Enter Farm Name (e.g. Green Valley): ");
    const adminEmail = await question("Enter Admin Email: ");
    const adminPass = await question("Enter Admin Password: ");

    if (!farmName || !adminEmail || !adminPass) {
        console.error("❌ All fields are required.");
        process.exit(1);
    }

    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // 2. Create Farm
        console.log(`\n🌱 Creating farm '${farmName}'...`);
        const farmRes = await client.query(
            "INSERT INTO farms (name) VALUES ($1) RETURNING id", 
            [farmName]
        );
        const farmId = farmRes.rows[0].id;
        console.log(`✅ Farm ID: ${farmId}`);

        // 3. Create Admin User
        console.log(`👤 Creating admin user '${adminEmail}'...`);
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(adminPass, salt);

        await client.query(
            "INSERT INTO users (email, password, role, farm_id) VALUES ($1, $2, 'Admin', $3)",
            [adminEmail.toLowerCase(), hash, farmId]
        );

        await client.query('COMMIT');

        console.log("\n🎉 SUCCESS! Client Provisioned.");
        console.log("------------------------------------------------");
        console.log(`Farm:     ${farmName}`);
        console.log(`URL:      https://your-dashboard-url.com`);
        console.log(`Email:    ${adminEmail}`);
        console.log(`Password: ${adminPass}`);
        console.log("------------------------------------------------\n");

    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') { // Unique violation
            console.error("❌ Error: That email is already registered.");
        } else {
            console.error("❌ Database Error:", err.message);
        }
    } finally {
        client.release();
    }

  } catch (e) {
      console.error("Script Error:", e);
  } finally {
      rl.close();
      await pool.end();
  }
}

createNewFarm();
