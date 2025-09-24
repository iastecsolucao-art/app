import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL_VENDEDORES });
console.log("Conectando ao banco:", process.env.DATABASE_URL_VENDEDORES);
export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { q = "", page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      // Busca com filtro por nome e paginação
      const queryText = `
        SELECT * FROM vendedores
        WHERE seller_name ILIKE $1
        ORDER BY seller_name
        LIMIT $2 OFFSET $3
      `;
      const values = [`%${q}%`, limit, offset];

      const result = await pool.query(queryText, values);

      // Conta total para paginação
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM vendedores WHERE seller_name ILIKE $1`,
        [`%${q}%`]
      );

      const totalItems = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalItems / limit);

      res.status(200).json({
        items: result.rows,
        totalItems,
        totalPages,
        currentPage: Number(page),
      });
    } else {
      res.status(405).json({ error: "Método não permitido" });
    }
  } catch (error) {
    console.error("Erro API vendedores:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}