import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const client = await pool.connect();
  try {
    if (req.method === "GET") {
      const { group } = req.query;

      // 🔹 Agrupado por loja
      if (group === "loja") {
        const result = await client.query(
          `SELECT loja, 
                  COUNT(*) as total_registros,
                  SUM(quantidade) as quantidade_total
           FROM contagem_finalizada
           GROUP BY loja
           ORDER BY loja`
        );
        return res.status(200).json(result.rows);
      }

      // 🔹 Agrupado por setor
      if (group === "setor") {
        const result = await client.query(
          `SELECT setor, 
                  COUNT(*) as total_registros,
                  SUM(quantidade) as quantidade_total
           FROM contagem_finalizada
           GROUP BY setor
           ORDER BY setor`
        );
        return res.status(200).json(result.rows);
      }

      // 🔹 Agrupado por loja + setor
      if (group === "loja_setor") {
        const result = await client.query(
          `SELECT loja, setor,
                  COUNT(*) as total_registros,
                  SUM(quantidade) as quantidade_total
           FROM contagem_finalizada
           GROUP BY loja, setor
           ORDER BY loja, setor`
        );
        return res.status(200).json(result.rows);
      }

      // 🔹 Padrão → detalhado
      const result = await client.query(
        `SELECT id, loja, setor, usuario_email as, finalizado_em, quantidade, nome
         FROM contagem_finalizada
         ORDER BY finalizado_em DESC`
      );
      return res.status(200).json(result.rows);
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (err) {
    console.error("Erro api/contagem_finalizada:", err);
    res.status(500).json({ error: "Erro consultando contagens" });
  } finally {
    client.release();
  }
}