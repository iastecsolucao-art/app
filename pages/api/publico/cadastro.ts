import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// API pública para cadastro de novo usuário + empresa
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { step, ...data } = req.body;
  const client = await pool.connect();

  try {
    // PASSO 1: Criar empresa
    if (step === "empresa") {
      const { nome, cnpj } = data;
      if (!nome) return res.status(400).json({ error: "Nome da empresa obrigatório." });

      // Checar cnpj duplicado
      if (cnpj) {
        const exists = await client.query("SELECT id FROM empresa WHERE cnpj=$1", [cnpj]);
        if (exists.rows.length > 0) return res.status(400).json({ error: "CNPJ já cadastrado." });
      }

      const ins = await client.query(
        `INSERT INTO empresa (nome, cnpj, plano, assinatura_status)
         VALUES ($1, $2, 'Bronze', 'TRIAL') RETURNING id, nome`,
        [nome, cnpj || null]
      );
      return res.status(200).json({ empresa: ins.rows[0] });
    }

    // PASSO 2: Criar usuário vinculado à empresa
    if (step === "usuario") {
      const { nome, email, senha, empresa_id, role } = data;
      if (!nome || !email || !senha || !empresa_id) {
        return res.status(400).json({ error: "Preencha todos os campos." });
      }

      const exists = await client.query("SELECT id FROM usuarios WHERE email=$1", [email]);
      if (exists.rows.length > 0) return res.status(400).json({ error: "E-mail já cadastrado." });

      const hash = await bcrypt.hash(senha, 10);
      const emp = await client.query("SELECT nome FROM empresa WHERE id=$1", [empresa_id]);
      const empresaNome = emp.rows[0]?.nome || "";

      const ins = await client.query(
        `INSERT INTO usuarios (nome, email, senha, empresa, empresa_id, role, expiracao)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '15 days')
         RETURNING id, nome, email, role`,
        [nome, email, hash, empresaNome, empresa_id, role || "admin"]
      );
      return res.status(200).json({ usuario: ins.rows[0] });
    }

    // PASSO 3: Vincular plano à empresa
    if (step === "plano") {
      const { empresa_id, plano } = data;
      await client.query(
        "UPDATE empresa SET plano=$1 WHERE id=$2",
        [plano, empresa_id]
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Step inválido." });

  } catch (err) {
    console.error("Erro /api/publico/cadastro:", err);
    return res.status(500).json({ error: "Erro interno." });
  } finally {
    client.release();
  }
}
