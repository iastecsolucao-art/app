const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getModulos() {
  try {
    const res = await pool.query("SELECT DISTINCT modulo FROM saas_menu_links");
    console.log(res.rows);
  } catch(e) { console.error(e); } finally { await pool.end(); }
}
getModulos();
