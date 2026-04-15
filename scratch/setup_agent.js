const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`
  CREATE TABLE IF NOT EXISTS agent_config (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER,
    system_prompt TEXT NOT NULL DEFAULT 'Você é um assistente de gestão empresarial do sistema IasTec. Responda sempre em português, de forma direta e útil. Use as ferramentas disponíveis para buscar dados atualizados da empresa.',
    updated_at TIMESTAMP DEFAULT NOW()
  );
`)
  .then(() => console.log('Tabela agent_config criada!'))
  .catch(e => console.error('Erro:', e.message))
  .finally(() => pool.end());
