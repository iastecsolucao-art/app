import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não está definida");
}

let pool = global._nfePgPool;

if (!pool) {
  pool = new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });

  global._nfePgPool = pool;
}

function onlyDigits(v) {
  return (v ?? "").toString().replace(/\D/g, "");
}

function firstValue(v) {
  return Array.isArray(v) ? v[0] : v;
}

function toInt(v) {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isInteger(n) ? n : null;
}

export default async function handler(req, res) {
  try {

    if (req.method === "GET") {

      const {
        q,
        role,
        uf,
        empresa_id,
        nfe_id
      } = req.query;

      const where = [];
      const params = [];

      if (q) {
        params.push(`%${q}%`);

        where.push(`
          (
            CAST(id AS TEXT) ILIKE $${params.length}
            OR COALESCE(cnpj,'') ILIKE $${params.length}
            OR COALESCE(cpf,'') ILIKE $${params.length}
            OR COALESCE(xmun,'') ILIKE $${params.length}
            OR COALESCE(email,'') ILIKE $${params.length}
          )
        `);
      }

      if (role) {
        params.push(role);
        where.push(`role = $${params.length}`);
      }

      if (uf) {
        params.push(uf.toUpperCase());
        where.push(`uf = $${params.length}`);
      }

      if (empresa_id) {
        params.push(toInt(empresa_id));
        where.push(`empresa_id = $${params.length}`);
      }

      if (nfe_id) {
        params.push(toInt(nfe_id));
        where.push(`nfe_id = $${params.length}`);
      }

      const sql = `
        SELECT *
        FROM nfe_address
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY id DESC
        LIMIT 200
      `;

      const result = await pool.query(sql, params);

      return res.status(200).json({
        rows: result.rows
      });

    }


    if (req.method === "POST") {

      const body = req.body;

      const sql = `
        INSERT INTO nfe_address
        (
          empresa_id,
          nfe_id,
          role,
          cnpj,
          cpf,
          xlgr,
          nro,
          xcpl,
          xbairro,
          cmun,
          xmun,
          uf,
          cep,
          cpais,
          xpais,
          fone,
          email
        )
        VALUES
        (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
        )
        RETURNING *
      `;

      const values = [
        toInt(body.empresa_id),
        toInt(body.nfe_id),
        body.role,
        onlyDigits(body.cnpj) || null,
        onlyDigits(body.cpf) || null,
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
        body.email
      ];

      const result = await pool.query(sql, values);

      return res.status(201).json(result.rows[0]);

    }


    res.status(405).json({ error: "Método não permitido" });

  }
  catch (error) {

    res.status(500).json({
      error: "Erro interno",
      details: error.message
    });

  }
}