# 🚜 Farm Dashboard - Admin Scripts Guide

This folder contains utility scripts for managing the Farm Management Dashboard backend.
These scripts connect directly to your Neon PostgreSQL database.

## 📋 Prerequisites
Before running any script, ensure you have dependencies installed:
```bash
npm install

1. Provisioning a New Client (SaaS)
Use this script when you sell the software to a new farm. It creates a completely isolated workspace for them.

Command:node scripts/create-farm.js

What it does:

Asks for the Farm Name (e.g., "Sunrise Organics").

Asks for the Admin Email for the client.

Asks for a Password.

Creates a new farm_id in the database.

Creates the user account linked strictly to that farm_id.

Output:
It prints the login credentials you can email to your client.

2. Resetting the "Main" Admin
Use this if you get locked out of your own main admin account or need to reset the default environment.

Command:node scripts/create-admin.js

What it does:

Ensures the database users table has the role column.

Creates or updates the user floowdis@gmail.com.

Sets the password to 123.

Sets the role to Admin.


3. Database Wipe (Danger ⚠️)
Script: scripts/reset-all.js (If you created it)

Command:node scripts/reset-all.js

What it does:

WARNING: This deletes ALL users and resets the users table.

It recreates a single default admin.

Use only for development or hard resets.

🛠️ Troubleshooting
"DATABASE_URL not found": Ensure your .env.local file exists in the project root and contains your Neon DB connection string.

"Connection Refused": Check your internet connection. Neon requires an active internet connection.
