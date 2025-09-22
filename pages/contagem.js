import { useState, useEffect, useRef } from "react";

export default function ContagemSetor() {
  const [setores, setSetores] = useState([]);
  const [operadores, setOperadores] = useState([]);
  const [lojas, setLojas] = useState([]);

  const [nomeContagem, setNomeContagem] = useState("");
  const [setor, setSetor] = useState("");
  const [operador, setOperador] = useState("");
  const [loja, setLoja] = useState("");
  const [dataContagem, setDataContagem] = useState(new Date().toISOString().slice(0, 10));

  const [produtos, setProdutos] = useState([{ codigo_barra: "", descricao: "", quantidade: 1 }]);
  const [quantidadeLiberada, setQuantidadeLiberada] = useState(false);
  const [senha, setSenha] = useState("");
  const [totalSalvo, setTotalSalvo] = useState(0);
  const [totalPendente, setTotalPendente] = useState(0);
  const [ultimoId, setUltimoId] = useState(null);
  const inputRefs = useRef([]);

  useEffect(() => {
    fetch("/api/contagem_apoio/list")
      .then((res) => res.json())
      .then(({ setores, operadores, lojas }) => {
        setSetores(setores);
        setOperadores(operadores);
        setLojas(lojas);
      })
      .catch(console.error);
  }, []);

  const validarProduto = async (index) => {
    const codigo = produtos[index].codigo_barra.trim();
    if (!codigo) {
      alert("Digite um código de barras.");
      return;
    }

    try {
      const res = await fetch(`/api/produtos_contagem?codigo_barra=${encodeURIComponent(codigo)}`);
      if (!res.ok) {
        alert("Produto não encontrado.");
        setProdutos((prev) => {
          const newProdutos = [...prev];
          newProdutos[index].descricao = "❌ Produto não cadastrado";
          return newProdutos;
        });
        atualizarTotalPendente();
        return;
      }
      const data = await res.json();
      setProdutos((prev) => {
        const newProdutos = [...prev];
        newProdutos[index].descricao = data.descricao;
        newProdutos[index].quantidade = 1;
        return newProdutos;
      });

      if (index === produtos.length - 1) {
        addProduto();
      }

      atualizarTotalPendente();
    } catch (err) {
      console.error("Erro ao validar produto:", err);
      alert("Erro ao validar produto.");
    }
  };

  const atualizarTotalPendente = () => {
    setTimeout(() => {
      setTotalPendente(
        produtos.filter(
          (p) => p.codigo_barra && p.descricao && !p.descricao.includes("❌")
        ).length
      );
    }, 100);
  };

  const addProduto = () => {
    setProdutos((prev) => [...prev, { codigo_barra: "", descricao: "", quantidade: 1 }]);
    setTimeout(() => {
      inputRefs.current[inputRefs.current.length - 1]?.focus();
    }, 100);
  };

  const removeProduto = (index) => {
    setProdutos((prev) => prev.filter((_, i) => i !== index));
    setTimeout(() => {
      atualizarTotalPendente();
    }, 100);
  };

  const liberarQuantidade = () => {
    if (senha === "iastec") {
      setQuantidadeLiberada(true);
    } else {
      alert("Senha incorreta!");
    }
    setSenha("");
  };

  const salvarSetor = async () => {
    if (!nomeContagem.trim()) {
      alert("⚠️ Informe o nome da contagem.");
      return;
    }
    if (!setor || !operador || !loja) {
      alert("Preencha setor, operador e loja.");
      return;
    }
    try {
      const respostas = await Promise.all(
        produtos
          .filter((p) => p.codigo_barra && !p.descricao.includes("❌"))
          .map((p) =>
            fetch("/api/contagem_temp", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                nome_contagem: nomeContagem,
                setor,
                operador,
                loja,
                codigo: p.codigo_barra,
                descricao: p.descricao,
                quantidade: p.quantidade || 1,
                data: dataContagem,
                id_contagem: ultimoId ?? null,
              }),
            }).then((res) => res.json())
          )
      );

      const id = respostas.find((r) => r.id_contagem)?.id_contagem;
      if (id) setUltimoId(id);

      alert("Setor salvo com sucesso!");
      setTotalSalvo((prev) => prev + totalPendente);
      setTotalPendente(0);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar setor");
    }
  };

  const finalizarSetor = async () => {
    if (!nomeContagem.trim()) {
      alert("⚠️ Informe o nome da contagem.");
      return;
    }
    if (!setor || !operador || !loja) {
      alert("Preencha setor, operador e loja.");
      return;
    }
    try {
      const itensValidos = produtos
        .filter((p) => p.codigo_barra && !p.descricao.includes("❌"))
        .map((p) => ({
          usuario_email: operador,
          nome_contagem: nomeContagem,
          setor,
          codigo: p.codigo_barra,
          descricao: p.descricao,
          quantidade: p.quantidade || 1,
          loja,
          nome: "",
        }));

      if (itensValidos.length === 0) {
        alert("Nenhum item válido para finalizar.");
        return;
      }

      const resposta = await fetch("/api/contagem_finalizada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtos: itensValidos }),
      }).then((res) => res.json());

      if (resposta?.error) {
        alert("Erro: " + resposta.error);
        return;
      }

      alert("Inventário finalizado!");

      setNomeContagem("");
      setSetor("");
      setOperador("");
      setLoja("");
      setDataContagem(new Date().toISOString().slice(0, 10));
      setProdutos([{ codigo_barra: "", descricao: "", quantidade: 1 }]);
      setUltimoId(null);
      setTotalSalvo(0);
      setTotalPendente(0);
      setQuantidadeLiberada(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao finalizar setor");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-6 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">📦 Inventário por Setor</h1>

      <div className="bg-white shadow-md rounded-lg p-4 w-full max-w-xl">
        <label className="flex flex-col mb-4">
          <span className="mb-1 font-semibold text-gray-700">Nome da Contagem</span>
          <input
            type="text"
            value={nomeContagem}
            onChange={(e) => setNomeContagem(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Digite o nome da contagem"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <label className="flex flex-col">
            <span className="mb-1 font-semibold text-gray-700">Setor</span>
            <select
              value={setor}
              onChange={(e) => setSetor(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione o setor</option>
              {setores.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col">
            <span className="mb-1 font-semibold text-gray-700">Operador</span>
            <select
              value={operador}
              onChange={(e) => setOperador(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione o operador</option>
              {operadores.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col">
            <span className="mb-1 font-semibold text-gray-700">Loja</span>
            <select
              value={loja}
              onChange={(e) => setLoja(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione a loja</option>
              {lojas.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row justify-between mb-6 text-lg font-semibold text-gray-800">
          <span className="text-green-700 mb-2 sm:mb-0">✅ Total Salvo: {totalSalvo}</span>
          <span className="text-yellow-600">⏳ Pendente: {totalPendente}</span>
        </div>

        <div className="overflow-x-auto mb-6">
          <table className="w-full border border-gray-300 text-sm rounded-lg">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-3 py-2 text-left">Código de Barras</th>
                <th className="px-3 py-2 text-left">Descrição</th>
                {quantidadeLiberada && <th className="px-3 py-2 text-left w-24">Quantidade</th>}
                <th className="px-3 py-2 text-center w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p, idx) => (
                <tr key={idx} className="border-b border-gray-300">
                  <td>
                    <input
                      ref={(el) => (inputRefs.current[idx] = el)}
                      value={p.codigo_barra}
                      onChange={(e) => {
                        const newProdutos = [...produtos];
                        newProdutos[idx].codigo_barra = e.target.value;
                        setProdutos(newProdutos);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          validarProduto(idx);
                        }
                      }}
                      className="border border-gray-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Código de barras"
                      inputMode="numeric"
                    />
                  </td>
                  <td>
                    <input
                      value={p.descricao}
                      readOnly
                      className="border border-gray-300 rounded px-2 py-1 w-full bg-gray-100 text-gray-700"
                      placeholder="Descrição"
                    />
                  </td>
                  {quantidadeLiberada && (
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={p.quantidade}
                        onChange={(e) => {
                          const newProdutos = [...produtos];
                          newProdutos[idx].quantidade = e.target.value;
                          setProdutos(newProdutos);
                        }}
                        className="border border-gray-300 rounded px-2 py-1 w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  <td className="text-center flex justify-center gap-2 px-2 py-1">
                    <button
                      onClick={() => validarProduto(idx)}
                      className="bg-yellow-400 hover:bg-yellow-500 rounded px-3 py-1"
                      aria-label="Salvar item"
                      title="Salvar item"
                    >
                      💾
                    </button>
                    <button
                      onClick={() => removeProduto(idx)}
                      className="bg-red-500 hover:bg-red-600 text-white rounded px-3 py-1"
                      aria-label="Remover item"
                      title="Remover item"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!quantidadeLiberada && (
          <div className="flex flex-col sm:flex-row items-center gap-2 mb-6">
            <input
              type="password"
              placeholder="Senha para liberar quantidade"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={liberarQuantidade}
              className="bg-gray-700 text-white rounded px-6 py-2 hover:bg-gray-800"
            >
              🔓 Liberar Quantidade
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-end gap-4">
          <button
            onClick={salvarSetor}
            className="bg-yellow-400 hover:bg-yellow-500 rounded px-6 py-3 font-bold"
          >
            💾 Salvar Setor
          </button>
          <button
            onClick={finalizarSetor}
            className="bg-green-600 hover:bg-green-700 text-white rounded px-6 py-3 font-bold"
          >
            ✅ Finalizar Setor
          </button>
        </div>
      </div>
    </div>
  );
}