const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config(); // To load environment variables like DATABASE_URL

// Ensure you have a .env file with your DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const ADMIN_EMAIL = 'admin@farm.com';
const NEW_PASSWORD = 'password123'; // The new password for the admin account

async function resetDatabase() {
  const client = await pool.connect();
  console.log("Connected to the database...");

  try {
    await client.query('BEGIN');
    console.log("Transaction started.");

    // 1. Delete all users and related data (like task assignments)
    // TRUNCATE is faster than DELETE and RESTART IDENTITY resets the ID counter.
    // CASCADE removes any dependent records in other tables (e.g., task_assignments).
    console.log('Deleting all users and resetting table...');
    await client.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    console.log('✅ All users deleted.');

    // 2. Re-create the default admin user
    console.log(`Re-creating admin user '${ADMIN_EMAIL}'...`);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

    const insertQuery = `
      INSERT INTO users (email, password, role)
      VALUES ($1, $2, $3)
      RETURNING id, email, role;
    `;
    const result = await client.query(insertQuery, [ADMIN_EMAIL, hashedPassword, 'Admin']);
    
    await client.query('COMMIT');
    console.log("Transaction committed.");
    
    console.log('\n✅ Database reset successfully!');
    console.log('Default admin user created:');
    console.log(`   Email: ${result.rows[0].email}`);
    console.log(`   Password: ${NEW_PASSWORD}`);

  } catch (error) {
    console.error('❌ An error occurred. Rolling back changes...');
    console.error(error);
    await client.query('ROLLBACK');
  } finally {
    console.log("Releasing database connection.");
    client.release();
    await pool.end(); // Close all connections in the pool
  }
}

// Run the script
resetDatabase();
