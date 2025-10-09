import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// normaliza "1,99" → 1.99
function normalizeMoney(v) {
  if (v === undefined || v === null || v === "") return 0;
  if (typeof v === "number") return v;
  const n = String(v).replace(/\./g, "").replace(",", ".").trim();
  const parsed = parseFloat(n);
  return isNaN(parsed) ? 0 : parsed;
}

// tenta pegar empresa_id da session (se Next-Auth estiver configurado);
// caso contrário, cai no header x-empresa-id
async function getEmpresaId(req, res) {
  try {
    // lazy import para não quebrar se você não tiver next-auth nessa rota
    const { getServerSession } = await import("next-auth/next");
    const { authOptions } = await import("../auth/[...nextauth].js");
    const session = await getServerSession(req, res, authOptions);
    if (session?.user?.empresa_id) return session.user.empresa_id;
  } catch (_) {
    // ignora: sem next-auth aqui
  }
  const headerEmpresa = req.headers["x-empresa-id"];
  return headerEmpresa || null;
}

export default async function handler(req, res) {
  const { method } = req;
  const { id: idParam } = req.query;

  // valida id numérico
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: "ID inválido" });
  }

  const empresa_id = await getEmpresaId(req, res);
  if (!empresa_id) {
    return res.status(401).json({ error: "Empresa não informada" });
  }

  const client = await pool.connect();

  try {
    if (method === "GET") {
      const { rows } = await client.query(
        `SELECT id, codigo_barra, descricao, custo, preco, categoria,
                empresa_id, foto_url, ativo_loja, created_at
           FROM produto
          WHERE id = $1 AND empresa_id = $2`,
        [id, empresa_id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }
      return res.status(200).json(rows[0]);
    }

    if (method === "PUT") {
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

      const { rows } = await client.query(
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

      if (rows.length === 0) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }
      return res.status(200).json(rows[0]);
    }

    if (method === "DELETE") {
      const { rows } = await client.query(
        `DELETE FROM produto
          WHERE id = $1 AND empresa_id = $2
          RETURNING id`,
        [id, empresa_id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }
      return res.status(200).json({ message: "Produto excluído com sucesso", id: rows[0].id });
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro no servidor" });
  } finally {
    client.release();
  }
}
