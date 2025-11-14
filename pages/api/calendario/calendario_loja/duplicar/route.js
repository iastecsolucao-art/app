// app/api/calendario/calendario_loja/duplicar/route.js
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// POST /api/calendario/calendario_loja/duplicar
// body: { origem_loja, destino_loja, ano, semana }
export async function POST(request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { origem_loja, destino_loja, ano, semana } = body;

    if (!origem_loja || !destino_loja || !ano || !semana) {
      return NextResponse.json(
        {
          error:
            "origem_loja, destino_loja, ano e semana são obrigatórios",
        },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    const selectQuery = `
      SELECT ano, semana, loja, meta, obs, qtd_vendedor,
             cota, abaixo, super_cota, cota_ouro
      FROM public.calendario_loja
      WHERE loja = $1 AND ano = $2 AND semana = $3
    `;
    const source = await client.query(selectQuery, [
      origem_loja,
      ano,
      semana,
    ]);

    if (!source.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Nenhum registro para copiar da loja de origem" },
        { status: 404 }
      );
    }

    const insertQuery = `
      INSERT INTO public.calendario_loja
        (ano, semana, loja, meta, obs, qtd_vendedor,
         cota, abaixo, super_cota, cota_ouro)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *;
    `;

    const novos = [];
    for (const row of source.rows) {
      const values = [
        ano,
        semana,
        destino_loja, // só muda a loja
        row.meta,
        row.obs,
        row.qtd_vendedor,
        row.cota,
        row.abaixo,
        row.super_cota,
        row.cota_ouro,
      ];
      const result = await client.query(insertQuery, values);
      novos.push(result.rows[0]);
    }

    await client.query("COMMIT");

    return NextResponse.json({
      message: "Registros duplicados com sucesso.",
      registros: novos,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST duplicar calendario_loja error:", err);
    return NextResponse.json(
      { error: "Erro ao duplicar registros" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
