import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

// Aumenta o limite de payload para permitir envio de imagens
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ===== Definição das ferramentas (Function Calling) =====
const tools = [
  {
    name: "listar_produtos",
    description: "Lista os produtos cadastrados na empresa. Retorna nome, preço, quantidade e categoria.",
    parameters: { type: "object", properties: {
      limite: { type: "number", description: "Quantidade máxima de produtos a retornar (padrão 20)" }
    }}
  },
  {
    name: "verificar_estoque",
    description: "Verifica o estoque por categoria de produto.",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "listar_clientes",
    description: "Lista os clientes cadastrados na empresa.",
    parameters: { type: "object", properties: {
      limite: { type: "number", description: "Quantidade máxima (padrão 20)" }
    }}
  },
  {
    name: "listar_agendamentos",
    description: "Lista os agendamentos da empresa. Pode filtrar por data.",
    parameters: { type: "object", properties: {
      data: { type: "string", description: "Data no formato YYYY-MM-DD para filtrar (opcional)" }
    }}
  },
  {
    name: "listar_vendas",
    description: "Mostra o resumo de vendas/faturamento. Retorna total pago, em aberto e total geral.",
    parameters: { type: "object", properties: {
      mes: { type: "string", description: "Mês no formato YYYY-MM para filtrar (opcional)" }
    }}
  },
  {
    name: "buscar_usuario",
    description: "Busca usuários da empresa pelo nome ou email.",
    parameters: { type: "object", properties: {
      termo: { type: "string", description: "Nome ou email para buscar" }
    }}
  },
  {
    name: "cadastrar_produtos",
    description: "Cadastra novos produtos em lote. Certifique-se de extrair a descricao e o preco.",
    parameters: { type: "object", properties: {
      produtos: {
        type: "array",
        items: {
          type: "object",
          properties: {
            descricao: { type: "string" },
            preco: { type: "number" },
            categoria: { type: "string" }
          },
          required: ["descricao", "preco"]
        }
      }
    }, required: ["produtos"]}
  },
  {
    name: "cadastrar_clientes",
    description: "Cadastra novos clientes em lote.",
    parameters: { type: "object", properties: {
      clientes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nome: { type: "string" },
            email: { type: "string" },
            telefone: { type: "string" }
          },
          required: ["nome"]
        }
      }
    }, required: ["clientes"]}
  }
];

// ===== Executor das ferramentas =====
async function executarFerramenta(nome: string, args: any, empresa_id: number, client: any) {
  switch (nome) {
    case "listar_produtos": {
      const limite = args.limite || 20;
      const r = await client.query(
        `SELECT descricao as nome, preco, categoria 
         FROM produto WHERE empresa_id=$1 ORDER BY descricao LIMIT $2`,
        [empresa_id, limite]
      );
      return r.rows;
    }
    case "verificar_estoque": {
      const r = await client.query(
        `SELECT categoria, COUNT(*)::int AS total_produtos
         FROM produto WHERE empresa_id=$1 GROUP BY categoria ORDER BY total_produtos DESC`,
        [empresa_id]
      );
      return r.rows;
    }
    case "listar_clientes": {
      const limite = args.limite || 20;
      const r = await client.query(
        `SELECT nome, email, telefone FROM clientes WHERE empresa_id=$1 ORDER BY nome LIMIT $2`,
        [empresa_id, limite]
      );
      return r.rows;
    }
    case "listar_agendamentos": {
      let query = `SELECT a.data, a.hora, a.status, p.nome as profissional, c.nome as cliente
                   FROM agendamentos a
                   LEFT JOIN profissionais p ON p.id = a.profissional_id
                   LEFT JOIN clientes c ON c.id = a.cliente_id
                   WHERE a.empresa_id=$1`;
      const params: any[] = [empresa_id];
      if (args.data) { query += ` AND a.data=$2`; params.push(args.data); }
      query += ` ORDER BY a.data, a.hora LIMIT 20`;
      const r = await client.query(query, params);
      return r.rows;
    }
    case "listar_vendas": {
      let query = `SELECT 
        COALESCE(SUM(CASE WHEN LOWER(status)='pago' THEN total ELSE 0 END),0) as total_pago,
        COALESCE(SUM(CASE WHEN LOWER(status)='aberto' THEN total ELSE 0 END),0) as total_aberto,
        COALESCE(SUM(total),0) as total_geral, COUNT(*) as qtd_faturas
        FROM faturas WHERE empresa_id=$1`;
      const params: any[] = [empresa_id];
      if (args.mes) { query += ` AND TO_CHAR(data,'YYYY-MM')=$2`; params.push(args.mes); }
      const r = await client.query(query, params);
      return r.rows[0];
    }
    case "buscar_usuario": {
      const r = await client.query(
        `SELECT nome, email, role FROM usuarios 
         WHERE empresa_id=$1 AND (nome ILIKE $2 OR email ILIKE $2) LIMIT 10`,
        [empresa_id, `%${args.termo}%`]
      );
      return r.rows;
    }
    case "cadastrar_produtos": {
      const { produtos } = args;
      if (!produtos || !Array.isArray(produtos) || produtos.length === 0) return { error: "Nenhum produto" };
      let inseridos = 0;
      for (const p of produtos) {
        if (!p.descricao || p.preco === undefined) continue;
        await client.query(
          `INSERT INTO produto (empresa_id, descricao, preco, categoria, ativo_loja) VALUES ($1, $2, $3, $4, true)`,
          [empresa_id, p.descricao, p.preco, p.categoria || "Geral"]
        );
        inseridos++;
      }
      return { sucesso: true, mensagem: `${inseridos} produtos inseridos com sucesso.` };
    }
    case "cadastrar_clientes": {
      const { clientes } = args;
      if (!clientes || !Array.isArray(clientes) || clientes.length === 0) return { error: "Nenhum cliente" };
      let inseridos = 0;
      for (const c of clientes) {
        if (!c.nome) continue;
        await client.query(
          `INSERT INTO clientes (empresa_id, nome, email, telefone) VALUES ($1, $2, $3, $4)`,
          [empresa_id, c.nome, c.email || "", c.telefone || ""]
        );
        inseridos++;
      }
      return { sucesso: true, mensagem: `${inseridos} clientes inseridos com sucesso.` };
    }
    default:
      return { erro: `Ferramenta '${nome}' desconhecida` };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "Não autenticado" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY não configurada no .env" });

  const client = await pool.connect();
  try {
    // Busca empresa_id do usuário
    const userRes = await client.query(
      "SELECT empresa_id FROM usuarios WHERE email=$1", [session.user.email]
    );
    const empresa_id = userRes.rows[0]?.empresa_id;

    // Busca system prompt e modelo configurado
    const configRes = await client.query(
      `SELECT system_prompt, model_name FROM agent_config 
       WHERE empresa_id=$1 OR empresa_id IS NULL 
       ORDER BY empresa_id NULLS LAST LIMIT 1`,
      [empresa_id]
    );
    const { system_prompt: systemPrompt, model_name: modelName } = configRes.rows[0] || {};
    const effectiveSystemPrompt = systemPrompt || "Você é um assistente de gestão do IasTec. Responda em português.";
    const effectiveModel = modelName || "gemini-flash-latest";

    const { messages } = req.body; // Array de { role: 'user'|'model', parts: [{ text }] }
    if (!messages?.length) return res.status(400).json({ error: "Mensagens obrigatórias" });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: effectiveModel,
      systemInstruction: effectiveSystemPrompt,
      tools: [{ functionDeclarations: tools }] as any,
    });

    const chat = model.startChat({ history: messages.slice(0, -1) });
    // Agora enviamos a array inteira de parts (pode conter text e inlineData)
    const userMessageParts = messages[messages.length - 1].parts;

    // Primeira resposta do modelo
    let result = await chat.sendMessage(userMessageParts);
    let response = result.response;

    // Loop de function calling
    let iterations = 0;
    while (response.functionCalls()?.length && iterations < 5) {
      iterations++;
      const fc = response.functionCalls()[0];
      const toolResult = await executarFerramenta(fc.name, fc.args, empresa_id, client);

      // Envia resultado da ferramenta de volta
      result = await chat.sendMessage([{
        functionResponse: { name: fc.name, response: { result: toolResult } }
      }] as any);
      response = result.response;
    }

    const text = response.text();
    return res.json({ reply: text });

  } catch (e: any) {
    console.error("agent/chat:", e);
    return res.status(500).json({ error: e.message || "Erro interno" });
  } finally {
    client.release();
  }
}
