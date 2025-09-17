import pool from "../../../lib/db";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const result = await pool.query("SELECT * FROM compras WHERE id=$1", [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Compra não encontrada" });
      }
      const compra = result.rows[0];
      const itens = await pool.query(
        "SELECT * FROM compras_itens WHERE compra_id=$1 ORDER BY id",
        [id]
      );
      compra.itens = itens.rows;
      res.status(200).json(compra);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  else if (req.method === "PUT") {
    try {
      const { fornecedor, numero_nf, usuario, status, data_compra, itens } = req.body;

      await pool.query(
        "UPDATE compras SET fornecedor=$1, numero_nf=$2, usuario=$3, status=$4, data_compra=$5 WHERE id=$6",
        [fornecedor, numero_nf, usuario, status, data_compra, id]
      );

      await pool.query("DELETE FROM compras_itens WHERE compra_id=$1", [id]);

      for (const it of itens) {
        await pool.query(
          "INSERT INTO compras_itens (compra_id, codigo, descricao, quantidade, preco, total) VALUES ($1,$2,$3,$4,$5,$6)",
          [id, it.codigo, it.descricao, it.quantidade, it.preco, it.total_item]
        );
      }

      res.status(200).json({ message: "Compra atualizada com sucesso!" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  else if (req.method === "DELETE") {
    try {
      await pool.query("DELETE FROM compras_itens WHERE compra_id=$1", [id]);
      await pool.query("DELETE FROM compras WHERE id=$1", [id]);
      res.status(200).json({ message: "Compra excluída!" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  else {
    res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
    res.status(405).end(`Método ${req.method} não permitido`);
  }
}