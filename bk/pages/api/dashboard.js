import pool from "../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      // total de entradas (consideramos "compras")
      const compras = await pool.query(`
        SELECT COALESCE(SUM(quantidade), 0)::int AS total
        FROM estoque_movimento
        WHERE tipo = 'entrada'
      `);

      // total de saídas (consideramos "vendas")
      const vendas = await pool.query(`
        SELECT COALESCE(SUM(quantidade), 0)::int AS total
        FROM estoque_movimento
        WHERE tipo = 'saida'
      `);

      // estoque atual = entradas - saídas
      const estoque = await pool.query(`
        SELECT COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN quantidade
                                WHEN tipo = 'saida' THEN -quantidade
                                ELSE 0 END), 0)::int AS total
        FROM estoque_movimento
      `);

      res.status(200).json({
        compras: compras.rows[0].total,
        vendas: vendas.rows[0].total,
        estoque: estoque.rows[0].total,
      });
    } catch (err) {
      console.error("Erro API dashboard.js:", err.message);
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(405).json({ error: "Método não permitido" });
  }
}