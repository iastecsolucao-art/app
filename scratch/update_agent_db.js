const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`
  ALTER TABLE agent_config 
  ADD COLUMN IF NOT EXISTS model_name TEXT NOT NULL DEFAULT 'gemini-1.5-flash';
`)
  .then(() => console.log('Coluna model_name adicionada com sucesso!'))
  .catch(e => console.error('Erro ao alterar tabela:', e.message))
  .finally(() => pool.end());
