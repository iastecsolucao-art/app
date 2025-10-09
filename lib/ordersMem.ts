// memória de processo (reinicia a cada deploy)
export type MemOrder = {
  referencia: string;
  email: string;
  nome?: string;
  descricao?: string;
  total?: number;            // em reais
  metodo?: "PIX"|"BOLETO"|"CARTAO"|string;
  status?: string;           // pending | approved | rejected...
  criado_em?: string;        // ISO
};

const store = new Map<string, MemOrder>();

export function saveOrder(o: MemOrder) {
  store.set(o.referencia, { ...o, criado_em: o.criado_em || new Date().toISOString() });
}

export function setStatus(ref: string, status: string) {
  const cur = store.get(ref);
  if (cur) store.set(ref, { ...cur, status });
}

export function getByRef(ref: string) {
  return store.get(ref);
}

export function listByEmail(email: string) {
  const e = email.trim().toLowerCase();
  return [...store.values()]
    .filter(o => o.email?.toLowerCase() === e)
    .sort((a,b) => (b.criado_em! > a.criado_em! ? 1 : -1));
}
