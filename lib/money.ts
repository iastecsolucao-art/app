export const toCents = (v: number) => Math.round(Number(v || 0) * 100);
export const fromCents = (cents: number) => Number(cents || 0) / 100;
export const brl = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
