import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

/**
 * GET    ?ano=2026
 * PUT    body { ano: 2026, data: "2026-01-08", meta?: number }
 * DELETE ?ano=2026&data=2026-01-08
 */
export default async function handler(req, res) {
  const { method, query, body } = req;

  try {
    // ======================================================
    // GET – listar datas cadastradas no ano
    // ======================================================
    if (method === "GET") {
      const { ano } = query;

      if (!ano) {
        return res.status(400).json({ error: "Parâmetro 'ano' é obrigatório" });
      }

      const anoInt = parseInt(ano, 10);
      if (Number.isNaN(anoInt)) {
        return res.status(400).json({ error: "Ano inválido" });
      }

      const result = await pool.query(
        `
          SELECT DISTINCT data::date AS data
          FROM calendario
          WHERE ano = $1
          ORDER BY data
        `,
        [anoInt]
      );

      const datasCadastradas = result.rows.map((r) =>
        r.data.toISOString().slice(0, 10)
      );

      return res.status(200).json({ datasCadastradas });
    }

    // ======================================================
    // PUT – cadastrar / atualizar data
    // ======================================================
    if (method === "PUT") {
      const { ano, data, meta } = body || {};

      if (!ano || !data) {
        return res
          .status(400)
          .json({ error: "Campos 'ano' e 'data' são obrigatórios" });
      }

      const anoInt = parseInt(ano, 10);
      if (Number.isNaN(anoInt)) {
        return res.status(400).json({ error: "Ano inválido" });
      }

      if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return res.status(400).json({ error: "Data inválida (YYYY-MM-DD)" });
      }

      // garante que a data pertence ao ano
      if (parseInt(data.slice(0, 4), 10) !== anoInt) {
        return res
          .status(400)
          .json({ error: "A data não pertence ao ano informado" });
      }

      // meta NUMERIC(10,2)
      let metaNum = null;
      if (meta !== undefined && meta !== null && meta !== "") {
        const parsed = Number(meta);
        if (Number.isNaN(parsed)) {
          return res
            .status(400)
            .json({ error: "Campo 'meta' deve ser numérico" });
        }
        metaNum = parsed;
      }

      await pool.query(
        `
          INSERT INTO calendario (ano, semana, data, meta)
          VALUES (
            $1::int,
            to_char($2::date, 'IW')::int,
            $2::date,
            $3::numeric
          )
          ON CONFLICT (ano, semana, data)
          DO UPDATE SET meta = EXCLUDED.meta
        `,
        [anoInt, data, metaNum]
      );

      return res.status(200).json({
        message: `Data ${data} cadastrada ou atualizada com sucesso`,
      });
    }

    // ======================================================
    // DELETE – remover data
    // ======================================================
    if (method === "DELETE") {
      const { ano, data } = query;

      if (!ano || !data) {
        return res
          .status(400)
          .json({ error: "Parâmetros 'ano' e 'data' são obrigatórios" });
      }

      const anoInt = parseInt(ano, 10);
      if (Number.isNaN(anoInt)) {
        return res.status(400).json({ error: "Ano inválido" });
      }

      if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return res.status(400).json({ error: "Data inválida (YYYY-MM-DD)" });
      }

      const result = await pool.query(
        `
          DELETE FROM calendario
          WHERE ano = $1
            AND data::date = $2::date
        `,
        [anoInt, data]
      );

      return res.status(200).json({
        message:
          result.rowCount > 0
            ? `Data ${data} removida com sucesso`
            : `Data ${data} não existia`,
      });
    }

    // ======================================================
    // Método não permitido
    // ======================================================
    res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
    return res
      .status(405)
      .json({ error: `Método ${method} não permitido` });
  } catch (error) {
    console.error("Erro API calendario_loja/datas:", error);
    return res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
}
