import { Pool } from "pg";
import crypto from "crypto";

const connectionString = process.env.DATABASE_URL;

let pool = global._nfePgPool;

if (!pool) {

  pool = new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

  global._nfePgPool = pool;
}

function toInt(v) {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isInteger(n) ? n : null;
}

export default async function handler(req, res) {

  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido" });

  const id = toInt(req.query.id);

  try {

    const participante = await pool.query(
      `
      SELECT *
      FROM nfe_address
      WHERE id=$1
      `,
      [id]
    );

    if (!participante.rows.length)
      return res.status(404).json({
        error: "Participante não encontrado"
      });


    const existe = await pool.query(
      `
      SELECT id
      FROM nfe_address_stage
      WHERE nfe_address_id=$1
      AND status_stage IN ('PENDENTE','PROCESSANDO')
      `,
      [id]
    );

    if (existe.rows.length) {

      return res.json({
        success: true,
        duplicado: true
      });

    }


    const integracao_id = crypto.randomUUID();

    const insert = await pool.query(
      `
      INSERT INTO nfe_address_stage
      (
        empresa_id,
        nfe_id,
        nfe_address_id,
        role,
        status_stage,
        integracao_id,
        mensagem_retorno
      )
      VALUES
      ($1,$2,$3,$4,'PENDENTE',$5,'Aguardando integrador')
      RETURNING *
      `,
      [
        participante.rows[0].empresa_id,
        participante.rows[0].nfe_id,
        id,
        participante.rows[0].role,
        integracao_id
      ]
    );

    return res.json({
      success: true,
      stage: insert.rows[0]
    });

  }
  catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

}