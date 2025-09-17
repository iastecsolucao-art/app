import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req, res) {
  const client = await pool.connect();
  try {
    // 🔹 Criar
    if (req.method === "POST") {
      const {
        condicao_pgto,
        valor_total,
        quantidade_total,
        data_orcamento,
        validade,
        itens,
      } = req.body;

      const result = await client.query(
        `INSERT INTO orcamentos (condicao_pgto, valor_total, quantidade_total, data_orcamento, validade)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, numero_orcamento, data_orcamento, validade`,
        [
          condicao_pgto,
          valor_total,
          quantidade_total,
          data_orcamento || new Date(),
          validade || null,
        ]
      );

      const orcamentoId = result.rows[0].id;
      const numeroOrcamento = result.rows[0].numero_orcamento;

      if (Array.isArray(itens)) {
        for (const item of itens) {
          await client.query(
            `INSERT INTO orcamento_itens (orcamento_id, codigo, descricao, observacao, quantidade, preco, valor_total_item)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              orcamentoId,
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

      return res
        .status(201)
        .json({ message: "Orçamento salvo com sucesso!", numero_orcamento: numeroOrcamento });
    }

    // 🔹 Alterar
    if (req.method === "PUT") {
      const {
        id,
        condicao_pgto,
        valor_total,
        quantidade_total,
        data_orcamento,
        validade,
        itens,
      } = req.body;

      await client.query(
        `UPDATE orcamentos
         SET condicao_pgto=$1, valor_total=$2, quantidade_total=$3, data_orcamento=$4, validade=$5
         WHERE id=$6`,
        [
          condicao_pgto,
          valor_total,
          quantidade_total,
          data_orcamento || new Date(),
          validade || null,
          id,
        ]
      );

      await client.query("DELETE FROM orcamento_itens WHERE orcamento_id=$1", [
        id,
      ]);

      if (Array.isArray(itens)) {
        for (const item of itens) {
          await client.query(
            `INSERT INTO orcamento_itens (orcamento_id, codigo, descricao, observacao, quantidade, preco, valor_total_item)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              id,
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

      return res.json({ message: "Orçamento atualizado com sucesso!" });
    }

    // 🔹 Buscar
    if (req.method === "GET") {
      const { numero } = req.query;

      if (numero) {
        const result = await client.query(
          `SELECT o.id, o.numero_orcamento, o.condicao_pgto, o.valor_total, o.quantidade_total, o.data_orcamento, o.validade,
                  json_agg(oi.*) as itens
           FROM orcamentos o
           JOIN orcamento_itens oi ON oi.orcamento_id = o.id
           WHERE o.numero_orcamento = $1
           GROUP BY o.id`,
          [numero]
        );
        if (result.rows.length === 0)
          return res.status(404).json({ error: "Orçamento não encontrado" });
        return res.json(result.rows[0]);
      }

      const result = await client.query(
        `SELECT id, numero_orcamento, condicao_pgto, valor_total, quantidade_total, data_orcamento, validade
         FROM orcamentos ORDER BY id DESC LIMIT 20`
      );
      return res.json(result.rows);
    }

    // 🔹 Excluir
    if (req.method === "DELETE") {
      const { id } = req.query;
      await client.query("DELETE FROM orcamento_itens WHERE orcamento_id=$1", [
        id,
      ]);
      await client.query("DELETE FROM orcamentos WHERE id=$1", [id]);
      return res.json({ message: "Orçamento excluído com sucesso!" });
    }

    res.status(405).json({ error: "Método não permitido" });
  } catch (err) {
    console.error("Erro API /orcamentos:", err);
    res.status(500).json({ error: "Erro interno ao processar orçamento" });
  } finally {
    client.release();
  }
}