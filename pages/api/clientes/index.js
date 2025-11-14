// pages/api/calendario/calendario_loja/index.js
import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]"; // <-- caminho relativo a partir daqui

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Não autenticado" });

  const client = await pool.connect();

  try {
    // (se um dia você adicionar empresa_id na tabela, pode buscar igual no clientes)
    // const userRes = await client.query(
    //   "SELECT empresa_id FROM usuarios WHERE email=$1",
    //   [session.user.email]
    // );
    // if (!userRes.rows.length) return res.status(400).json({ error: "Usuário não encontrado" });
    // const { empresa_id } = userRes.rows[0];

    if (req.method === "GET") {
      const { ano, semana, loja } = req.query;
      const filtros = [];
      const valores = [];

      if (ano) {
        valores.push(ano);
        filtros.push(`ano = $${valores.length}`);
      }
      if (semana) {
        valores.push(semana);
        filtros.push(`semana = $${valores.length}`);
      }
      if (loja) {
        valores.push(loja);
        filtros.push(`loja = $${valores.length}`);
      }

      const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

      const query = `
        SELECT id, ano, semana, loja, meta, obs,
               qtd_vendedor, cota, abaixo, super_cota, cota_ouro
        FROM calendario_loja
        ${where}
        ORDER BY ano DESC, semana DESC, loja ASC
      `;

      const { rows } = await client.query(query, valores);
      return res.status(200).json(rows);
    }

    if (req.method === "POST") {
      const {
        ano,
        semana,
        loja,
        meta,
        obs,
        qtd_vendedor,
        cota,
        abaixo,
        super_cota,
        cota_ouro,
      } = req.body;

      const query = `
        INSERT INTO calendario_loja
          (ano, semana, loja, meta, obs, qtd_vendedor,
           cota, abaixo, super_cota, cota_ouro)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *;
      `;

      const values = [
        ano,
        semana,
        loja,
        meta ?? null,
        obs ?? null,
        qtd_vendedor ?? null,
        cota ?? null,
        abaixo ?? null,
        super_cota ?? null,
        cota_ouro ?? null,
      ];

      const result = await client.query(query, values);
      return res.status(201).json(result.rows[0]);
    }

    if (req.method === "PUT") {
      const {
        id,
        ano,
        semana,
        loja,
        meta,
        obs,
        qtd_vendedor,
        cota,
        abaixo,
        super_cota,
        cota_ouro,
      } = req.body;

      if (!id) {
        return res.status(400).json({ error: "ID é obrigatório" });
      }

      const query = `
        UPDATE calendario_loja
        SET ano = $1,
            semana = $2,
            loja = $3,
            meta = $4,
            obs = $5,
            qtd_vendedor = $6,
            cota = $7,
            abaixo = $8,
            super_cota = $9,
            cota_ouro = $10,
            updated_at = NOW()
        WHERE id = $11
        RETURNING *;
      `;

      const values = [
        ano,
        semana,
        loja,
        meta ?? null,
        obs ?? null,
        qtd_vendedor ?? null,
        cota ?? null,
        abaixo ?? null,
        super_cota ?? null,
        cota_ouro ?? null,
        id,
      ];

      const result = await client.query(query, values);

      if (!result.rowCount) {
        return res.status(404).json({ error: "Registro não encontrado" });
      }

      return res.status(200).json(result.rows[0]);
    }

    if (req.method === "DELETE") {
      const { id } = req.body; // igual clientes (vem no body)
      if (!id) return res.status(400).json({ error: "ID é obrigatório" });

      await client.query("DELETE FROM calendario_loja WHERE id=$1", [id]);
      return res.status(200).json({ message: "Registro excluído" });
    }

    return res.status(405).json({ error: "Método não suportado" });
  } catch (err) {
    console.error("Erro API calendario_loja:", err);
    return res
      .status(500)
      .json({ error: "Erro interno", details: err.message });
  } finally {
    client.release();
  }
}
