import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const client = await pool.connect();
  try {
    if (req.method === "GET") {
      const { ids, group } = req.query;
      if (!ids) return res.status(400).send("Informe id(s) ou nome(s)");

      let rows = [];

      // 🔹 Agrupado por loja
      if (group === "loja") {
        const lojas = ids.split(",");
        const result = await client.query(
          `SELECT codigo, SUM(quantidade) as quantidade
           FROM contagem_finalizada
           WHERE loja = ANY($1::text[])
           GROUP BY codigo
           ORDER BY codigo`,
          [lojas]
        );
        rows = result.rows;
      }

      // 🔹 Agrupado por setor
      else if (group === "setor") {
        const setores = ids.split(",");
        const result = await client.query(
          `SELECT codigo, SUM(quantidade) as quantidade
           FROM contagem_finalizada
           WHERE setor = ANY($1::text[])
           GROUP BY codigo
           ORDER BY codigo`,
          [setores]
        );
        rows = result.rows;
      }

      // 🔹 Agrupado por loja + setor
      else if (group === "loja_setor") {
        const pares = ids.split(","); // ["loja|setor", ...]
        const condicoes = pares
          .map((_, idx) => `(loja = $${idx * 2 + 1} AND setor = $${idx * 2 + 2})`)
          .join(" OR ");

        const valores = [];
        pares.forEach((p) => {
          const [loja, setor] = p.split("|");
          valores.push(loja, setor);
        });

        const result = await client.query(
          `SELECT codigo, SUM(quantidade) as quantidade
           FROM contagem_finalizada
           WHERE ${condicoes}
           GROUP BY codigo
           ORDER BY codigo`,
          valores
        );
        rows = result.rows;
      }

      // 🔹 Detalhado (por id)
      else {
        const lista = ids.split(",").map((x) => parseInt(x));
        const result = await client.query(
          `SELECT codigo, quantidade 
           FROM contagem_finalizada 
           WHERE id = ANY($1::int[])
           ORDER BY id`,
          [lista]
        );
        rows = result.rows;
      }

      if (!rows.length) return res.status(404).send("Nenhum dado encontrado");

      // 📄 TXT no formato codigo,quantidade
      const txt = rows.map((c) => `${c.codigo},${c.quantidade}`).join("\n");

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(200).send(txt);
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (err) {
    console.error("Erro exportar:", err);
    res.status(500).json({ error: "Erro exportando" });
  } finally {
    client.release();
  }
}