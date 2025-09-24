import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const client = await pool.connect();
  try {
    if (req.method === "POST") {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: "Informe o id da compra" });

      await client.query("BEGIN");

      // Pega itens da compra
      const itensResult = await client.query(
        `SELECT * FROM compras_itens WHERE compra_id=$1`,
        [id]
      );
      const itens = itensResult.rows;

      if (!itens.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Nenhum item encontrado para a compra" });
      }

      // Insere movimentos de entrada
      for (const item of itens) {
        await client.query(
          `INSERT INTO estoque_movimento (codigo, quantidade, tipo, referencia)
           VALUES ($1,$2,'entrada',$3)`,
          [item.codigo, item.quantidade, `compra ${id}`]
        );
      }

      // Atualiza status da compra
      await client.query(
        `UPDATE compras SET status='concluida' WHERE id=$1`,
        [id]
      );

      await client.query("COMMIT");

      return res.status(200).json({ message: "Entrada gerada e estoque atualizado!" });
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro em /api/gerar_entrada:", err);
    res.status(500).json({ error: "Erro gerando entrada" });
  } finally {
    client.release();
  }
}