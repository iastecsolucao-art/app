const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_zCKjPq83kbxR@ep-withered-bread-adce0zuv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position;
    `);
    
    let currentTable = '';
    for (const row of res.rows) {
      if (row.table_name !== currentTable) {
        currentTable = row.table_name;
        console.log(`\nTable: ${currentTable}`);
      }
      console.log(`  ${row.column_name}: ${row.data_type}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
