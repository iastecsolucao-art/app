import { Pool } from "pg";

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

function onlyDigits(v) {
  return (v ?? "").toString().replace(/\D/g, "");
}

function toInt(v) {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isInteger(n) ? n : null;
}

export default async function handler(req, res) {

  const id = toInt(req.query.id);

  if (!id) {
    return res.status(400).json({ error: "ID inválido" });
  }

  try {

    if (req.method === "GET") {

      const result = await pool.query(
        `SELECT * FROM nfe_address WHERE id = $1`,
        [id]
      );

      if (!result.rows.length)
        return res.status(404).json({ error: "Registro não encontrado" });

      return res.status(200).json(result.rows[0]);

    }


    if (req.method === "PUT") {

      const body = req.body;

      const result = await pool.query(
        `
        UPDATE nfe_address
        SET
          empresa_id=$1,
          nfe_id=$2,
          role=$3,
          cnpj=$4,
          cpf=$5,
          xlgr=$6,
          nro=$7,
          xcpl=$8,
          xbairro=$9,
          cmun=$10,
          xmun=$11,
          uf=$12,
          cep=$13,
          cpais=$14,
          xpais=$15,
          fone=$16,
          email=$17
        WHERE id=$18
        RETURNING *
        `,
        [
          toInt(body.empresa_id),
          toInt(body.nfe_id),
          body.role,
          onlyDigits(body.cnpj),
          onlyDigits(body.cpf),
          body.xlgr,
          body.nro,
          body.xcpl,
          body.xbairro,
          body.cmun,
          body.xmun,
          body.uf,
          onlyDigits(body.cep),
          body.cpais,
          body.xpais,
          onlyDigits(body.fone),
          body.email,
          id
        ]
      );

      return res.status(200).json(result.rows[0]);

    }


    if (req.method === "DELETE") {

      await pool.query(
        `DELETE FROM nfe_address WHERE id=$1`,
        [id]
      );

      return res.status(200).json({
        success: true
      });

    }


    res.status(405).json({ error: "Método não permitido" });

  }
  catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

}