import { useState, useEffect } from "react";

export default function Vendedores() {
  const [query, setQuery] = useState("");
  const [vendedores, setVendedores] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  const buscarVendedores = async (paginaAtual = 1) => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(
        `/api/buckman/vendedores?q=${encodeURIComponent(query)}&page=${paginaAtual}&limit=10`
      );
      if (!res.ok) throw new Error("Erro ao buscar vendedores");
      const data = await res.json();
      setVendedores(data.items);
      setPagina(data.currentPage);
      setTotalPaginas(data.totalPages);
    } catch (e) {
      setErro(e.message);
      setVendedores([]);
      setTotalPaginas(1);
      setPagina(1);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarVendedores(1);
  }, []);

  const handlePesquisar = () => {
    buscarVendedores(1);
  };

  const handlePaginaAnterior = () => {
    if (pagina > 1) buscarVendedores(pagina - 1);
  };

  const handlePaginaProxima = () => {
    if (pagina < totalPaginas) buscarVendedores(pagina + 1);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Vendedores</h1>

      <div className="mb-6 flex gap-3">
        <input
          type="text"
          placeholder="Pesquisar por nome..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border border-gray-300 p-3 rounded flex-grow focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => e.key === "Enter" && handlePesquisar()}
          aria-label="Pesquisar vendedores"
        />
        <button
          onClick={handlePesquisar}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded transition"
          disabled={carregando}
          aria-label="Botão pesquisar"
        >
          {carregando ? "Buscando..." : "Pesquisar"}
        </button>
      </div>

      {erro && (
        <p className="text-red-600 mb-4 text-center font-semibold" role="alert">
          Erro: {erro}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 text-left">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-3">ID</th>
              <th className="border border-gray-300 p-3">Nome</th>
              <th className="border border-gray-300 p-3">Código</th>
            </tr>
          </thead>
          <tbody>
            {vendedores.length === 0 ? (
              <tr>
                <td colSpan="3" className="p-6 text-center text-gray-500">
                  {carregando ? "Carregando dados..." : "Nenhum vendedor encontrado"}
                </td>
              </tr>
            ) : (
              vendedores.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50 transition">
                  <td className="border border-gray-300 p-3">{v.id}</td>
                  <td className="border border-gray-300 p-3">{v.seller_name}</td>
                  <td className="border border-gray-300 p-3">{v.seller_code}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-6">
        <button
          onClick={handlePaginaAnterior}
          disabled={pagina === 1 || carregando}
          className={`px-5 py-2 rounded ${
            pagina === 1 || carregando
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          } transition`}
          aria-label="Página anterior"
        >
          ← Anterior
        </button>

        <span className="font-medium">
          Página {pagina} de {totalPaginas}
        </span>

        <button
          onClick={handlePaginaProxima}
          disabled={pagina === totalPaginas || carregando}
          className={`px-5 py-2 rounded ${
            pagina === totalPaginas || carregando
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          } transition`}
          aria-label="Próxima página"
        >
          Próximo →
        </button>
      </div>
    </div>
  );
}