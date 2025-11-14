// pages/api/calendario/calendario_loja/index.js
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

export default async function handler(req, res) {
  const { method, query, body } = req;

  try {
    if (method === "GET") {
      const { ano, semana, loja } = query;

      const filtros = [];
      const valores = [];

      if (ano) {
        valores.push(parseInt(ano, 10));
        filtros.push(`ano = $${valores.length}`);
      }
      if (semana) {
        valores.push(parseInt(semana, 10));
        filtros.push(`semana = $${valores.length}`);
      }
      if (loja) {
        valores.push(`%${loja}%`);
        filtros.push(`loja ILIKE $${valores.length}`);
      }

      const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

      const queryText = `
        SELECT id, ano, semana, loja,
               meta, qtd_vendedor, cota, abaixo, super_cota, cota_ouro,
               obs, created_at, updated_at
        FROM calendario_loja
        ${where}
        ORDER BY ano DESC, semana DESC, loja ASC
      `;

      const result = await pool.query(queryText, valores);
      return res.status(200).json(result.rows);
    }

    if (method === "POST" || method === "PUT") {
      const {
        id,
        ano,
        semana,
        loja,
        meta,
        qtd_vendedor,
        cota,
        abaixo,
        super_cota,
        cota_ouro,
        obs,
      } = body;

      const vals = {
        ano: parseInt(ano, 10),
        semana: parseInt(semana, 10),
        loja,
        meta: meta === null || meta === "" ? null : parseFloat(meta),
        qtd_vendedor:
          qtd_vendedor === null || qtd_vendedor === ""
            ? null
            : parseInt(qtd_vendedor, 10),
        cota: cota === null || cota === "" ? null : parseFloat(cota),
        abaixo:
          abaixo === null || abaixo === "" ? null : parseFloat(abaixo),
        super_cota:
          super_cota === null || super_cota === ""
            ? null
            : parseFloat(super_cota),
        cota_ouro:
          cota_ouro === null || cota_ouro === ""
            ? null
            : parseFloat(cota_ouro),
        obs: obs ?? null,
      };

      if (method === "POST") {
        const insertQuery = `
          INSERT INTO calendario_loja
            (ano, semana, loja, meta, qtd_vendedor,
             cota, abaixo, super_cota, cota_ouro, obs)
          VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          RETURNING *;
        `;
        const values = [
          vals.ano,
          vals.semana,
          vals.loja,
          vals.meta,
          vals.qtd_vendedor,
          vals.cota,
          vals.abaixo,
          vals.super_cota,
          vals.cota_ouro,
          vals.obs,
        ];
        const result = await pool.query(insertQuery, values);
        return res.status(201).json(result.rows[0]);
      }

      if (method === "PUT") {
        if (!id)
          return res
            .status(400)
            .json({ error: "ID é obrigatório para atualizar" });

        const updateQuery = `
          UPDATE calendario_loja SET
            ano = $1,
            semana = $2,
            loja = $3,
            meta = $4,
            qtd_vendedor = $5,
            cota = $6,
            abaixo = $7,
            super_cota = $8,
            cota_ouro = $9,
            obs = $10,
            updated_at = NOW()
          WHERE id = $11
          RETURNING *;
        `;
        const values = [
          vals.ano,
          vals.semana,
          vals.loja,
          vals.meta,
          vals.qtd_vendedor,
          vals.cota,
          vals.abaixo,
          vals.super_cota,
          vals.cota_ouro,
          vals.obs,
          id,
        ];
        const result = await pool.query(updateQuery, values);
        return res.status(200).json(result.rows[0]);
      }
    }

    if (method === "DELETE") {
      const id = parseInt(query.id, 10);
      if (!id)
        return res
          .status(400)
          .json({ error: "ID é obrigatório para deletar" });

      await pool.query("DELETE FROM calendario_loja WHERE id=$1", [id]);
      return res.status(204).end();
    }

    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    return res.status(405).end(`Método ${method} não permitido`);
  } catch (error) {
    console.error("Erro API calendario_loja:", error);
    return res
      .status(500)
      .json({ error: "Erro interno do servidor", details: error.message });
  }
}
