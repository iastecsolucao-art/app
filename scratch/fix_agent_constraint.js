const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`
  -- Primeiro removemos duplicatas se houverem (mantendo a mais recente)
  DELETE FROM agent_config a USING agent_config b
  WHERE a.id < b.id AND a.empresa_id = b.empresa_id;

  -- Adicionamos a restrição de UNICIDADE para o campo empresa_id
  -- para que o ON CONFLICT funcione corretamente
  ALTER TABLE agent_config 
  ADD CONSTRAINT agent_config_empresa_id_unique UNIQUE (empresa_id);
`)
  .then(() => console.log('Restrição UNIQUE(empresa_id) adicionada com sucesso!'))
  .catch(e => {
    if (e.message.includes('already exists')) {
      console.log('A restrição já existe.');
    } else {
      console.error('Erro ao alterar tabela:', e.message);
    }
  })
  .finally(() => pool.end());
