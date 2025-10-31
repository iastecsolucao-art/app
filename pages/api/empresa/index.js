import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  const client = await pool.connect();

  try {
    const userRes = await client.query(
      "SELECT empresa_id FROM usuarios WHERE email=$1",
      [session.user.email]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }

    const { empresa_id } = userRes.rows[0];
    if (!empresa_id) {
      return res
        .status(400)
        .json({ error: "Usuário não possui empresa vinculada." });
    }

    const empresaRes = await client.query(
      `SELECT *
       FROM empresa
       WHERE id = $1
       LIMIT 1`,
      [empresa_id]
    );

    if (empresaRes.rows.length === 0) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    const empresa = empresaRes.rows[0];

    const celular =
      empresa.celular ??
      empresa.Celular ??
      empresa.celular_empresa ??
      null;

    const telefone =
      empresa.telefone ??
      empresa.Telefone ??
      empresa.fone ??
      empresa.Fone ??
      celular ??
      empresa.whatsapp ??
      empresa.WhatsApp ??
      null;

    const email =
      empresa.email ??
      empresa.Email ??
      empresa.email_empresa ??
      empresa.contato_email ??
      null;

    const enderecoPrincipal = empresa.endereco ?? empresa.Endereco ?? null;
    const enderecoPartes = [
      empresa.logradouro ?? empresa.Logradouro ?? null,
      empresa.numero ?? empresa.Numero ?? null,
      empresa.complemento ?? empresa.Complemento ?? null,
      empresa.bairro ?? empresa.Bairro ?? null,
      empresa.cidade ?? empresa.Cidade ?? empresa.municipio ?? empresa.Municipio ?? null,
      empresa.estado ?? empresa.Estado ?? empresa.uf ?? empresa.UF ?? null,
      empresa.cep ?? empresa.CEP ?? null,
    ].filter(Boolean);

    const endereco = enderecoPrincipal || (enderecoPartes.length ? enderecoPartes.join(", ") : null);

    return res.status(200).json({
      id: empresa.id,
      nome: empresa.nome ?? empresa.Nome ?? null,
      plano: empresa.plano ?? empresa.Plano ?? null,
      criado_em: empresa.created_at ?? empresa.createdAt ?? null,
      endereco,
      celular,
      telefone,
      whatsapp: empresa.whatsapp ?? empresa.WhatsApp ?? null,
      fone: empresa.fone ?? empresa.Fone ?? null,
      cnpj: empresa.cnpj ?? empresa.CNPJ ?? null,
      email,
      logradouro: empresa.logradouro ?? empresa.Logradouro ?? null,
      numero: empresa.numero ?? empresa.Numero ?? null,
      complemento: empresa.complemento ?? empresa.Complemento ?? null,
      bairro: empresa.bairro ?? empresa.Bairro ?? null,
      cidade:
        empresa.cidade ??
        empresa.Cidade ??
        empresa.municipio ??
        empresa.Municipio ??
        null,
      estado: empresa.estado ?? empresa.Estado ?? empresa.uf ?? empresa.UF ?? null,
      cep: empresa.cep ?? empresa.CEP ?? null,
      site: empresa.site ?? empresa.Site ?? null,
    });
  } catch (err) {
    console.error("Erro API empresa:", err);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  } finally {
    client.release();
  }
}