import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

function isRetailInvoice(invoice) {
  const opType = invoice.operationType;
  const opName = (invoice.operatioName || invoice.operationName || '').toUpperCase();
  if (invoice.documentType === 55 && opType === 'Output') return false;
  if (opType === 'Output') {
    if (opName.includes('TRANSFERENCIA') || opName.includes('REMESSA')) return false;
    return opName.includes('VENDA');
  }
  if (opType === 'Input') {
    return opName.includes('DEVOLUCAO DE VENDA');
  }
  return false;
}

async function getFreshToken(client) {
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = await pool.connect();
  try {
    const { startDate, endDate, branchCodeList } = req.body || {};
    
    // Default: janela de cota atual caso não venha no body
    const sDate = startDate || '2026-09-28';
    const eDate = endDate || '2026-11-01';
    const branches = Array.isArray(branchCodeList) && branchCodeList.length > 0 
      ? branchCodeList 
      : [1, 2, 4, 6, 7, 8, 9, 10, 12, 14, 15, 16, 17, 19, 20, 22, 23, 24, 25];

    let token;
    const tokenRes = await client.query("SELECT token FROM acesso_api WHERE token IS NOT NULL ORDER BY id DESC LIMIT 1");
    if (tokenRes.rowCount > 0) {
      token = tokenRes.rows[0].token;
    } else {
      token = await getFreshToken(client);
    }

    let page = 1;
    let hasNext = true;
    let totalInvoices = 0;
    const sellerTotals = [];

    while (hasNext) {
      const body = {
        filter: {
          startIssueDate: `${sDate}T00:00:00.000Z`,
          endIssueDate: `${eDate}T23:59:59.000Z`,
          branchCodeList: branches
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
        token = await getFreshToken(client);
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
        break;
      }

      const data = await response.json();
      const items = data.items || [];
      hasNext = data.hasNext || false;
      page++;

      for (const invoice of items) {
        if (!isRetailInvoice(invoice)) continue;

        const branchCode = invoice.branchCode;
        const serialCode = invoice.serialCode;
        const invoiceSequence = invoice.invoiceSequence;
        const invoiceUid = `${branchCode}-${serialCode}-${invoiceSequence}`;
        const issueDate = invoice.issueDate;
        const invoiceDate = invoice.invoiceDate || invoice.transactionDate || (invoice.issueDate ? invoice.issueDate.slice(0, 10) : null);
        const transactionDate = invoice.transactionDate || invoiceDate;
        const operationType = invoice.operationType;
        const invoiceStatus = invoice.invoiceStatus;

        const byDealer = {};
        if (invoice.items && invoice.items.length > 0) {
          for (const it of invoice.items) {
            if (it.products && it.products.length > 0) {
              for (const prod of it.products) {
                const dCode = String(prod.dealerCode || '50');
                const val = Number(prod.netValue || prod.grossValue || 0);
                const qty = Number(prod.quantity || 1);
                if (!byDealer[dCode]) byDealer[dCode] = { totalValue: 0, quantity: 0 };
                byDealer[dCode].totalValue += val;
                byDealer[dCode].quantity += qty;
              }
            } else {
              const dCode = '50';
              const val = Number(it.netValue || it.grossValue || 0);
              const qty = Number(it.quantity || 1);
              if (!byDealer[dCode]) byDealer[dCode] = { totalValue: 0, quantity: 0 };
              byDealer[dCode].totalValue += val;
              byDealer[dCode].quantity += qty;
            }
          }
        } else {
          const dCode = '50';
          byDealer[dCode] = {
            totalValue: Number(invoice.totalValue || 0),
            quantity: Number(invoice.quantity || 1)
          };
        }

        for (const dCode of Object.keys(byDealer)) {
          sellerTotals.push({
            invoiceUid,
            invoiceSequence,
            branchCode,
            issueDate,
            invoiceDate,
            transactionDate,
            dealerCode: dCode,
            totalValue: byDealer[dCode].totalValue,
            quantity: byDealer[dCode].quantity,
            operationType,
            invoiceStatus
          });
        }
        totalInvoices++;
      }
    }

    await client.query('BEGIN');
    await client.query(`
      DELETE FROM vendas_comissao 
      WHERE branch_code = ANY($1::int[]) 
        AND (
          (COALESCE(invoice_date, issue_date::date) >= $2::date AND COALESCE(invoice_date, issue_date::date) <= $3::date)
          OR (issue_date >= $2::date AND issue_date <= $3::timestamp)
        );
    `, [branches, sDate, `${eDate} 23:59:59`]);

    for (const row of sellerTotals) {
      await client.query(`
        INSERT INTO vendas_comissao (
          invoice_uid, invoice_sequence, branch_code, issue_date, invoice_date, transaction_date, dealer_code, total_value, quantity, operation_type, invoice_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (invoice_uid, dealer_code) DO UPDATE SET
          total_value = EXCLUDED.total_value,
          quantity = EXCLUDED.quantity,
          operation_type = EXCLUDED.operation_type,
          invoice_status = EXCLUDED.invoice_status,
          invoice_date = EXCLUDED.invoice_date,
          transaction_date = EXCLUDED.transaction_date,
          updated_at = CURRENT_TIMESTAMP;
      `, [
        row.invoiceUid, row.invoiceSequence, row.branchCode, row.issueDate,
        row.invoiceDate, row.transactionDate, row.dealerCode, row.totalValue, row.quantity, row.operationType, row.invoiceStatus]);
    }
    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: `Reprocessamento concluído com sucesso! ${totalInvoices} notas fiscais processadas.`,
      totalInvoices,
      totalRegistros: sellerTotals.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Erro no reprocessamento TOTVS:", error);
    return res.status(500).json({ error: error.message || 'Erro ao reprocessar dados' });
  } finally {
    client.release();
  }
}
