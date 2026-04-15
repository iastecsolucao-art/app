const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getCols() {
  try {
    const pRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'produto'");
    const cRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'clientes'");
    console.log('Produto:', pRes.rows.map(r => r.column_name).join(', '));
    console.log('Clientes:', cRes.rows.map(r => r.column_name).join(', '));
  } catch(e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
getCols();
