
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const client = await pool.connect();
  try {
    console.log("Criando tabela saas_planos...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS saas_planos (
        nome VARCHAR(50) PRIMARY KEY,
        preco DECIMAL(10, 2) NOT NULL,
        descricao TEXT,
        menus_permitidos JSONB NOT NULL DEFAULT '[]',
        max_usuarios INTEGER NOT NULL DEFAULT 2
      );
    `);

    console.log("Inserindo planos...");
    const upsertPlano = async (nome, preco, desc, menus, max) => {
      await client.query(`
        INSERT INTO saas_planos (nome, preco, descricao, menus_permitidos, max_usuarios)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (nome) DO UPDATE SET
          preco = EXCLUDED.preco,
          descricao = EXCLUDED.descricao,
          menus_permitidos = EXCLUDED.menus_permitidos,
          max_usuarios = EXCLUDED.max_usuarios;
      `, [nome, preco, desc, JSON.stringify(menus), max]);
    };

    await upsertPlano(
      'Bronze', 49.90, 'Plano ideal para pequenos estoques.',
      ["dashboard", "produtos", "clientes", "pedidos"], 2
    );
    
    await upsertPlano(
      'Prata', 99.90, 'Completo para lojistas experientes.',
      ["dashboard", "produtos", "clientes", "pedidos", "relatorios"], 5
    );
    
    await upsertPlano(
      'Ouro', 149.90, 'Todas as funcionalidades e máxima performance.',
      ["dashboard", "produtos", "clientes", "pedidos", "relatorios", "compras", "integracoes"], 10
    );

    console.log("Planos configurados com sucesso no BD.");
  } catch (err) {
    console.error("Erro:", err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
