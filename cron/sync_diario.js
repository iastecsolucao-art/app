const { Client } = require('pg');
require('dotenv').config();

const DB = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_ShNT20JigrOY@ep-nameless-wave-adf8hxr7.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });

async function getFreshToken() {
  const TOTVS_AUTH_URL = 'https://www30.bhan.com.br:9443/api/totvsmoda/authorization/v2/token';
  const credentials = {
    grant_type: 'password',
    username: 'pdv_apiv2',
    password: '799906',
    client_id: 'buckmanapiv2',
    client_secret: '9662995871'
  };

  const body = new URLSearchParams(credentials).toString();
  const res = await fetch(TOTVS_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Falha ao obter token: ${res.status} - ${txt}`);
  }

  const data = await res.json();
  await client.query(
    "INSERT INTO acesso_api (token, data) VALUES ($1, CURRENT_TIMESTAMP);",
    [data.access_token]
  );
  return data.access_token;
}

async function run() {
  await client.connect();
  console.log("Iniciando sincronização diária de vendas TOTVS...");
  
  try {
    let token;
    const tokenRes = await client.query("SELECT token FROM acesso_api WHERE token IS NOT NULL ORDER BY id DESC LIMIT 1");
    if (tokenRes.rowCount > 0) {
      token = tokenRes.rows[0].token;
    } else {
      token = await getFreshToken();
    }

    const now = new Date();
    // Busca os últimos 3 dias para garantir que pegará todas as vendas
    const daysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
    
    let page = 1;
    let hasNext = true;
    let totalInvoicesProcessed = 0;
    
    const branchCodeList = [1,2,4,6,7,8,9,10,12,14,15,16,17,19,20,22,23,24,25];

    while (hasNext) {
      console.log(`Buscando TOTVS Invoices - Página ${page}...`);
      
      const body = {
        filter: {
          startIssueDate: daysAgo.toISOString(),
          endIssueDate: now.toISOString(),
          branchCodeList
        },
        operationType: "All",
        origin: "All",
        page,
        pageSize: 100,
        expand: "items"
      };

      let response = await fetch("https://www30.bhan.com.br:9443/api/totvsmoda/fiscal/v2/invoices/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (response.status === 401) {
        console.log("Token expirado. Renovando token TOTVS...");
        token = await getFreshToken();
        response = await fetch("https://www30.bhan.com.br:9443/api/totvsmoda/fiscal/v2/invoices/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });
      }

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Erro na API TOTVS: ${response.status} - ${txt}`);
      }

      const data = await response.json();
      const items = data.items || [];
      if (items.length === 0) break;

function isRetailInvoice(invoice) {
  if (invoice.invoiceStatus && invoice.invoiceStatus !== 'Issued' && invoice.invoiceStatus !== 'Authorized') {
    return false;
  }
  
  const opName = (invoice.operatioName || invoice.operationName || '').toUpperCase();
  const opType = invoice.operationType;
  
  if (opType === 'Output') {
    if (opName.includes('TRANSFERENCIA') || 
        opName.includes('REMESSA') || 
        opName.includes('DEVOLUCAO DE COMPRA') || 
        opName.includes('OUTRAS SAIDAS') ||
        opName.includes('BONIFICACAO') ||
        opName.includes('CONSERTO')) {
      return false;
    }
    return opName.includes('VENDA');
  }
  
  if (opType === 'Input') {
    return opName.includes('DEVOLUCAO DE VENDA');
  }
  
  return false;
}

      for (const invoice of items) {
        if (!isRetailInvoice(invoice)) {
          continue; // Pula notas fiscais que não são vendas/devoluções de varejo
        }

        const invoiceUid = [
          invoice.branchCode ?? '0',
          invoice.serialCode ?? '0',
          invoice.invoiceSequence ?? '0',
        ].join('-');

        const invoiceSequence = invoice.invoiceSequence;
        const branchCode = invoice.branchCode;
        const issueDate = invoice.issueDate;
        const operationType = invoice.operationType;
        const invoiceStatus = invoice.invoiceStatus;
        
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
        
        for (const dealer of Object.keys(sellerTotals)) {
          let finalDealer = dealer;
          const seller = sellerTotals[dealer];
          
          if (operationType === 'Input' && (dealer === '50' || dealer === 50) && invoice.personName) {
            try {
               const origRes = await client.query(`
                 SELECT vv.dealer_code
                 FROM vendas_comissao vv
                 JOIN fiscal_invoices fi ON fi.invoice_uid = vv.invoice_uid
                 WHERE fi.person_name = $1
                   AND vv.branch_code = $2
                   AND vv.operation_type = 'Output'
                   AND vv.total_value = $3
                   AND vv.issue_date <= $4
                 ORDER BY vv.issue_date DESC
                 LIMIT 1
               `, [invoice.personName, branchCode, seller.total_value, issueDate]);
               
               if (origRes.rowCount > 0 && origRes.rows[0].dealer_code !== '50' && origRes.rows[0].dealer_code !== 50) {
                 finalDealer = origRes.rows[0].dealer_code;
               }
            } catch (err) {
               // ignore
            }
          }
          
          await client.query(`
            INSERT INTO vendas_comissao 
              (invoice_uid, invoice_sequence, branch_code, issue_date, dealer_code, total_value, quantity, operation_type, invoice_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (invoice_uid, dealer_code) DO UPDATE 
            SET 
              total_value = EXCLUDED.total_value,
              quantity = EXCLUDED.quantity,
              operation_type = EXCLUDED.operation_type,
              invoice_status = EXCLUDED.invoice_status,
              updated_at = CURRENT_TIMESTAMP
          `, [
            invoiceUid,
            invoiceSequence,
            branchCode,
            issueDate,
            finalDealer,
            seller.total_value,
            seller.quantity,
            operationType,
            invoiceStatus
          ]);
        }
        totalInvoicesProcessed++;
      }
      
      hasNext = data.hasNext === true;
      page++;
    }

    console.log(`Sincronização concluída com sucesso! Total de cupons processados: ${totalInvoicesProcessed}`);
    
  } catch (err) {
    console.error("Erro no sync TOTVS:", err);
  } finally {
    await client.end();
  }
}

run();
