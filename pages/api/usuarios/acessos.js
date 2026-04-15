// pages/api/usuarios/acessos.js
import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Não autenticado" });

  const client = await pool.connect();
  try {
    const usuario = await client.query(
      "SELECT id, role FROM usuarios WHERE email=$1",
      [session.user.email]
    );
    if (usuario.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    const { id: usuario_id, role } = usuario.rows[0];

    // tenta buscar acessos
    const acessos = await client.query(
      "SELECT dashboard, inventario, produtos, compras, comercial, servicos, buckman FROM acessos_usuario WHERE usuario_id=$1",
      [usuario_id]
    );

    let data;
    if (acessos.rows.length === 0) {
      // se não existe, cria automaticamente padrão "tudo liberado"
      const insert = await client.query(
        `INSERT INTO acessos_usuario (usuario_id) 
         VALUES ($1) 
         RETURNING dashboard, inventario, produtos, compras, comercial, servicos`,
        [usuario_id]
      );
      data = insert.rows[0];
    } else {
      data = acessos.rows[0];
    }

    // Recuperar também o plano atual da empresa e dados do banco saas_planos
    const emp = await client.query("SELECT plano FROM empresa WHERE id=$1", [session.user.empresa_id]);
    const planoNome = emp.rows.length > 0 ? emp.rows[0].plano || "Bronze" : "Bronze";
    
    let permissoesDoPlano = [];
    const configPlano = await client.query("SELECT menus_permitidos FROM saas_planos WHERE nome=$1", [planoNome]);
    if (configPlano.rows.length > 0) {
      permissoesDoPlano = configPlano.rows[0].menus_permitidos;
    } else {
       // Fallback se não achar
       permissoesDoPlano = ["dashboard", "produtos"];
    }

    // Filtra: O usuário só tem acesso final se a tabela dele for true E o PLANO dele permitir o menu.
    const dataFiltrada = {
      admin: role === 'admin' || role === 'superadmin',
      dashboard: data.dashboard && permissoesDoPlano.includes("dashboard"),
      inventario: data.inventario && permissoesDoPlano.includes("inventario"),
      produtos: data.produtos && permissoesDoPlano.includes("produtos"),
      compras: data.compras && permissoesDoPlano.includes("compras"),
      comercial: data.comercial && permissoesDoPlano.includes("comercial"),
      servicos: data.servicos && permissoesDoPlano.includes("servicos"),
      buckman: data.buckman && permissoesDoPlano.includes("buckman")
    };

    res.json(dataFiltrada);
  } catch (e) {
    console.error("Erro ao buscar acessos:", e);
    res.status(500).json({ error: "Erro interno" });
  } finally {
    client.release();
  }
}