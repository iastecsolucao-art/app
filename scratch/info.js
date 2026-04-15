const { Pool } = require('pg');
const pool = new Pool();
pool.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('usuarios', 'empresa')")
  .then(res => console.table(res.rows))
  .catch(console.error)
  .finally(() => pool.end());
