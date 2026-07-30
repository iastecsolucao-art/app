const { Client } = require('../node_modules/pg');
const DB = 'postgresql://neondb_owner:npg_ShNT20JigrOY@ep-nameless-wave-adf8hxr7.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const client = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });

client.connect().then(async () => {
  const res = await client.query("SELECT pg_get_viewdef('view_vendas_liquida');");
  console.log(res.rows[0].pg_get_viewdef);
}).catch(console.error).finally(() => client.end());
