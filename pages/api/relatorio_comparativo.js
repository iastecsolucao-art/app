import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const client = await pool.connect();

  try {
    const query = `
      SELECT 
          v.filial,
          COALESCE(SUM(m.sem1),0) + COALESCE(SUM(m.sem2),0) + COALESCE(SUM(m.sem3),0) + COALESCE(SUM(m.sem4),0) + COALESCE(SUM(m.sem5),0) + COALESCE(SUM(m.sem6),0) AS meta_venda,
          COALESCE(SUM(v.tot_venda),0) AS tot_venda,
          CASE 
              WHEN (COALESCE(SUM(m.sem1),0) + COALESCE(SUM(m.sem2),0) + COALESCE(SUM(m.sem3),0) + COALESCE(SUM(m.sem4),0) + COALESCE(SUM(m.sem5),0) + COALESCE(SUM(m.sem6),0)) = 0 THEN 0
              ELSE SUM(v.tot_venda) / (COALESCE(SUM(m.sem1),0) + COALESCE(SUM(m.sem2),0) + COALESCE(SUM(m.sem3),0) + COALESCE(SUM(m.sem4),0) + COALESCE(SUM(m.sem5),0) + COALESCE(SUM(m.sem6),0))
          END AS atingido,
          MAX(m.comissao) AS comissao,
          MAX(m.subcomissao) AS subcomissao,
          COALESCE(SUM(m.sem1),0) AS meta_sem1,
          COALESCE(SUM(v.venda1),0) AS venda_sem1,
          CASE WHEN COALESCE(SUM(m.sem1),0) = 0 THEN 0 ELSE SUM(v.venda1) / SUM(m.sem1) END AS atg_sem1,
          MAX(m.tk1) AS bonus_sem1,
          COALESCE(SUM(m.sem2),0) AS meta_sem2,
          COALESCE(SUM(v.venda2),0) AS venda_sem2,
          CASE WHEN COALESCE(SUM(m.sem2),0) = 0 THEN 0 ELSE SUM(v.venda2) / SUM(m.sem2) END AS atg_sem2,
          MAX(m.tk2) AS bonus_sem2,
          COALESCE(SUM(m.sem3),0) AS meta_sem3,
          COALESCE(SUM(v.venda3),0) AS venda_sem3,
          CASE WHEN COALESCE(SUM(m.sem3),0) = 0 THEN 0 ELSE SUM(v.venda3) / SUM(m.sem3) END AS atg_sem3,
          MAX(m.tk3) AS bonus_sem3,
          COALESCE(SUM(m.sem4),0) AS meta_sem4,
          COALESCE(SUM(v.venda4),0) AS venda_sem4,
          CASE WHEN COALESCE(SUM(m.sem4),0) = 0 THEN 0 ELSE SUM(v.venda4) / SUM(m.sem4) END AS atg_sem4,
          MAX(m.tk4) AS bonus_sem4,
          COALESCE(SUM(m.sem5),0) AS meta_sem5,
          COALESCE(SUM(v.venda5),0) AS venda_sem5,
          CASE WHEN COALESCE(SUM(m.sem5),0) = 0 THEN 0 ELSE SUM(v.venda5) / SUM(m.sem5) END AS atg_sem5,
          MAX(m.tk5) AS bonus_sem5,
          COALESCE(SUM(m.sem6),0) AS meta_sem6,
          COALESCE(SUM(v.venda6),0) AS venda_sem6,
          CASE WHEN COALESCE(SUM(m.sem6),0) = 0 THEN 0 ELSE SUM(v.venda6) / SUM(m.sem6) END AS atg_sem6,
          MAX(m.tk6) AS bonus_sem6
      FROM 
          view_vendas_completa v
      LEFT JOIN 
          metas m ON v.filial = m.filial
      GROUP BY 
          v.filial
      ORDER BY 
          v.filial;
    `;

    const result = await client.query(query);
    return res.status(200).json({ data: result.rows });
  } catch (error) {
    console.error("Erro no relatório comparativo:", error);
    return res.status(500).json({ error: "Erro interno ao buscar dados" });
  } finally {
    client.release();
  }
}