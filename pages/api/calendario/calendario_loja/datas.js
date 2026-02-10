import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

// valida YYYY-MM-DD
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function handler(req, res) {
  const { method, query, body } = req;

  try {
    // -----------------------
    // GET: listar datas (opcional filtro por mês)
    // -----------------------
    if (method === "GET") {
      const { ano, mes } = query;

      if (!ano) return res.status(400).json({ error: "Parâmetro 'ano' é obrigatório" });

      const anoInt = parseInt(ano, 10);
      if (Number.isNaN(anoInt)) return res.status(400).json({ error: "Ano inválido" });

      let mesInt = null;
      if (mes !== undefined) {
        mesInt = parseInt(mes, 10);
        if (Number.isNaN(mesInt) || mesInt < 1 || mesInt > 12) {
          return res.status(400).json({ error: "Mês inválido (1-12)" });
        }
      }

      const sql = mesInt
        ? `
            SELECT DISTINCT data::date AS data
            FROM calendario
            WHERE ano = $1
              AND EXTRACT(MONTH FROM data::date) = $2
            ORDER BY data
          `
        : `
            SELECT DISTINCT data::date AS data
            FROM calendario
            WHERE ano = $1
            ORDER BY data
          `;

      const params = mesInt ? [anoInt, mesInt] : [anoInt];
      const result = await pool.query(sql, params);

      const datasCadastradas = result.rows.map((r) => r.data.toISOString().slice(0, 10));
      return res.status(200).json({ datasCadastradas });
    }

    // -----------------------
    // PUT: cadastrar/atualizar data
    // -----------------------
    if (method === "PUT") {
      const { ano, data, meta } = body || {};

      if (!ano || !data) {
        return res.status(400).json({ error: "Campos 'ano' e 'data' são obrigatórios" });
      }

      const anoInt = parseInt(ano, 10);
      if (Number.isNaN(anoInt)) return res.status(400).json({ error: "Ano inválido" });

      if (typeof data !== "string" || !ISO_DATE_RE.test(data)) {
        return res.status(400).json({ error: "Data inválida (YYYY-MM-DD)" });
      }

      if (parseInt(data.slice(0, 4), 10) !== anoInt) {
        return res.status(400).json({ error: "A 'data' não pertence ao 'ano' informado" });
      }

      // meta é NUMERIC(10,2)
      let metaNum = null;
      if (meta !== undefined && meta !== null && meta !== "") {
        const parsed = Number(meta);
        if (Number.isNaN(parsed)) {
          return res.status(400).json({ error: "Campo 'meta' deve ser numérico" });
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

      return res.status(200).json({ message: `Data ${data} cadastrada/atualizada com sucesso` });
    }

    // -----------------------
    // PATCH: mover cadastro de uma data para outra
    // Ex.: { ano: 2026, from: "2026-01-26", to: "2026-02-02" }
    // (leva a meta junto, se existir)
    // -----------------------
    if (method === "PATCH") {
      const { ano, from, to } = body || {};

      if (!ano || !from || !to) {
        return res.status(400).json({ error: "Campos 'ano', 'from' e 'to' são obrigatórios" });
      }

      const anoInt = parseInt(ano, 10);
      if (Number.isNaN(anoInt)) return res.status(400).json({ error: "Ano inválido" });

      if (typeof from !== "string" || !ISO_DATE_RE.test(from)) {
        return res.status(400).json({ error: "Campo 'from' inválido (YYYY-MM-DD)" });
      }
      if (typeof to !== "string" || !ISO_DATE_RE.test(to)) {
        return res.status(400).json({ error: "Campo 'to' inválido (YYYY-MM-DD)" });
      }

      // opcional: garantir ano
      if (parseInt(from.slice(0, 4), 10) !== anoInt || parseInt(to.slice(0, 4), 10) !== anoInt) {
        return res.status(400).json({ error: "As datas 'from' e 'to' devem pertencer ao 'ano' informado" });
      }

      await pool.query("BEGIN");

      try {
        // pega meta da data antiga (se existir)
        const metaRes = await pool.query(
          `SELECT meta FROM calendario WHERE ano = $1 AND data::date = $2::date LIMIT 1`,
          [anoInt, from]
        );
        const metaOld = metaRes.rows[0]?.meta ?? null;

        // remove a antiga (se existir)
        await pool.query(
          `
            DELETE FROM calendario
            WHERE ano = $1
              AND data::date = $2::date
          `,
          [anoInt, from]
        );

        // insere a nova (semana ISO pelo 'IW')
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
          [anoInt, to, metaOld]
        );

        await pool.query("COMMIT");
        return res.status(200).json({ message: `Movido de ${from} para ${to}` });
      } catch (e) {
        await pool.query("ROLLBACK");
        return res.status(500).json({ error: "Erro interno do servidor", details: e.message });
      }
    }

    // -----------------------
    // DELETE: remover data
    // -----------------------
    if (method === "DELETE") {
      const { ano, data } = query;

      if (!ano || !data) {
        return res.status(400).json({ error: "Parâmetros 'ano' e 'data' são obrigatórios" });
      }

      const anoInt = parseInt(ano, 10);
      if (Number.isNaN(anoInt)) return res.status(400).json({ error: "Ano inválido" });

      if (typeof data !== "string" || !ISO_DATE_RE.test(data)) {
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
        message: result.rowCount > 0 ? `Data ${data} removida com sucesso` : `Data ${data} não existia`,
      });
    }

    res.setHeader("Allow", ["GET", "PUT", "PATCH", "DELETE"]);
    return res.status(405).json({ error: `Método ${method} não permitido` });
  } catch (error) {
    console.error("Erro API calendario_loja/datas:", error);
    return res.status(500).json({ error: "Erro interno do servidor", details: error.message });
  }
}
