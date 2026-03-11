export function normalizePedido(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  return digits.replace(/^0+/, "") || "0";
}

export function extractPedidosFromText(text) {
  const source = String(text || "");
  if (!source) return [];

  const patterns = [
    /pedido(?:\(s\))?\s+de\s+compra\s*(?:n[º°.\- ]*)?\s*(\d{3,12})/gi,
    /pedido(?:\(s\))?\s*:\s*(\d{3,12})/gi,
    /pedido\s+ib\s*:\s*(\d{3,12})/gi,
    /seu\s+pedido\s+de\s+compra\s*(?:n[º°.\- ]*)?\s*(\d{3,12})/gi,
    /pedido\s*n[º°.\- ]*\s*(\d{3,12})/gi,
  ];

  const found = new Set();

  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(source)) !== null) {
      const pedido = normalizePedido(match[1]);
      if (pedido) found.add(pedido);
    }
  }

  return [...found];
}

export function buildObservationText(documentRow = {}) {
  return [
    documentRow.infcpl || "",
    documentRow.obscont_xtexto || "",
    documentRow.infadfisco || "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}