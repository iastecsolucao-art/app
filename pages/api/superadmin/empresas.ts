import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session: any = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.email) {
    return res.status(403).json({ error: "Sessão inválida." });
  }

  const client = await pool.connect();
  try {
    // 1. Proteger Rota Analisando Banco (Só Super Admins reais)
    const adminCheck = await client.query('SELECT admin FROM usuarios WHERE email = $1', [session.user.email]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].admin !== true) {
       client.release();
       return res.status(403).json({ error: "Acesso restrito a Super Admins." });
    }

    if (req.method === "GET") {
      // 2. Listar Empresas
      const empresas = await client.query(`
        SELECT id, nome, cnpj, plano, assinatura_status, assinatura_validade 
        FROM empresa 
        ORDER BY id DESC
      `);
      return res.status(200).json(empresas.rows);
    } 
    else if (req.method === "POST") {
      // 3. Atualizar Status ou Plano
      const { empresaId, plano, status, validadeDias } = req.body;
      if (!empresaId) return res.status(400).json({ error: "Empresa ID obrigatório" });

      let query = "UPDATE empresa SET ";
      const values: any[] = [];
      let i = 1;

      if (plano !== undefined) {
        query += `plano = $${i}, `;
        values.push(plano);
        i++;
      }
      if (status !== undefined) {
        query += `assinatura_status = $${i}, `;
        values.push(status);
        i++;
      }
      if (validadeDias !== undefined) {
        query += `assinatura_validade = NOW() + INTERVAL '${Number(validadeDias)} days', `;
      }

      // Remove last comma
      query = query.replace(/,\s*$/, "");
      query += ` WHERE id = $${i} RETURNING *`;
      values.push(empresaId);

      const updated = await client.query(query, values);
      
      // Opcional: refletir a validade aos usuários da empresa também
      if (validadeDias !== undefined && status === "ATIVO") {
          await client.query(`UPDATE usuarios SET expiracao = NOW() + INTERVAL '${Number(validadeDias)} days' WHERE empresa_id = $1`, [empresaId]);
      }

      return res.status(200).json({ success: true, empresa: updated.rows[0] });
    } 
    else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (err: any) {
    console.error("Super Admin API Error:", err);
    return res.status(500).json({ error: "Erro interno do servidor." });
  } finally {
    client.release();
  }
}
