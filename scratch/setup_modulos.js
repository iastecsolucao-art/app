const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const defaultModulos = [
  "dashboard", "inventario", "produtos", 
  "compras", "comercial", "servicos", 
  "buckman", "relatorios", "clientes", "pedidos", "integracoes"
];

async function run() {
  const client = await pool.connect();
  try {
    console.log("Criando tabela saas_modulos...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS saas_modulos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(50) UNIQUE NOT NULL
      );
    `);

    // Inserir predefinidos ignorando conflitos
    for (const mod of defaultModulos) {
        await client.query(`
            INSERT INTO saas_modulos (nome)
            VALUES ($1)
            ON CONFLICT (nome) DO NOTHING;
        `, [mod]);
    }
    console.log("Sucesso: Modulos Pai criados!");
  } catch (err) {
    console.error("Erro:", err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
