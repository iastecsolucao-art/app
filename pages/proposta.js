import { useEffect, useMemo, useState } from "react";

export default function GerarPropostaHtmlPdf() {
  const [clientes, setClientes] = useState([]);
  const [propostas, setPropostas] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [clienteId, setClienteId] = useState("");
  const [servicos, setServicos] = useState([
    { descricao: "", horas: "", valorHora: "", observacao: "", total: 0 },
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
      const empresaNormalizada = data?.empresa ?? data ?? null;
      setEmpresa(empresaNormalizada);
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

  const parseNumericInput = (value) => {
    if (typeof value === "number") {
      return { parsed: value, valid: Number.isFinite(value) };
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        return { parsed: 0, valid: false };
      }
      const cleaned = trimmed.replace(/[^0-9.,-]/g, "");
      if (!cleaned || cleaned === "-" || cleaned === "," || cleaned === ".") {
        return { parsed: 0, valid: false };
      }
      const hasComma = cleaned.includes(",");
      const normalizedString = hasComma
        ? cleaned.replace(/\./g, "").replace(/,/g, ".")
        : cleaned;
      const parsed = Number(normalizedString);
      return { parsed, valid: Number.isFinite(parsed) };
    }
    return { parsed: 0, valid: false };
  };

  const normalizeToNumber = (value) => {
    const { parsed, valid } = parseNumericInput(value);
    return valid ? parsed : 0;
  };

  const isValidNumberInput = (value) => parseNumericInput(value).valid;

  const formatCurrency = (value) => {
    const normalized = normalizeToNumber(value);
    return normalized.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatHours = (value) => {
    const normalized = normalizeToNumber(value);
    return normalized.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDateInputToLocale = (value) => {
    if (!value) return "";

    if (value instanceof Date) {
      return value.toLocaleDateString("pt-BR");
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return "";

      const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) {
        const [, yearStr, monthStr, dayStr] = isoMatch;
        const year = Number(yearStr);
        const month = Number(monthStr) - 1;
        const day = Number(dayStr);

        if (
          !Number.isNaN(year) &&
          !Number.isNaN(month) &&
          !Number.isNaN(day)
        ) {
          const date = new Date(year, month, day);
          return date.toLocaleDateString("pt-BR");
        }
      }

      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString("pt-BR");
      }
    }

    if (typeof value === "number") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString("pt-BR");
      }
    }

    return "";
  };

  const escapeHtml = (value = "") =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const formatMultilineHtml = (value = "") =>
    escapeHtml(value).replace(/\r?\n/g, "<br />");

  const handleServicoChange = (index, field, value) => {
    const newServicos = [...servicos];
    newServicos[index][field] = value;

    const horasNum = normalizeToNumber(newServicos[index].horas);
    const valorHoraNum = normalizeToNumber(newServicos[index].valorHora);
    const totalCalculado = Number((horasNum * valorHoraNum).toFixed(2));

    newServicos[index].total = totalCalculado;

    setServicos(newServicos);
  };

  const addServico = () => {
    setServicos([
      ...servicos,
      { descricao: "", horas: "", valorHora: "", observacao: "", total: 0 },
    ]);
  };

  const removeServico = (index) => {
    setServicos(servicos.filter((_, i) => i !== index));
  };

  const { totalQuantidade, totalValor } = useMemo(() => {
    return servicos.reduce(
      (acc, servico) => {
        const horasNum = normalizeToNumber(servico.horas);
        const valorHoraNum = normalizeToNumber(servico.valorHora);
        const totalServico = horasNum * valorHoraNum;

        return {
          totalQuantidade: acc.totalQuantidade + horasNum,
          totalValor: acc.totalValor + totalServico,
        };
      },
      { totalQuantidade: 0, totalValor: 0 }
    );
  }, [servicos]);

  const carregarEdicao = (proposta) => {
    setEditId(proposta.id);
    setClienteId(proposta.cliente_id);
    setValidade(proposta.validade.split("T")[0]);
    setObservacao(proposta.observacao || "");
    if (proposta.servicos && proposta.servicos.length > 0) {
      setServicos(
        proposta.servicos.map((s) => {
          const observacao =
            s.observacao ??
            s.observacao_servico ??
            s.observacaoServico ??
            "";

          return {
            descricao: s.descricao,
            horas: s.horas != null ? String(s.horas) : "",
            valorHora: s.valor_hora != null ? String(s.valor_hora) : "",
            observacao:
              observacao != null && observacao !== undefined
                ? String(observacao)
                : "",
            total: Number(s.total) || 0,
          };
        })
      );
    } else {
      setServicos([
        { descricao: "", horas: "", valorHora: "", observacao: "", total: 0 },
      ]);
    }
    setMessage(null);
  };

  const limparFormulario = () => {
    setEditId(null);
    setClienteId("");
    setServicos([
      { descricao: "", horas: "", valorHora: "", observacao: "", total: 0 },
    ]);
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
          !isValidNumberInput(s.horas) ||
          !isValidNumberInput(s.valorHora)
      )
    ) {
      setMessage("Preencha todos os campos dos serviços corretamente");
      return;
    }

    setLoading(true);

    try {
      const servicosPayload = servicos.map((s) => {
        const horasNum = normalizeToNumber(s.horas);
        const valorHoraNum = normalizeToNumber(s.valorHora);
        const totalServico = Number((horasNum * valorHoraNum).toFixed(2));

        return {
          descricao: s.descricao.trim(),
          horas: horasNum,
          valorHora: valorHoraNum,
          observacao: s.observacao ? s.observacao.trim() : "",
          total: totalServico,
        };
      });
      const totalQuantidadeNumber = Number(totalQuantidade.toFixed(2));
      const totalValorNumber = Number(totalValor.toFixed(2));

      const url = editId ? `/api/propostas/${editId}` : "/api/propostas";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteId,
          servicos: servicosPayload,
          validade,
          observacao: observacao.trim(),
          total_quantidade: totalQuantidadeNumber,
          total: totalValorNumber,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(
          editId ? "Proposta atualizada com sucesso!" : "Proposta criada com sucesso!"
        );
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

  const logoUrl = "/logo.png";

  const gerarHtmlProposta = () => {
    if (!cliente) {
      alert("Selecione um cliente para gerar a proposta.");
      return;
    }

    if (!empresa) {
      alert("Os dados da empresa ainda não foram carregados. Tente novamente em instantes.");
      return;
    }

    const telefoneEmpresa = [
      empresa.telefone,
      empresa.celular,
      empresa.fone,
      empresa.whatsapp,
    ]
      .map((valor) => (typeof valor === "string" ? valor.trim() : valor))
      .filter(Boolean)
      .filter((valor, indice, array) => array.indexOf(valor) === indice)
      .join(" / ");

    const enderecoEmpresa = (() => {
      if (empresa.endereco) return empresa.endereco;
      const partes = [
        empresa.logradouro,
        empresa.numero,
        empresa.complemento,
        empresa.bairro,
        empresa.cidade,
        empresa.estado,
        empresa.cep,
      ].filter(Boolean);
      return partes.join(", ");
    })();

    const servicosHtml = servicos
      .map((s) => {
        const horasNum = normalizeToNumber(s.horas);
        const valorHoraNum = normalizeToNumber(s.valorHora);
        const totalServico = Number((horasNum * valorHoraNum).toFixed(2));
        const descricao = formatMultilineHtml(s.descricao);
        const observacaoBruta =
          s.observacao ??
          s.observacao_servico ??
          s.observacaoServico ??
          "";
        const observacaoServico = observacaoBruta && observacaoBruta.trim()
          ? formatMultilineHtml(observacaoBruta.trim())
          : '<span class="observacao-vazia">—</span>';

        return `
        <tr>
          <td class="descricao-servico">${descricao}</td>
          <td class="observacao-servico">${observacaoServico}</td>
          <td class="right">${formatHours(horasNum)}</td>
          <td class="right">${formatCurrency(valorHoraNum)}</td>
          <td class="right">${formatCurrency(totalServico)}</td>
        </tr>
      `;
      })
      .join("");

    if (!validade) {
      alert("Informe a validade da proposta antes de exportar.");
      return;
    }

    const dataEmissao = formatDateInputToLocale(new Date());
    const validadeFormatada = formatDateInputToLocale(validade);
    const observacaoGeral = observacao.trim();

    const html = `
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>Proposta de Serviço</title>
      <style>
        :root {
          color-scheme: light;
          font-family: 'Poppins', Arial, sans-serif;
        }
        body {
          background-color: #f3f4f6;
          margin: 0;
          padding: 20px;
          color: #1f2937;
        }
        .proposta-container {
          max-width: 960px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          padding: 32px 36px;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
        }
        header {
          text-align: center;
          margin-bottom: 40px;
        }
        header img {
          max-width: 160px;
          margin-bottom: 12px;
        }
        header h1 {
          font-size: 28px;
          font-weight: 600;
          color: #1d4ed8;
          margin: 0 0 8px;
        }
        header .meta {
          font-size: 14px;
          color: #4b5563;
        }
        h2.section-title {
          font-size: 18px;
          font-weight: 600;
          color: #1d4ed8;
          border-bottom: 2px solid rgba(37, 99, 235, 0.2);
          padding-bottom: 6px;
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        section {
          margin-bottom: 28px;
        }
        section p {
          margin: 0;
          line-height: 1.6;
          font-size: 14px;
          color: #374151;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
          font-size: 14px;
        }
        th, td {
          border: 1px solid #e5e7eb;
          padding: 10px 14px;
        }
        td {
          vertical-align: top;
        }
        th {
          background-color: #eff6ff;
          color: #1d4ed8;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 12px;
        }
        tbody tr:nth-child(even) {
          background-color: #f9fafb;
        }
        th.right,
        td.right {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        th:nth-child(2),
        td.observacao-servico {
          width: 30%;
        }
        td.descricao-servico {
          font-weight: 600;
          color: #111827;
        }
        td.observacao-servico {
          font-size: 11px;
          color: #4b5563;
          line-height: 1.4;
        }
        .observacao-vazia {
          color: #9ca3af;
          font-style: italic;
        }
        tfoot td {
          background-color: #1d4ed8;
          color: #ffffff;
          font-weight: 600;
        }
        tfoot tr:first-child td {
          border-bottom: none;
        }
        tfoot tr:last-child td {
          border-top: none;
          font-size: 16px;
        }
        .observacao-geral {
          background: #f9fafb;
          border-left: 4px solid #1d4ed8;
          padding: 16px 20px;
          font-style: italic;
          color: #374151;
        }
        .assinatura {
          margin-top: 48px;
          display: flex;
          justify-content: space-between;
          gap: 24px;
          font-size: 13px;
          color: #4b5563;
        }
        .assinatura div {
          flex: 1;
        }
        .assinatura .label {
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: #1d4ed8;
          margin-bottom: 8px;
        }
        @page {
          size: A4;
          margin: 18mm;
        }
        @media print {
          body {
            background: #ffffff;
            padding: 0;
          }
          .proposta-container {
            box-shadow: none;
            border-radius: 0;
          }
          header {
            margin-bottom: 24px;
          }
        }
      </style>
    </head>
    <body>
      <div class="proposta-container">
        <header>
          <img src="${logoUrl}" alt="Logo da empresa" />
          <h1>Proposta de Serviço</h1>
          <p class="meta">Emitida em ${dataEmissao}${
            validadeFormatada ? ` • Validade até ${validadeFormatada}` : ""
          }</p>
        </header>

        <section>
          <h2 class="section-title">Dados da Empresa</h2>
          <p>
            ${escapeHtml(empresa?.nome || "")}
            <br />
            CNPJ: ${escapeHtml(empresa?.cnpj || "")}
            <br />
            ${escapeHtml(enderecoEmpresa || "")}
            <br />
            Telefone: ${escapeHtml(telefoneEmpresa || "")}
            <br />
            Email: ${escapeHtml(empresa?.email || "")}
          </p>
        </section>

        <section>
          <h2 class="section-title">Dados do Cliente</h2>
          <p>
            Nome: ${escapeHtml(cliente.nome || "")}
            <br />
            ${
              cliente.cpf_cnpj
                ? `CPF/CNPJ: ${escapeHtml(cliente.cpf_cnpj)}<br />`
                : ""
            }
            ${cliente.endereco ? `${escapeHtml(cliente.endereco)}<br />` : ""}
            Telefone: ${escapeHtml(cliente.telefone || "")}
            <br />
            Email: ${escapeHtml(cliente.email || "")}
          </p>
        </section>

        <section>
          <h2 class="section-title">Serviços</h2>
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Observação</th>
                <th class="right">Horas</th>
                <th class="right">Valor/Hora (R$)</th>
                <th class="right">Total (R$)</th>
              </tr>
            </thead>
            <tbody>
              ${servicosHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4">Quantidade total de horas</td>
                <td class="right">${formatHours(totalQuantidade)}</td>
              </tr>
              <tr>
                <td colspan="4">Valor total da proposta</td>
                <td class="right">${formatCurrency(totalValor)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        ${
          observacaoGeral
            ? `<section>
                <h2 class="section-title">Observações Gerais</h2>
                <div class="observacao-geral">${formatMultilineHtml(observacaoGeral)}</div>
              </section>`
            : ""
        }

        <section class="assinatura">
          <div>
            <div class="label">Representante</div>
            <div>${escapeHtml(empresa?.nome || "")}</div>
          </div>
          <div>
            <div class="label">Cliente</div>
            <div>${escapeHtml(cliente.nome || "")}</div>
          </div>
        </section>
      </div>
    </body>
    </html>
    `;

    const newWindow = window.open("", "_blank", "width=900,height=700");
    if (!newWindow) {
      alert("Não foi possível abrir a nova janela. Verifique o bloqueio de pop-ups do navegador.");
      return;
    }
    newWindow.document.write(html);
    newWindow.document.close();
    newWindow.focus();
    setTimeout(() => newWindow.print(), 300);
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
                    {formatCurrency(p.valor)}
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

              <label className="block mb-1 font-semibold">
                Observação do Serviço
                <textarea
                  value={s.observacao}
                  onChange={(e) => handleServicoChange(i, "observacao", e.target.value)}
                  disabled={loading}
                  className="w-full border rounded px-3 py-2 mt-1"
                  rows={2}
                  placeholder="Detalhes adicionais, escopo ou observações específicas"
                />
              </label>

              <p className="mt-2 font-semibold">Total: {formatCurrency(s.total)}</p>

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

          <div className="bg-gray-50 border rounded p-4 mb-4">
            <p className="font-semibold">Quantidade total de horas: {formatHours(totalQuantidade)}</p>
            <p className="font-semibold">Valor total dos serviços: {formatCurrency(totalValor)}</p>
          </div>

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
        Exportar / Imprimir Proposta (PDF)
      </button>
    </div>
  );
}