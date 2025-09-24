import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL_VENDEDORES });
console.log("Conectando ao banco:", process.env.DATABASE_URL_VENDEDORES);

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { q = "", page = 1, limit = 10 } = req.query;
      const limitNum = parseInt(limit, 10) || 10;
      const pageNum = parseInt(page, 10) || 1;
      const offset = (pageNum - 1) * limitNum;

      const queryText = `
        SELECT id, codigo, loja, semana1, semana2, semana3, semana4, semana5, semana6,
               cota_vendedor, super_cota, cota_ouro, comissao_loja, qtd_vendedor
        FROM metas_lojas
        WHERE loja ILIKE $1
        ORDER BY loja
        LIMIT $2 OFFSET $3
      `;
      const values = [`%${q}%`, limitNum, offset];

      const result = await pool.query(queryText, values);

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM metas_lojas WHERE loja ILIKE $1`,
        [`%${q}%`]
      );

      const totalItems = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalItems / limitNum);

      res.status(200).json({
        items: result.rows,
        totalItems,
        totalPages,
        currentPage: pageNum,
      });
    } else if (req.method === "POST") {
      const {
        codigo,
        loja,
        semana1,
        semana2,
        semana3,
        semana4,
        semana5,
        semana6,
        cota_vendedor,
        super_cota,
        cota_ouro,
        comissao_loja,
        qtd_vendedor,
      } = req.body;

      const insertQuery = `
        INSERT INTO metas_lojas (
          codigo, loja, semana1, semana2, semana3, semana4, semana5, semana6,
          cota_vendedor, super_cota, cota_ouro, comissao_loja, qtd_vendedor
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING *
      `;
      const insertValues = [
        codigo,
        loja,
        semana1 || 0,
        semana2 || 0,
        semana3 || 0,
        semana4 || 0,
        semana5 || 0,
        semana6 || 0,
        cota_vendedor || 0,
        super_cota || 0,
        cota_ouro || 0,
        comissao_loja || 0,
        qtd_vendedor || 0,
      ];

      const insertResult = await pool.query(insertQuery, insertValues);
      res.status(201).json(insertResult.rows[0]);
    } else if (req.method === "PUT") {
      const {
        id,
        codigo,
        loja,
        semana1,
        semana2,
        semana3,
        semana4,
        semana5,
        semana6,
        cota_vendedor,
        super_cota,
        cota_ouro,
        comissao_loja,
        qtd_vendedor,
      } = req.body;

      const updateQuery = `
        UPDATE metas_lojas SET
          codigo = $1,
          loja = $2,
          semana1 = $3,
          semana2 = $4,
          semana3 = $5,
          semana4 = $6,
          semana5 = $7,
          semana6 = $8,
          cota_vendedor = $9,
          super_cota = $10,
          cota_ouro = $11,
          comissao_loja = $12,
          qtd_vendedor = $13
        WHERE id = $14
        RETURNING *
      `;
      const updateValues = [
        codigo,
        loja,
        semana1 || 0,
        semana2 || 0,
        semana3 || 0,
        semana4 || 0,
        semana5 || 0,
        semana6 || 0,
        cota_vendedor || 0,
        super_cota || 0,
        cota_ouro || 0,
        comissao_loja || 0,
        qtd_vendedor || 0,
        id,
      ];
      const updateResult = await pool.query(updateQuery, updateValues);
      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: "Meta não encontrada" });
      }
      res.status(200).json(updateResult.rows[0]);
    } else if (req.method === "DELETE") {
      const { id } = req.query;
      const deleteResult = await pool.query(
        `DELETE FROM metas_lojas WHERE id = $1 RETURNING *`,
        [id]
      );
      if (deleteResult.rows.length === 0) {
        return res.status(404).json({ error: "Meta não encontrada" });
      }
      res.status(200).json({ message: "Meta deletada com sucesso" });
    } else {
      res.status(405).json({ error: "Método não permitido" });
    }
  } catch (error) {
    console.error("Erro API metas:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}