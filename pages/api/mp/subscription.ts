import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { Pool } from "pg";
import { mpPost } from "../../../lib/mp";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await getSession({ req });
  if (!session || !(session.user as any)?.empresa_id) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  const { planoNome } = req.body;
  if (!planoNome) {
    return res.status(400).json({ error: "Plano não informado." });
  }

  const client = await pool.connect();
  let planoInfo = null;
  try {
    const pRes = await client.query("SELECT nome, preco FROM saas_planos WHERE nome=$1", [planoNome]);
    if (pRes.rows.length === 0) {
      client.release();
      return res.status(400).json({ error: "Plano inválido ou inexistente." });
    }
    planoInfo = pRes.rows[0];
  } catch (err) {
    client.release();
    return res.status(500).json({ error: "Erro ao consultar plano." });
  }

  const empresaId = (session.user as any).empresa_id;
  const userEmail = session.user.email || "contato@empresa.com";

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const body = {
      reason: `Assinatura ${planoInfo.nome} - Inventário App`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: planoInfo.preco,
        currency_id: "BRL"
      },
      back_url: `${baseUrl}/admin/planos`,
      payer_email: userEmail,
      external_reference: `EMP_${empresaId}_PLANO_${planoNome}`,
      status: "pending"
    };

    const mpResp = await mpPost("/preapproval", body);

    if (!mpResp.ok) {
      console.error("Erro MP Preapproval:", mpResp);
      return res.status(500).json({ error: "Falha ao gerar link de assinatura" });
    }

    const initPoint = mpResp.data.init_point;
    const preapprovalId = mpResp.data.id;

    // Atualiza a tabela empresa com o ID da nova tentativa de assinatura
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE empresa SET mp_preapproval_id = $1 WHERE id = $2`,
        [preapprovalId, empresaId]
      );
    } finally {
      client.release();
    }

    return res.status(200).json({ init_point: initPoint });
  } catch (err: any) {
    console.error("Erro rota subscription:", err);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}
