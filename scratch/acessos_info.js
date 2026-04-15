const { Pool } = require('pg');
const pool = new Pool();
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'acessos_usuario'")
  .then(res => console.table(res.rows))
  .catch(console.error)
  .finally(() => pool.end());
