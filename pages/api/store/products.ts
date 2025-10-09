import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const empresaId = req.query.empresaId;
  const q = (req.query.q as string) || "";
  const categoria = (req.query.categoria as string) || "";

  if (!empresaId) return res.status(400).json({ error: "empresaId é obrigatório" });

  const client = await pool.connect();
  try {
    const params: any[] = [empresaId];
    let where = `WHERE empresa_id = $1`;
    let i = 2;

    if (q) { where += ` AND LOWER(descricao) LIKE LOWER($${i++})`; params.push(`%${q}%`); }
    if (categoria) { where += ` AND categoria = $${i++}`; params.push(categoria); }

    // ❗ sem preco > 0 e sem unaccent
    const sql = `
     SELECT id, codigo_barra, descricao, preco, categoria, foto_url
FROM produto
WHERE empresa_id = $1 AND ativo_loja = TRUE
ORDER BY descricao;
    `;

    const { rows } = await client.query(sql, params);
    return res.status(200).json(rows);
  } catch (e) {
    console.error("ERR /api/store/products:", e);
    return res.status(500).json({ error: "Erro ao listar produtos" });
  } finally {
    client.release();
  }
}
