import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  if (req.method === "POST") {
    const client = await pool.connect();
    try {
      const { fornecedor, numero_nf, usuario, status, itens } = req.body;

      await client.query("BEGIN");

      // Inserir compra (usa agora 'compras')
      const insertCompra = await client.query(
        `INSERT INTO compras (fornecedor, data_compra, numero_nf, usuario, status)
         VALUES ($1, NOW(), $2, $3, $4)
         RETURNING id`,
        [fornecedor, numero_nf || null, usuario || null, status || "pendente"]
      );

      const compraId = insertCompra.rows[0].id;

      // Inserir itens na tabela compras_itens
      for (const item of itens) {
        await client.query(
          `INSERT INTO compras_itens (compra_id, codigo, descricao, quantidade, preco, total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            compraId,
            item.codigo,
            item.descricao,
            item.qtd,
            item.preco,
            item.total,
          ]
        );
      }

      await client.query("COMMIT");

      res.status(201).json({
        message: "Compra salva com sucesso!",
        id: compraId,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Erro ao salvar compra:", err);
      res.status(500).json({ error: "Erro ao salvar compra" });
    } finally {
      client.release();
    }
  }

  else if (req.method === "GET") {
    try {
      // lista simplificada
      const result = await pool.query(
        `SELECT id, fornecedor, data_compra, numero_nf, usuario, status 
         FROM compras ORDER BY id DESC`
      );
      res.status(200).json(result.rows);
    } catch (err) {
      console.error("Erro ao listar compras:", err);
      res.status(500).json({ error: "Erro ao listar compras" });
    }
  }

  else {
    res.status(405).json({ error: "Método não permitido" });
  }
}