import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  if (req.method === "POST") {
    const client = await pool.connect();
    try {
      const { compraId } = req.body;

      await client.query("BEGIN");

      const itens = await client.query("SELECT * FROM compra_itens WHERE compra_id = $1", [compraId]);

      for (const item of itens.rows) {
        await client.query(
          "UPDATE produto SET qtd = COALESCE(qtd,0) + $1 WHERE codigo_barra = $2",
          [item.qtd, item.codigo_barra]
        );
      }

      await client.query("COMMIT");
      res.status(200).json({ message: "📦 Estoque atualizado com sucesso!" });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(err);
      res.status(500).json({ error: "Erro ao gerar entrada de estoque" });
    } finally {
      client.release();
    }
  } else {
    res.status(405).json({ error: "Método não permitido" });
  }
}