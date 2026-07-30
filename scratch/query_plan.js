const { Client } = require('pg');
const DB = 'postgresql://neondb_owner:npg_ShNT20JigrOY@ep-nameless-wave-adf8hxr7.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const client = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();

  const planos = await client.query('SELECT * FROM saas_planos');
  console.log('Planos:');
  console.table(planos.rows);

  const users = await client.query(`SELECT id, email, role, empresa_id FROM usuarios WHERE name='junior' OR email LIKE '%junior%' OR email='junior'`);
  console.log('Users junior:');
  console.table(users.rows);

  const users2 = await client.query(`SELECT id, email, role, empresa_id FROM usuarios LIMIT 5`);
  console.log('Some Users:');
  console.table(users2.rows);

  await client.end();
}

main().catch(console.error);
