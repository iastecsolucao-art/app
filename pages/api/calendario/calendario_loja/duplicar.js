// pages/api/calendario/calendario_loja/duplicar.js
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const client = await pool.connect();

  try {
    const { origem_loja, destino_loja, ano, semana } = req.body;

    if (!origem_loja || !destino_loja || !ano || !semana) {
      return res
        .status(400)
        .json({
          error: "origem_loja, destino_loja, ano e semana são obrigatórios",
        });
    }

    await client.query("BEGIN");

    const selectQuery = `
      SELECT ano, semana, loja, meta, obs, qtd_vendedor,
             cota, abaixo, super_cota, cota_ouro
      FROM public.calendario_loja
      WHERE loja = $1 AND ano = $2 AND semana = $3
    `;

    const source = await client.query(selectQuery, [
      origem_loja,
      ano,
      semana,
    ]);

    if (!source.rowCount) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ error: "Nenhum registro para copiar da loja de origem" });
    }

    const insertQuery = `
      INSERT INTO public.calendario_loja
        (ano, semana, loja, meta, obs, qtd_vendedor,
         cota, abaixo, super_cota, cota_ouro)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `;

    for (const row of source.rows) {
      await client.query(insertQuery, [
        ano,
        semana,
        destino_loja,
        row.meta,
        row.obs,
        row.qtd_vendedor,
        row.cota,
        row.abaixo,
        row.super_cota,
        row.cota_ouro,
      ]);
    }

    await client.query("COMMIT");
    return res.status(200).json({ message: "Registros duplicados com sucesso." });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    return res.status(500).json({ error: "Erro ao duplicar registros" });
  } finally {
    client.release();
  }
}
