const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`
  CREATE TABLE IF NOT EXISTS saas_config (
    chave VARCHAR(100) PRIMARY KEY,
    valor JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
  );
  INSERT INTO saas_config (chave, valor)
  VALUES ('home_shortcuts_default', '["renovar","pedidos","dashboard","produtos"]')
  ON CONFLICT (chave) DO NOTHING;
`)
  .then(() => console.log('Tabela saas_config criada e seed inserido!'))
  .catch(e => console.error('Erro:', e.message))
  .finally(() => pool.end());
