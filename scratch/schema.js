const { Pool } = require('pg');
const pool = new Pool({ connectionString: "postgresql://neondb_owner:npg_zCKjPq83kbxR@ep-withered-bread-adce0zuv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" });
(async () => {
  const result = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='usuarios'");
  console.log(result.rows.map(r => r.column_name));
  await pool.end();
})();
