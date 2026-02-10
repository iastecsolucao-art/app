// pages/api/calendario/calendario_loja/datas.js
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

/**
 * GET  -> ?ano=2026
 *   Retorna { datasCadastradas: ["2026-01-01", ...] }
 *
 * PUT  -> body { ano: 2026, data: "2026-01-03", meta?: any }
 *   Cadastra a data (se não existir) e retorna { message }
 *
 * DELETE -> ?ano=2026&data=2026-01-03
 *   Remove a data e retorna { message }
 */
export default async function handler(req, res) {
  const { method, query, body } = req;

  try {
    // ----------------------------
    // GET: listar datas do ano
    // ----------------------------
    if (method === "GET") {
      const { ano } = query;

      if (!ano) return res.status(400).json({ error: "Parâmetro 'ano' é obrigatório" });

      const anoInt = parseInt(ano, 10);
      if (Number.isNaN(anoInt)) return res.status(400).json({ error: "Ano inválido" });

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

    // ----------------------------
    // PUT: cadastrar data
    // ----------------------------
    if (method === "PUT") {
      const { ano, data, meta = null } = body || {};

      if (!ano) return res.status(400).json({ error: "Campo 'ano' é obrigatório" });
      if (!data) return res.status(400).json({ error: "Campo 'data' é obrigatório" });

      const anoInt = parseInt(ano, 10);
      if (Number.isNaN(anoInt)) return res.status(400).json({ error: "Ano inválido" });

      // valida formato básico YYYY-MM-DD
      if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return res.status(400).json({ error: "Data inválida. Use YYYY-MM-DD" });
      }

      // Se quiser garantir que a data pertence ao ano informado:
      if (parseInt(data.slice(0, 4), 10) !== anoInt) {
        return res.status(400).json({ error: "A 'data' não pertence ao 'ano' informado" });
      }

      // Calcula semana ISO direto no Postgres e insere se ainda não existir
      // Evita duplicar: NOT EXISTS
      await pool.query(
        `
          INSERT INTO calendario (ano, semana, data, meta)
          SELECT
            $1::int AS ano,
            EXTRACT(ISOWEEK FROM $2::date)::int AS semana,
            $2::date AS data,
            $3::jsonb AS meta
          WHERE NOT EXISTS (
            SELECT 1
            FROM calendario
            WHERE ano = $1::int
              AND data::date = $2::date
          )
        `,
        [anoInt, data, meta]
      );

      return res.status(200).json({ message: `Data ${data} cadastrada (ou já existia).` });
    }

    // ----------------------------
    // DELETE: remover data
    // ----------------------------
    if (method === "DELETE") {
      const { ano, data } = query;

      if (!ano) return res.status(400).json({ error: "Parâmetro 'ano' é obrigatório" });
      if (!data) return res.status(400).json({ error: "Parâmetro 'data' é obrigatório" });

      const anoInt = parseInt(ano, 10);
      if (Number.isNaN(anoInt)) return res.status(400).json({ error: "Ano inválido" });

      if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return res.status(400).json({ error: "Data inválida. Use YYYY-MM-DD" });
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
            ? `Data ${data} removida.`
            : `Data ${data} não existia.`,
      });
    }

    // ----------------------------
    // Método não permitido
    // ----------------------------
    res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
    return res.status(405).json({ error: `Método ${method} não permitido` });
  } catch (error) {
    console.error("Erro API calendario_loja/datas:", error);
    return res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
}
