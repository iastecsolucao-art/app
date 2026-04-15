export const PLANOS = {
  Bronze: {
    nome: "Bronze",
    preco: 49.90,
    descricao: "Plano ideal para pequenos estoques.",
    menusPermitidos: ["dashboard", "produtos", "clientes", "pedidos"], // Exemplo
  },
  Prata: {
    nome: "Prata",
    preco: 99.90,
    descricao: "Completo para lojistas experientes.",
    menusPermitidos: ["dashboard", "produtos", "clientes", "pedidos", "relatorios"],
  },
  Ouro: {
    nome: "Ouro",
    preco: 149.90,
    descricao: "Todas as funcionalidades e máxima performance.",
    menusPermitidos: ["dashboard", "produtos", "clientes", "pedidos", "relatorios", "compras", "integracoes"],
  }
};

export const obterPlanoPorNome = (nome: string) => {
  return PLANOS[nome as keyof typeof PLANOS] || PLANOS.Bronze;
};
