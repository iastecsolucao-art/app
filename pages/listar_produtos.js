import { useEffect, useState } from "react";

export default function ListaProdutos() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔎 Filtros por coluna
  const [filtroId, setFiltroId] = useState("");
  const [filtroCodigo, setFiltroCodigo] = useState("");
  const [filtroDescricao, setFiltroDescricao] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroCreated, setFiltroCreated] = useState("");
  const [filtroNome, setFiltroNome] = useState("");  // novo filtro p/ nome=empresa

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  // Ordenação
  const [ordenarColuna, setOrdenarColuna] = useState(null);
  const [ordemAsc, setOrdemAsc] = useState(true);

  useEffect(() => {
    async function fetchProdutos() {
      try {
        const res = await fetch("https://n8n.iastec.servicos.ws/webhook/listar_produtos");
        const data = await res.json();

        let lista = [];
        if (Array.isArray(data)) {
          lista = data.map(item => item.json ? item.json : item);
        } else {
          lista = data.json ? [data.json] : [data];
        }

        setProdutos(lista);
      } catch (err) {
        console.error("Erro ao buscar produtos:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProdutos();
  }, []);

  // 🔎 Função de filtro por coluna
  const produtosFiltrados = (produtos || []).filter((p) => {
    if (!p) return false;

    return (
      (filtroId ? String(p.id).toLowerCase().includes(filtroId.toLowerCase()) : true) &&
      (filtroCodigo ? (p.codigo_barra || "").toLowerCase().includes(filtroCodigo.toLowerCase()) : true) &&
      (filtroDescricao ? (p.descricao || "").toLowerCase().includes(filtroDescricao.toLowerCase()) : true) &&
      (filtroEmpresa ? String(p.empresa_id).includes(filtroEmpresa) : true) &&
      (filtroCreated ? 
        (p.created_at && new Date(p.created_at).toLocaleString().toLowerCase().includes(filtroCreated.toLowerCase())) 
        : true
      ) &&
      (filtroNome ? (p.nome || "").toLowerCase().includes(filtroNome.toLowerCase()) : true) // novo filtro
    );
  });

  // 🔹 Ordenação
  const produtosOrdenados = [...produtosFiltrados].sort((a, b) => {
    if (!ordenarColuna) return 0;
    const valA = a[ordenarColuna] || "";
    const valB = b[ordenarColuna] || "";
    if (valA < valB) return ordemAsc ? -1 : 1;
    if (valA > valB) return ordemAsc ? 1 : -1;
    return 0;
  });

  // 🔹 Paginação
  const totalPaginas = Math.ceil(produtosOrdenados.length / itensPorPagina);
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const produtosPaginados = produtosOrdenados.slice(inicio, fim);

  const mudarPagina = (novaPagina) => {
    if (novaPagina >= 1 && novaPagina <= totalPaginas) {
      setPaginaAtual(novaPagina);
    }
  };

  // Função para alternar a ordenação
  const handleOrdenar = (coluna) => {
    if (ordenarColuna === coluna) {
      setOrdemAsc(!ordemAsc);
    } else {
      setOrdenarColuna(coluna);
      setOrdemAsc(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-12">
      <h1 className="text-2xl font-bold mb-6">📋 Lista de Produtos</h1>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="overflow-x-auto w-full max-w-6xl">
          <table className="min-w-full bg-white shadow-md rounded overflow-hidden">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleOrdenar("id")}>
                  ID {ordenarColuna==="id" ? (ordemAsc ? "⬆️" : "⬇️") : ""}
                </th>
                <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleOrdenar("codigo_barra")}>
                  Código de Barras {ordenarColuna==="codigo_barra" ? (ordemAsc ? "⬆️" : "⬇️") : ""}
                </th>
                <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleOrdenar("descricao")}>
                  Descrição {ordenarColuna==="descricao" ? (ordemAsc ? "⬆️" : "⬇️") : ""}
                </th>
                <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleOrdenar("empresa_id")}>
                  Empresa ID {ordenarColuna==="empresa_id" ? (ordemAsc ? "⬆️" : "⬇️") : ""}
                </th>
                <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleOrdenar("nome")}>
                  Empresa Nome {ordenarColuna==="nome" ? (ordemAsc ? "⬆️" : "⬇️") : ""}
                </th>
                <th className="px-4 py-2 text-left cursor-pointer" onClick={() => handleOrdenar("created_at")}>
                  Criado em {ordenarColuna==="created_at" ? (ordemAsc ? "⬆️" : "⬇️") : ""}
                </th>
              </tr>
              {/* 🔎 Linha de filtros */}
              <tr className="bg-gray-200 text-black">
                <th><input className="p-1 w-full" placeholder="ID" value={filtroId} onChange={(e)=>setFiltroId(e.target.value)} /></th>
                <th><input className="p-1 w-full" placeholder="Código" value={filtroCodigo} onChange={(e)=>setFiltroCodigo(e.target.value)} /></th>
                <th><input className="p-1 w-full" placeholder="Descrição" value={filtroDescricao} onChange={(e)=>setFiltroDescricao(e.target.value)} /></th>
                <th><input className="p-1 w-full" placeholder="Empresa ID" value={filtroEmpresa} onChange={(e)=>setFiltroEmpresa(e.target.value)} /></th>
                <th><input className="p-1 w-full" placeholder="Empresa Nome" value={filtroNome} onChange={(e)=>setFiltroNome(e.target.value)} /></th>
                <th><input className="p-1 w-full" placeholder="Data" value={filtroCreated} onChange={(e)=>setFiltroCreated(e.target.value)} /></th>
              </tr>
            </thead>
            <tbody>
              {produtosPaginados.map((p, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-100">
                  <td className="px-4 py-2">{p?.id}</td>
                  <td className="px-4 py-2">{p?.codigo_barra}</td>
                  <td className="px-4 py-2">{p?.descricao}</td>
                  <td className="px-4 py-2">{p?.empresa_id}</td>
                  <td className="px-4 py-2">{p?.nome}</td> {/* nova coluna */}
                  <td className="px-4 py-2">
                    {p?.created_at ? new Date(p.created_at).toLocaleString() : ""}
                  </td>
                </tr>
              ))}
              {produtosPaginados.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-gray-500">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* 🔹 Paginação */}
          {totalPaginas > 1 && (
            <div className="flex justify-center items-center gap-4 mt-4">
              <button onClick={() => mudarPagina(paginaAtual - 1)} disabled={paginaAtual===1} className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50">⬅️ Anterior</button>
              <span>Página {paginaAtual} de {totalPaginas}</span>
              <button onClick={() => mudarPagina(paginaAtual + 1)} disabled={paginaAtual===totalPaginas} className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50">Próxima ➡️</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}