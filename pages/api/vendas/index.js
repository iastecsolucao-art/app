import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req, res) {
  const client = await pool.connect();
  try {
    if (req.method === "POST") {
      const {
        orcamento_id,
        condicao_pgto,
        quantidade_total,
        valor_total,
        itens,
      } = req.body;

      // Cria a venda e retorna o id
      const result = await client.query(
        `INSERT INTO vendas (orcamento_id, condicao_pgto, quantidade_total, valor_total)
         VALUES ($1, $2, $3, $4)
         RETURNING id, data_venda`,
        [orcamento_id || null, condicao_pgto, quantidade_total, valor_total]
      );

      const vendaId = result.rows[0].id;

      // 🔹 Gera numero_venda => VEN-00001, VEN-00002, etc
      const numeroVenda = `VEN-${vendaId.toString().padStart(5, "0")}`;

      await client.query(
        "UPDATE vendas SET numero_venda=$1 WHERE id=$2",
        [numeroVenda, vendaId]
      );

      // Insere itens da venda
      if (Array.isArray(itens)) {
        for (const item of itens) {
          await client.query(
            `INSERT INTO itens_venda 
              (venda_id, codigo, descricao, observacao, quantidade, preco, valor_total_item)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [
              vendaId,
              item.codigo,
              item.descricao,
              item.observacao,
              item.quantidade,
              item.preco,
              item.valor_total_item,
            ]
          );
        }
      }

      return res.status(201).json({
        message: "Venda criada com sucesso!",
        id: vendaId,
        numero_venda: numeroVenda,
      });
    }

    if (req.method === "GET") {
      const { id } = req.query;

      if (id) {
        const venda = await client.query(
          `SELECT id, numero_venda, condicao_pgto, data_venda, valor_total, quantidade_total
           FROM vendas WHERE id=$1`,
          [id]
        );

        const itens = await client.query(
          `SELECT * FROM itens_venda WHERE venda_id=$1`,
          [id]
        );

        return res.json({ ...venda.rows[0], itens: itens.rows });
      } else {
        const vendas = await client.query(
          `SELECT id, numero_venda, condicao_pgto, data_venda, valor_total, quantidade_total 
           FROM vendas 
           ORDER BY id DESC LIMIT 20`
        );
        return res.json(vendas.rows);
      }
    }

    res.status(405).json({ error: "Método não permitido" });
  } catch (err) {
    console.error("Erro API /vendas:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  } finally {
    client.release();
  }
}