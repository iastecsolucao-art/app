const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS home_shortcuts JSONB DEFAULT NULL")
  .then(() => console.log('Coluna home_shortcuts adicionada!'))
  .catch(e => console.error('Erro:', e.message))
  .finally(() => pool.end());
