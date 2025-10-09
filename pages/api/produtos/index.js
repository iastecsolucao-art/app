import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]"; // ajuste o caminho se necessário

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// normaliza "1,99" -> 1.99
function normalizeMoney(v) {
  if (v === undefined || v === null || v === "") return 0;
  if (typeof v === "number") return v;
  const n = String(v).replace(/\./g, "").replace(",", ".").trim();
  const parsed = parseFloat(n);
  return isNaN(parsed) ? 0 : parsed;
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Não autenticado" });

  const empresa_id = session.user?.empresa_id;
  if (!empresa_id) return res.status(401).json({ error: "Empresa não informada" });

  const { method, query } = req;
  const client = await pool.connect();

  try {
    if (method === "GET") {
      const { q, onlyAtivos } = query;

      const params = [empresa_id];
      const conds = ["empresa_id = $1"];
      let p = 2;

      if (q) {
        conds.push(`(CAST(id AS TEXT) = $${p} OR codigo_barra = $${p + 1} OR LOWER(descricao) LIKE LOWER($${p + 2}))`);
        params.push(q, q, `%${q}%`);
        p += 3;
      }

      if (String(onlyAtivos).toLowerCase() === "true") {
        conds.push("ativo_loja = TRUE");
      }

      const sql = `
        SELECT id, codigo_barra, descricao, custo, preco, categoria,
               empresa_id, foto_url, ativo_loja, created_at
        FROM produto
        WHERE ${conds.join(" AND ")}
        ORDER BY id
      `;

      const result = await client.query(sql, params);
      return res.status(200).json(result.rows);
    }

    if (method === "POST") {
      const {
        codigo_barra,
        descricao,
        custo,
        preco,
        categoria,
        foto_url,
        ativo_loja,
      } = req.body || {};

      if (!codigo_barra || !descricao) {
        return res.status(400).json({ error: "Campos obrigatórios faltando" });
      }

      const insert = await client.query(
        `INSERT INTO produto
           (codigo_barra, descricao, custo,  preco,  categoria, empresa_id, foto_url, ativo_loja)
         VALUES
           ($1,           $2,        $3,     $4,     $5,       $6,         $7,       COALESCE($8, TRUE))
         RETURNING *`,
        [
          codigo_barra,
          descricao,
          normalizeMoney(custo),
          normalizeMoney(preco),
          categoria || null,
          empresa_id,
          foto_url || null,
          typeof ativo_loja === "boolean" ? ativo_loja : null,
        ]
      );

      return res.status(201).json(insert.rows[0]);
    }

    if (method === "PUT") {
      const {
        id,
        codigo_barra,
        descricao,
        custo,
        preco,
        categoria,
        foto_url,
        ativo_loja,
      } = req.body || {};

      if (!id || !codigo_barra || !descricao) {
        return res.status(400).json({ error: "Campos obrigatórios faltando" });
      }

      const update = await client.query(
        `UPDATE produto SET
            codigo_barra = $1,
            descricao    = $2,
            custo        = $3,
            preco        = $4,
            categoria    = $5,
            foto_url     = $6,
            ativo_loja   = COALESCE($7, ativo_loja)
         WHERE id = $8 AND empresa_id = $9
         RETURNING *`,
        [
          codigo_barra,
          descricao,
          normalizeMoney(custo),
          normalizeMoney(preco),
          categoria || null,
          foto_url || null,
          typeof ativo_loja === "boolean" ? ativo_loja : null,
          id,
          empresa_id,
        ]
      );

      if (update.rows.length === 0) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }
      return res.status(200).json(update.rows[0]);
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro no servidor" });
  } finally {
    client.release();
  }
}
