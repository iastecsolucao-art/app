const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  try {
    const res = await pool.query(`UPDATE agent_config SET model_name = 'gemini-flash-latest';`);
    console.log(`✅ Sucesso! ${res.rowCount} registros atualizados para gemini-flash-latest.`);
  } catch (err) {
    console.error('❌ Erro na migração:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
