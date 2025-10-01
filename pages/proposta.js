import { useEffect, useState } from "react";

export default function GerarPropostaHtmlPdf() {
  const [clientes, setClientes] = useState([]);
  const [propostas, setPropostas] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [clienteId, setClienteId] = useState("");
  const [servicos, setServicos] = useState([
    { descricao: "", horas: "", valorHora: "", total: 0 },
  ]);
  const [validade, setValidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchEmpresa();
    fetchClientes();
    fetchPropostas();
  }, []);

  async function fetchEmpresa() {
    try {
      const res = await fetch("/api/empresa");
      if (!res.ok) throw new Error("Erro ao buscar dados da empresa");
      const data = await res.json();
      setEmpresa(data);
    } catch {
      setMessage("Erro ao carregar dados da empresa");
    }
  }

  async function fetchClientes() {
    try {
      const res = await fetch("/api/clientes");
      if (!res.ok) throw new Error("Erro ao buscar clientes");
      const data = await res.json();
      setClientes(data);
    } catch {
      setMessage("Erro ao carregar clientes");
    }
  }

  async function fetchPropostas() {
    try {
      const res = await fetch("/api/propostas?limit=10");
      if (!res.ok) throw new Error("Erro ao buscar propostas");
      const data = await res.json();
      setPropostas(data);
    } catch {
      setMessage("Erro ao carregar propostas");
    }
  }

  const handleServicoChange = (index, field, value) => {
    const newServicos = [...servicos];
    newServicos[index][field] = value;

    const horasNum = parseFloat(newServicos[index].horas);
    const valorHoraNum = parseFloat(newServicos[index].valorHora);

    newServicos[index].total =
      !isNaN(horasNum) && !isNaN(valorHoraNum) ? horasNum * valorHoraNum : 0;

    setServicos(newServicos);
  };

  const addServico = () => {
    setServicos([
      ...servicos,
      { descricao: "", horas: "", valorHora: "", total: 0 },
    ]);
  };

  const removeServico = (index) => {
    setServicos(servicos.filter((_, i) => i !== index));
  };

  const totalGeral = servicos.reduce((acc, s) => acc + s.total, 0);

  const carregarEdicao = (proposta) => {
    setEditId(proposta.id);
    setClienteId(proposta.cliente_id);
    setValidade(proposta.validade.split("T")[0]);
    setObservacao(proposta.observacao || "");
    if (proposta.servicos && proposta.servicos.length > 0) {
      setServicos(
        proposta.servicos.map((s) => ({
          descricao: s.descricao,
          horas: s.horas.toString(),
          valorHora: s.valor_hora.toString(),
          total: Number(s.total) || 0,
        }))
      );
    } else {
      setServicos([{ descricao: "", horas: "", valorHora: "", total: 0 }]);
    }
    setMessage(null);
  };

  const limparFormulario = () => {
    setEditId(null);
    setClienteId("");
    setServicos([{ descricao: "", horas: "", valorHora: "", total: 0 }]);
    setValidade("");
    setObservacao("");
    setMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!clienteId) {
      setMessage("Selecione um cliente");
      return;
    }
    if (!validade) {
      setMessage("Informe a validade da proposta");
      return;
    }
    if (
      servicos.some(
        (s) =>
          !s.descricao.trim() ||
          s.horas === "" ||
          s.valorHora === "" ||
          isNaN(parseFloat(s.horas)) ||
          isNaN(parseFloat(s.valorHora))
      )
    ) {
      setMessage("Preencha todos os campos dos serviços corretamente");
      return;
    }

    setLoading(true);

    try {
      const url = editId ? `/api/propostas/${editId}` : "/api/propostas";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteId,
          servicos,
          validade,
          observacao,
          total: totalGeral,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(editId ? "Proposta atualizada com sucesso!" : "Proposta criada com sucesso!");
        limparFormulario();
        fetchPropostas();
      } else {
        setMessage(data.error || "Erro ao salvar proposta");
      }
    } catch {
      setMessage("Erro de conexão ao salvar proposta");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Confirma exclusão da proposta?")) return;
    try {
      const res = await fetch(`/api/propostas/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir proposta");
      setMessage("Proposta excluída com sucesso");
      if (editId === id) limparFormulario();
      fetchPropostas();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const cliente = clientes.find((c) => c.id === clienteId);

  // URL do logo na pasta public
  const logoUrl = "/logo.png";

  // Função para gerar a proposta em nova aba HTML com logo da pasta public
  const gerarHtmlProposta = () => {
    if (!cliente) {
      alert("Selecione um cliente para gerar a proposta.");
      return;
    }

    const servicosHtml = servicos
      .map(
        (s) => `
      <tr>
        <td>${s.descricao}</td>
        <td style="text-align:right;">${parseFloat(s.horas).toFixed(2)}</td>
        <td style="text-align:right;">${parseFloat(s.valorHora).toFixed(2)}</td>
        <td style="text-align:right;">${s.total.toFixed(2)}</td>
      </tr>
    `
      )
      .join("");

    const html = `
    <html>
    <head>
      <title>Proposta de Serviço</title>
      <style>
        body {
          font-family: 'Poppins', Arial, sans-serif;
          color: #2c3e50;
          background-color: #f9fafb;
          margin: 20px;
        }
        header {
          text-align: center;
          margin-bottom: 40px;
        }
        header img {
          max-width: 160px;
          margin-bottom: 12px;
        }
        h1 {
          font-size: 26px;
          margin: 0;
          font-weight: 600;
          color: #1a73e8;
        }
        h2 {
          font-size: 18px;
          border-bottom: 2px solid #1a73e8;
          padding-bottom: 6px;
          margin-bottom: 16px;
          font-weight: 600;
          color: #34495e;
        }
        section {
          margin-bottom: 28px;
          background: #fff;
          padding: 16px 20px;
          border-radius: 8px;
          box-shadow: 0 1px 4px rgb(0 0 0 / 0.1);
        }
        p {
          line-height: 1.5;
          font-size: 14px;
          color: #4a4a4a;
          margin: 0;
        }
        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 8px;
          margin-top: 12px;
        }
        th, td {
          padding: 12px 15px;
          font-size: 14px;
          text-align: left;
          vertical-align: middle;
        }
        th {
          background-color: #e8f0fe;
          color: #1a73e8;
          font-weight: 600;
          border-radius: 6px 6px 0 0;
        }
        td {
          background-color: #ffffff;
          color: #2c3e50;
          border-bottom: 1px solid #e0e0e0;
        }
        td.right {
          text-align: right;
        }
        .total {
          font-weight: 700;
          font-size: 18px;
          text-align: right;
          margin-top: 20px;
          color: #1a73e8;
        }
        .observacao {
          font-style: italic;
          font-size: 13px;
          color: #7f8c8d;
          margin-top: 12px;
        }
      </style>
    </head>
    <body>
      <header>
        <img src="${logoUrl}" alt="Logo Iastec Solução" />
        <h1>Proposta de Serviço</h1>
      </header>

      <section>
        <h2>Dados da Empresa</h2>
        <p>
          ${empresa?.nome || ""}
          <br />
          CNPJ: ${empresa?.cnpj || ""}
          <br />
          ${empresa?.endereco || ""}
          <br />
          Telefone: ${empresa?.telefone || ""}
          <br />
          Email: ${empresa?.email || ""}
        </p>
      </section>

      <section>
        <h2>Dados do Cliente</h2>
        <p>
          Nome: ${cliente.nome}
          <br />
          ${cliente.cpf_cnpj ? `CPF/CNPJ: ${cliente.cpf_cnpj}<br />` : ""}
          ${cliente.endereco ? `${cliente.endereco}<br />` : ""}
          Telefone: ${cliente.telefone}
          <br />
          Email: ${cliente.email}
        </p>
      </section>

      <section>
        <h2>Serviços</h2>
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th style="text-align:right;">Horas</th>
              <th style="text-align:right;">Valor/hora (R$)</th>
              <th style="text-align:right;">Total (R$)</th>
            </tr>
          </thead>
          <tbody>
            ${servicosHtml}
          </tbody>
        </table>
        <p class="total">Total Geral: R$ ${totalGeral.toFixed(2)}</p>
      </section>

      ${
        observacao.trim()
          ? `<section class="observacao">
              <h2>Observação</h2>
              <p>${observacao}</p>
            </section>`
          : ""
      }
    </body>
    </html>
    `;

    const newWindow = window.open("", "_blank", "width=800,height=600");
    newWindow.document.write(html);
    newWindow.document.close();
    newWindow.focus();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow mt-8">
      <h1 className="text-2xl font-bold mb-6 text-center">
        {editId ? "Editar Proposta de Serviço" : "Gerar Proposta de Serviço"}
      </h1>

      {message && (
        <p
          className={`mb-4 ${
            message.includes("sucesso") ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}

      {/* Lista de propostas */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Últimas Propostas</h2>
        {propostas.length === 0 ? (
          <p>Nenhuma proposta encontrada.</p>
        ) : (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">Cliente</th>
                <th className="border border-gray-300 p-2 text-left">Resumo Serviços</th>
                <th className="border border-gray-300 p-2 text-right">Valor Total (R$)</th>
                <th className="border border-gray-300 p-2 text-center">Validade</th>
                <th className="border border-gray-300 p-2 text-center">Criado em</th>
                <th className="border border-gray-300 p-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {propostas.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-2">{p.cliente_nome || p.cliente_id}</td>
                  <td className="border border-gray-300 p-2">{p.servico}</td>
                  <td className="border border-gray-300 p-2 text-right">
                    {p.valor !== null && !isNaN(p.valor)
                      ? Number(p.valor).toFixed(2)
                      : "0.00"}
                  </td>
                  <td className="border border-gray-300 p-2 text-center">
                    {new Date(p.validade).toLocaleDateString()}
                  </td>
                  <td className="border border-gray-300 p-2 text-center">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="border border-gray-300 p-2 text-center space-x-2">
                    <button
                      onClick={() => carregarEdicao(p)}
                      className="text-blue-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-red-600 hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Formulário de criação/edição */}
      <form onSubmit={handleSubmit}>
        <label className="block mb-2 font-semibold">
          Cliente
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            disabled={loading}
            className="w-full border rounded px-3 py-2 mt-1"
            required
          >
            <option value="">Selecione um cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} - {c.telefone}
              </option>
            ))}
          </select>
        </label>

        <div className="mb-4">
          <h2 className="font-semibold mb-2">Serviços</h2>
          {servicos.map((s, i) => (
            <div key={i} className="mb-4 p-4 border rounded relative">
              <label className="block mb-1 font-semibold">
                Descrição
                <input
                  type="text"
                  value={s.descricao}
                  onChange={(e) => handleServicoChange(i, "descricao", e.target.value)}
                  disabled={loading}
                  className="w-full border rounded px-3 py-2 mt-1"
                  required
                />
              </label>

              <label className="block mb-1 font-semibold">
                Horas
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={s.horas}
                  onChange={(e) => handleServicoChange(i, "horas", e.target.value)}
                  disabled={loading}
                  className="w-full border rounded px-3 py-2 mt-1"
                  required
                />
              </label>

              <label className="block mb-1 font-semibold">
                Valor por Hora (R$)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={s.valorHora}
                  onChange={(e) => handleServicoChange(i, "valorHora", e.target.value)}
                  disabled={loading}
                  className="w-full border rounded px-3 py-2 mt-1"
                  required
                />
              </label>

              <p className="mt-2 font-semibold">
                Total: R$ {typeof s.total === "number" ? s.total.toFixed(2) : "0.00"}
              </p>

              {servicos.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeServico(i)}
                  disabled={loading}
                  className="absolute top-2 right-2 text-red-600 font-bold"
                  title="Remover serviço"
                >
                  &times;
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addServico}
            disabled={loading}
            className="mb-4 bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
          >
            + Adicionar Serviço
          </button>
        </div>

        <label className="block mb-2 font-semibold">
          Validade da Proposta
          <input
            type="date"
            value={validade}
            onChange={(e) => setValidade(e.target.value)}
            disabled={loading}
            className="w-full border rounded px-3 py-2 mt-1"
            required
          />
        </label>

        <label className="block mb-2 font-semibold">
          Observação
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            disabled={loading}
            className="w-full border rounded px-3 py-2 mt-1"
            rows={3}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {loading ? (editId ? "Salvando..." : "Enviando...") : editId ? "Salvar Alterações" : "Gerar Proposta"}
        </button>

        {editId && (
          <button
            type="button"
            onClick={limparFormulario}
            disabled={loading}
            className="mt-2 w-full bg-gray-400 text-white py-2 rounded hover:bg-gray-500"
          >
            Cancelar Edição
          </button>
        )}
      </form>

      <button
        onClick={gerarHtmlProposta}
        disabled={loading || servicos.length === 0}
        className="mt-6 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
      >
        Exportar Proposta em HTML
      </button>
    </div>
  );
}