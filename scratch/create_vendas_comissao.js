const { Client } = require('pg');
const DB = 'postgresql://neondb_owner:npg_ShNT20JigrOY@ep-nameless-wave-adf8hxr7.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const client = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });

client.connect().then(async () => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS vendas_comissao (
      id SERIAL PRIMARY KEY,
      invoice_uid VARCHAR(100) NOT NULL,
      invoice_sequence INTEGER NOT NULL,
      branch_code INTEGER,
      issue_date TIMESTAMP,
      dealer_code VARCHAR(50) NOT NULL,
      total_value NUMERIC(15,2) DEFAULT 0,
      quantity INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(invoice_uid, dealer_code)
    );
  `);
  console.log("Table vendas_comissao created successfully.");
}).catch(console.error).finally(() => client.end());
