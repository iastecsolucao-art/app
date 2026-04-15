const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const DEFAULT_MENUS = [
  // INVENTÁRIO
  { modulo: 'inventario', label: 'Contagem', url: '/contagem' },
  { modulo: 'inventario', label: 'Upload', url: '/upload' },
  { modulo: 'inventario', label: 'Download', url: '/download' },
  { modulo: 'inventario', label: 'Relatórios', url: '/relatorios' },
  // PRODUTOS
  { modulo: 'produtos', label: 'Cadastro Produto', url: '/produtos' },
  { modulo: 'produtos', label: 'Lista de Produtos', url: '/listar_produtos' },
  // COMPRAS
  { modulo: 'compras', label: 'Nova Compra', url: '/compras' },
  { modulo: 'compras', label: 'Lista de Compras', url: '/listar_compras' },
  { modulo: 'compras', label: 'Entradas', url: '/entradas' },
  { modulo: 'compras', label: 'Estoque', url: '/estoque' },
  // COMERCIAL
  { modulo: 'comercial', label: 'Orçamentos', url: '/orcamento' },
  { modulo: 'comercial', label: 'Vendas', url: '/vendas' },
  // SERVICOS
  { modulo: 'servicos', label: '📅 Agendamento', url: '/agendamento' },
  { modulo: 'servicos', label: '⚙️ Serviços', url: '/servicos' },
  { modulo: 'servicos', label: '⚙️ Produtos', url: '/produtos' },
  { modulo: 'servicos', label: '👩‍⚕️ Profissionais', url: '/profissionais' },
  { modulo: 'servicos', label: '🕒 Horários dos Profissionais', url: '/profissionais-horarios' },
  { modulo: 'servicos', label: '👤 Clientes', url: '/clientes' },
  { modulo: 'servicos', label: '💳 Faturas', url: '/faturas' },
  { modulo: 'servicos', label: '📊 Dashboard', url: '/dashboard_servico' },
  { modulo: 'servicos', label: '📝 Completar Agendamentos', url: '/agendamentos/completar' },
  // BUCKMAN
  { modulo: 'buckman', label: 'Vendedores', url: '/buckman/vendedores' },
  { modulo: 'buckman', label: 'Calendário Loja', url: '/calendario_loja' },
  { modulo: 'buckman', label: 'Calendário', url: '/buckman/calendario' },
  { modulo: 'buckman', label: '🧾 NF-e (Importar XML)', url: '/buckman/nfe' },
  { modulo: 'buckman', label: '👥 Participantes', url: '/buckman/participantes' },
  { modulo: 'buckman', label: '🔄 De / Para ERP', url: '/buckman/participantes-erp-map' },
  { modulo: 'buckman', label: '📦 De / Para Itens ERP', url: '/buckman/item-erp-map' },
  { modulo: 'buckman', label: 'Relatório Semanal', url: '/relatorio_semanal_dinamico' },
  { modulo: 'buckman', label: 'Relatório Mensal por Vendedor', url: '/relatorio_mensal_vendedor_comissao' },
];

async function run() {
  const client = await pool.connect();
  try {
    console.log("Criando tabela saas_menu_links...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS saas_menu_links (
        id SERIAL PRIMARY KEY,
        modulo VARCHAR(50) NOT NULL,
        label VARCHAR(100) NOT NULL,
        url VARCHAR(255) NOT NULL,
        ordem INTEGER DEFAULT 0
      );
    `);

    // Limpar tabela pra evitar duplicações se rodado duas vezes (opcional, só no Seed)
    await client.query('TRUNCATE TABLE saas_menu_links RESTART IDENTITY');

    console.log("Inserindo sub-menus originais...");
    for (let i = 0; i < DEFAULT_MENUS.length; i++) {
        const item = DEFAULT_MENUS[i];
        await client.query(`
            INSERT INTO saas_menu_links (modulo, label, url, ordem)
            VALUES ($1, $2, $3, $4)
        `, [item.modulo, item.label, item.url, i]);
    }

    console.log("Sucesso: Menu Injetado no BD.");
  } catch (err) {
    console.error("Erro:", err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
