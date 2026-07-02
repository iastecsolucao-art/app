import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req, res) {
  // O endpoint aceita cron ou chamadas manuais (GET/POST)
  const client = await pool.connect();
  
  try {
    // 1. Pegar o Token de Acesso da TOTVS
    const tokenRes = await client.query(
      "SELECT token FROM acesso_api WHERE token IS NOT NULL ORDER BY id DESC LIMIT 1"
    );
    
    if (tokenRes.rowCount === 0) {
      throw new Error("Token não encontrado na tabela acesso_api");
    }
    const token = tokenRes.rows[0].token;

    // 2. Definir o período de busca (por padrão: últimos 2 dias para pegar atrasados)
    const { start, end } = req.query;
    
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));
    
    const startDate = start ? new Date(start) : twoDaysAgo;
    const endDate = end ? new Date(end) : now;

    // 3. Paginação da TOTVS
    let page = 1;
    let hasNext = true;
    let totalInvoicesProcessed = 0;
    
    const branchCodeList = [1,2,4,6,7,8,9,10,12,14,15,16,17,19,20,22,23,24,25];

    while (hasNext) {
      console.log(`Buscando TOTVS Invoices - Page ${page}...`);
      
      const body = {
        filter: {
          startIssueDate: startDate.toISOString(),
          endIssueDate: endDate.toISOString(),
          branchCodeList
        },
        operationType: "All",
        origin: "All",
        page,
        pageSize: 100,
        expand: "items"
      };

      const response = await fetch("https://www30.bhan.com.br:9443/api/totvsmoda/fiscal/v2/invoices/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Erro na API TOTVS: ${response.status} - ${txt}`);
      }

      const data = await response.json();
      
      const items = data.items || [];
      if (items.length === 0) {
        break; // não tem mais dados
      }

      // Processar os cupons da página
      for (const invoice of items) {
        const invoiceUid = [
          invoice.branchCode ?? '0',
          invoice.serialCode ?? '0',
          invoice.invoiceSequence ?? '0',
        ].join('-');

        const invoiceSequence = invoice.invoiceSequence;
        const branchCode = invoice.branchCode;
        const issueDate = invoice.issueDate;
        
        // Agrupar produtos por vendedor
        const sellerTotals = {};
        
        for (const item of (invoice.items || [])) {
          for (const product of (item.products || [])) {
            const dealer = product.dealerCode;
            if (!dealer) continue;
            
            if (!sellerTotals[dealer]) {
              sellerTotals[dealer] = {
                dealer_code: dealer,
                total_value: 0,
                quantity: 0
              };
            }
            
            sellerTotals[dealer].total_value += (product.netValue || 0);
            sellerTotals[dealer].quantity += (product.quantity || 0);
          }
        }
        
        // Inserir os totais agrupados na tabela vendas_comissao
        for (const dealer of Object.keys(sellerTotals)) {
          const seller = sellerTotals[dealer];
          
          await client.query(`
            INSERT INTO vendas_comissao 
              (invoice_uid, invoice_sequence, branch_code, issue_date, dealer_code, total_value, quantity)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (invoice_uid, dealer_code) DO UPDATE 
            SET 
              total_value = EXCLUDED.total_value,
              quantity = EXCLUDED.quantity,
              updated_at = CURRENT_TIMESTAMP
          `, [
            invoiceUid,
            invoiceSequence,
            branchCode,
            issueDate,
            seller.dealer_code,
            seller.total_value,
            seller.quantity
          ]);
        }
        
        totalInvoicesProcessed++;
      }
      
      hasNext = data.hasNext === true;
      page++;
    }

    res.status(200).json({
      message: "Sincronização concluída com sucesso!",
      invoicesProcessed: totalInvoicesProcessed
    });
    
  } catch (err) {
    console.error("Erro no sync TOTVS:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
