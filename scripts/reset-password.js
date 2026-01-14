const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
// REMEMBER: Paste your real connection string below!
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_hdSG9s0AcyKv@ep-purple-boat-ahboxytm-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });

async function run() {
  const email = 'floowdis@gmail.com'; // The email to reset
  const newPassword = 'password!'; // The new password

  const hash = await bcrypt.hash(newPassword, 10);
  
  await pool.query(
    "UPDATE users SET password = $1 WHERE email = $2",
    [hash, email]
  );
  
  console.log(`Password for ${email} has been reset to: ${newPassword}`);
  pool.end();
}
run();
