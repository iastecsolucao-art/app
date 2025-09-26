import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

export default async function handler(req, res) {
  const { method, query, body } = req;

  try {
    if (method === "GET") {
      // Paginação e busca
      const q = query.q || "";
      const page = parseInt(query.page, 10) || 1;
      const limit = parseInt(query.limit, 10) || 10;
      const offset = (page - 1) * limit;

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM metas_lojas WHERE loja ILIKE $1`,
        [`%${q}%`]
      );
      const totalItems = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalItems / limit);

      const result = await pool.query(
        `SELECT id, codigo, loja, mes, ano,
          semana1, semana2, semana3, semana4, semana5, semana6,
          cota_vendedor, super_cota, cota_ouro, comissao_loja,
          qtd_vendedor, valor_cota, valor_super_cota, valor_cota_ouro,
          cota_semana1, cota_semana2, cota_semana3, cota_semana4, cota_semana5, cota_semana6,
          semana1_qtd_vendedor, semana2_qtd_vendedor, semana3_qtd_vendedor,
          semana4_qtd_vendedor, semana5_qtd_vendedor, semana6_qtd_vendedor
         FROM metas_lojas
         WHERE loja ILIKE $1
         ORDER BY id
         LIMIT $2 OFFSET $3`,
        [`%${q}%`, limit, offset]
      );

      return res.status(200).json({
        items: result.rows,
        currentPage: page,
        totalPages,
      });
    }

    if (method === "POST" || method === "PUT") {
      const {
        id,
        codigo,
        loja,
        mes,
        ano,
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
        valor_cota,
        valor_super_cota,
        valor_cota_ouro,
        cota_semana1,
        cota_semana2,
        cota_semana3,
        cota_semana4,
        cota_semana5,
        cota_semana6,
        semana1_qtd_vendedor,
        semana2_qtd_vendedor,
        semana3_qtd_vendedor,
        semana4_qtd_vendedor,
        semana5_qtd_vendedor,
        semana6_qtd_vendedor,
      } = body;

      if (method === "POST") {
        const insertQuery = `
          INSERT INTO metas_lojas
          (codigo, loja, mes, ano,
           semana1, semana2, semana3, semana4, semana5, semana6,
           cota_vendedor, super_cota, cota_ouro, comissao_loja, qtd_vendedor,
           valor_cota, valor_super_cota, valor_cota_ouro,
           cota_semana1, cota_semana2, cota_semana3, cota_semana4, cota_semana5, cota_semana6,
           semana1_qtd_vendedor, semana2_qtd_vendedor, semana3_qtd_vendedor,
           semana4_qtd_vendedor, semana5_qtd_vendedor, semana6_qtd_vendedor)
          VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
           $11,$12,$13,$14,$15,$16,$17,$18,
           $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
          RETURNING *;
        `;
        const values = [
          codigo,
          loja,
          mes,
          ano,
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
          valor_cota,
          valor_super_cota,
          valor_cota_ouro,
          cota_semana1,
          cota_semana2,
          cota_semana3,
          cota_semana4,
          cota_semana5,
          cota_semana6,
          semana1_qtd_vendedor,
          semana2_qtd_vendedor,
          semana3_qtd_vendedor,
          semana4_qtd_vendedor,
          semana5_qtd_vendedor,
          semana6_qtd_vendedor,
        ];
        const result = await pool.query(insertQuery, values);
        return res.status(201).json(result.rows[0]);
      }

      if (method === "PUT") {
        if (!id) return res.status(400).json({ error: "ID é obrigatório para atualizar" });

        const updateQuery = `
          UPDATE metas_lojas SET
            codigo=$1, loja=$2, mes=$3, ano=$4,
            semana1=$5, semana2=$6, semana3=$7, semana4=$8, semana5=$9, semana6=$10,
            cota_vendedor=$11, super_cota=$12, cota_ouro=$13, comissao_loja=$14,
            qtd_vendedor=$15, valor_cota=$16, valor_super_cota=$17, valor_cota_ouro=$18,
            cota_semana1=$19, cota_semana2=$20, cota_semana3=$21, cota_semana4=$22, cota_semana5=$23, cota_semana6=$24,
            semana1_qtd_vendedor=$25, semana2_qtd_vendedor=$26, semana3_qtd_vendedor=$27,
            semana4_qtd_vendedor=$28, semana5_qtd_vendedor=$29, semana6_qtd_vendedor=$30
          WHERE id=$31
          RETURNING *;
        `;
        const values = [
          codigo,
          loja,
          mes,
          ano,
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
          valor_cota,
          valor_super_cota,
          valor_cota_ouro,
          cota_semana1,
          cota_semana2,
          cota_semana3,
          cota_semana4,
          cota_semana5,
          cota_semana6,
          semana1_qtd_vendedor,
          semana2_qtd_vendedor,
          semana3_qtd_vendedor,
          semana4_qtd_vendedor,
          semana5_qtd_vendedor,
          semana6_qtd_vendedor,
          id,
        ];
        const result = await pool.query(updateQuery, values);
        return res.status(200).json(result.rows[0]);
      }
    }

    if (method === "DELETE") {
      const id = parseInt(query.id, 10);
      if (!id) return res.status(400).json({ error: "ID é obrigatório para deletar" });

      await pool.query("DELETE FROM metas_lojas WHERE id=$1", [id]);
      return res.status(204).end();
    }

    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    return res.status(405).end(`Método ${method} não permitido`);
  } catch (error) {
    console.error("Erro API metas:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}