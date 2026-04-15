const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_zCKjPq83kbxR@ep-withered-bread-adce0zuv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE empresa 
      ADD COLUMN IF NOT EXISTS plano character varying DEFAULT 'Bronze',
      ADD COLUMN IF NOT EXISTS assinatura_status character varying DEFAULT 'TRIAL',
      ADD COLUMN IF NOT EXISTS assinatura_validade timestamp without time zone,
      ADD COLUMN IF NOT EXISTS mp_preapproval_id character varying;
    `);
    console.log("Migration executed successfully!");
  } catch(err) {
    console.error("Migration error:", err);
  } finally {
    pool.end();
  }
}

migrate();
