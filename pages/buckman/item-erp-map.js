import { getSession, useSession } from "next-auth/react"; 

import { useEffect, useMemo, useState } from "react"; 

 

function onlyDigits(s) { 

  return (s ?? "").toString().replace(/\D/g, ""); 

} 

 

function formatCnpj(cnpj) { 

  const v = onlyDigits(cnpj); 

  if (v.length !== 14) return cnpj || ""; 

  return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"); 

} 

 

const STATUS_OPTIONS = ["PENDENTE", "MAPEADO", "ENVIADO", "ERRO", "IGNORADO"]; 

 

const initialForm = { 

  id: null, 

  participante_id: "", 

  sistema_destino: "ERP", 

 

  cnpj_fornecedor: "", 

  cprod_origem: "", 

  xprod_origem: "", 

  ncm_origem: "", 

  cfop_origem: "", 

  unidade_origem: "", 

 

  codigo_produto_erp: "", 

  sku_erp: "", 

  descricao_erp: "", 

  unidade_erp: "", 

  ncm_erp: "", 

 

  ativo: true, 

  observacao: "", 

  status_map: "PENDENTE", 

}; 

 

function statusBadgeStyle(status) { 

  const s = String(status || "").toUpperCase(); 

 

  if (s === "MAPEADO") { 

    return { 

      background: "#e8f7e8", 

      color: "#146c2e", 

      border: "1px solid #b7e1c0", 

    }; 

  } 

 

  if (s === "ENVIADO") { 

    return { 

      background: "#e8f0ff", 

      color: "#1d4ed8", 

      border: "1px solid #bfd3ff", 

    }; 

  } 

 

  if (s === "ERRO") { 

    return { 

      background: "#ffe5e5", 

      color: "#b00020", 

      border: "1px solid #f2b8b5", 

    }; 

  } 

 

  if (s === "IGNORADO") { 

    return { 

      background: "#f3f4f6", 

      color: "#374151", 

      border: "1px solid #d1d5db", 

    }; 

  } 

 

  return { 

    background: "#fff7d6", 

    color: "#8a6700", 

    border: "1px solid #f3d46b", 

  }; 

} 

 

function ItemErpMapPage({ empresaId }) { 

  const [rows, setRows] = useState([]); 

  const [msg, setMsg] = useState(""); 

  const [loading, setLoading] = useState(false); 

 

  const [filters, setFilters] = useState({ 

    q: "", 

    cnpj_fornecedor: "", 

    status_map: "", 

  }); 

 

  const [form, setForm] = useState(initialForm); 

 

  const selectedIndex = useMemo(() => { 

    if (!form.id) return -1; 

    return rows.findIndex((r) => r.id === form.id); 

  }, [rows, form.id]); 

 

  async function loadRows(customFilters) { 

    if (!empresaId) { 

      setMsg("Empresa não identificada. Selecione uma empresa antes de consultar os mapeamentos."); 

      setRows([]); 

      return; 

    } 

 

    try { 

      setLoading(true); 

      setMsg(""); 

 

      const f = customFilters || filters; 

      const params = new URLSearchParams(); 

 

      params.set("empresa_id", String(empresaId)); 

 

      if (f.q) params.set("q", f.q); 

      if (f.cnpj_fornecedor) params.set("cnpj_fornecedor", onlyDigits(f.cnpj_fornecedor)); 

      if (f.status_map) params.set("status_map", f.status_map); 

 

      const res = await fetch(`/api/item-erp-map?${params.toString()}`); 

      const data = await res.json().catch(() => ({})); 

 

      if (!res.ok) { 

        throw new Error(data?.error || data?.details || `Falha (${res.status})`); 

      } 

 

      const nextRows = Array.isArray(data.rows) ? data.rows : []; 

      setRows(nextRows); 

 

      if (form.id) { 

        const updated = nextRows.find((r) => r.id === form.id); 

        if (!updated) setForm(initialForm); 

      } 

    } catch (e) { 

      setMsg(`Erro ao carregar: ${e instanceof Error ? e.message : String(e)}`); 

      setRows([]); 

    } finally { 

      setLoading(false); 

    } 

  } 

 

  useEffect(() => { 

    if (empresaId) { 

      loadRows(); 

    } 

    // eslint-disable-next-line react-hooks/exhaustive-deps 

  }, [empresaId]); 

 

  function limparFormulario() { 

    setForm(initialForm); 

    setMsg(""); 

  } 

 

  function preencherFormulario(data) { 

    setForm({ 

      id: data.id ?? null, 

      participante_id: data.participante_id ?? "", 

      sistema_destino: data.sistema_destino || "ERP", 

 

      cnpj_fornecedor: data.cnpj_fornecedor || "", 

      cprod_origem: data.cprod_origem || "", 

      xprod_origem: data.xprod_origem || "", 

      ncm_origem: data.ncm_origem || "", 

      cfop_origem: data.cfop_origem || "", 

      unidade_origem: data.unidade_origem || "", 

 

      codigo_produto_erp: data.codigo_produto_erp || "", 

      sku_erp: data.sku_erp || "", 

      descricao_erp: data.descricao_erp || "", 

      unidade_erp: data.unidade_erp || "", 

      ncm_erp: data.ncm_erp || "", 

 

      ativo: data.ativo ?? true, 

      observacao: data.observacao || "", 

      status_map: data.status_map || "PENDENTE", 

    }); 

  } 

 

  async function editar(id) { 

    if (!empresaId) { 

      setMsg("Empresa não identificada."); 

      return; 

    } 

 

    try { 

      setMsg(""); 

      const params = new URLSearchParams(); 

      params.set("empresa_id", String(empresaId)); 

 

      const res = await fetch(`/api/item-erp-map/${id}?${params.toString()}`); 

      const data = await res.json().catch(() => ({})); 

 

      if (!res.ok) { 

        throw new Error(data?.error || data?.details || `Falha (${res.status})`); 

      } 

 

      preencherFormulario(data); 

    } catch (e) { 

      setMsg(`Erro ao carregar cadastro: ${e instanceof Error ? e.message : String(e)}`); 

    } 

  } 

 

  async function salvar() { 

    if (!empresaId) { 

      setMsg("Empresa não identificada."); 

      return; 

    } 

 

    try { 

      setMsg(""); 

 

      const payload = { 

        empresa_id: Number(empresaId), 

        participante_id: form.participante_id ? Number(form.participante_id) : null, 

        sistema_destino: form.sistema_destino || "ERP", 

 

        cnpj_fornecedor: onlyDigits(form.cnpj_fornecedor), 

        cprod_origem: form.cprod_origem, 

        xprod_origem: form.xprod_origem, 

        ncm_origem: form.ncm_origem, 

        cfop_origem: form.cfop_origem, 

        unidade_origem: form.unidade_origem, 

 

        codigo_produto_erp: form.codigo_produto_erp, 

        sku_erp: form.sku_erp, 

        descricao_erp: form.descricao_erp, 

        unidade_erp: form.unidade_erp, 

        ncm_erp: form.ncm_erp, 

 

        ativo: !!form.ativo, 

        observacao: form.observacao, 

        status_map: form.status_map, 

      }; 

 

      const isEdit = !!form.id; 

      const url = isEdit ? `/api/item-erp-map/${form.id}` : `/api/item-erp-map`; 

      const method = isEdit ? "PUT" : "POST"; 

 

      const res = await fetch(url, { 

        method, 

        headers: { "Content-Type": "application/json" }, 

        body: JSON.stringify(payload), 

      }); 

 

      const data = await res.json().catch(() => ({})); 

 

      if (!res.ok) { 

        throw new Error(data?.error || data?.details || `Falha (${res.status})`); 

      } 

 

      setMsg( 

        isEdit 

          ? "Mapeamento de item atualizado com sucesso." 

          : "Mapeamento de item criado com sucesso." 

      ); 

 

      preencherFormulario(data); 

      await loadRows(); 

    } catch (e) { 

      setMsg(`Erro ao salvar: ${e instanceof Error ? e.message : String(e)}`); 

    } 

  } 

 

  async function excluir(id) { 

    if (!id) return; 

 

    if (!empresaId) { 

      setMsg("Empresa não identificada."); 

      return; 

    } 

 

    const ok = window.confirm("Deseja realmente excluir este mapeamento de item?"); 

    if (!ok) return; 

 

    try { 

      setMsg(""); 

 

      const res = await fetch(`/api/item-erp-map/${id}`, { 

        method: "DELETE", 

        headers: { "Content-Type": "application/json" }, 

        body: JSON.stringify({ empresa_id: Number(empresaId) }), 

      }); 

 

      const data = await res.json().catch(() => ({})); 

 

      if (!res.ok) { 

        throw new Error(data?.error || data?.details || `Falha (${res.status})`); 

      } 

 

      setMsg("Mapeamento de item excluído com sucesso."); 

      limparFormulario(); 

      await loadRows(); 

    } catch (e) { 

      setMsg(`Erro ao excluir: ${e instanceof Error ? e.message : String(e)}`); 

    } 

  } 

 

  function limparFiltros() { 

    const cleared = { q: "", cnpj_fornecedor: "", status_map: "" }; 

    setFilters(cleared); 

    loadRows(cleared); 

  } 

 

  function irAnterior() { 

    if (selectedIndex <= 0) return; 

    editar(rows[selectedIndex - 1].id); 

  } 

 

  function irProximo() { 

    if (selectedIndex < 0 || selectedIndex >= rows.length - 1) return; 

    editar(rows[selectedIndex + 1].id); 

  } 

 

  if (!empresaId) { 

    return ( 

      <div style={pageStyle}> 

        <div style={pageHeaderStyle}> 

          <div> 

            <h1 style={{ margin: 0, fontSize: 28 }}>De / Para Itens ERP</h1> 

            <div style={{ color: "#64748b", marginTop: 4 }}> 

              Gestão de mapeamento de itens por empresa 

            </div> 

          </div> 

 

          <div style={empresaBadgeStyle}> 

            Empresa ID: <strong>-</strong> 

          </div> 

        </div> 

 

        <div style={messageBoxStyle}> 

          Empresa não identificada. Selecione uma empresa antes de consultar os mapeamentos. 

        </div> 

      </div> 

    ); 

  } 

 

  return ( 

    <div style={pageStyle}> 

      <div style={pageHeaderStyle}> 

        <div> 

          <h1 style={{ margin: 0, fontSize: 28 }}>De / Para Itens ERP</h1> 

          <div style={{ color: "#64748b", marginTop: 4 }}> 

            Gestão de mapeamento de itens por empresa 

          </div> 

        </div> 

 

        <div style={empresaBadgeStyle}> 

          Empresa ID: <strong>{empresaId}</strong> 

        </div> 

      </div> 

 

      {msg && ( 

        <div 

          style={{ 

            ...messageBoxStyle, 

            background: msg.toLowerCase().includes("erro") ? "#fff1f2" : "#f8fafc", 

            borderColor: msg.toLowerCase().includes("erro") ? "#fecdd3" : "#e2e8f0", 

            color: msg.toLowerCase().includes("erro") ? "#be123c" : "#334155", 

          }} 

        > 

          {msg} 

        </div> 

      )} 

 

      <div style={mainGridStyle}> 

        <div> 

          <div style={cardStyle}> 

            <div style={cardHeaderStyle}> 

              <h3 style={{ margin: 0 }}>Filtros</h3> 

            </div> 

 

            <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}> 

              <div style={{ flex: "1 1 260px" }}> 

                <label style={labelStyle}>Pesquisar</label> 

                <input 

                  value={filters.q} 

                  onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))} 

                  placeholder="Código origem, descrição, código ERP..." 

                  style={inputStyle} 

                /> 

              </div> 

 

              <div style={{ width: 180 }}> 

                <label style={labelStyle}>CNPJ fornecedor</label> 

                <input 

                  value={filters.cnpj_fornecedor} 

                  onChange={(e) => 

                    setFilters((prev) => ({ 

                      ...prev, 

                      cnpj_fornecedor: onlyDigits(e.target.value), 

                    })) 

                  } 

                  style={inputStyle} 

                /> 

              </div> 

 

              <div style={{ width: 170 }}> 

                <label style={labelStyle}>Status</label> 

                <select 

                  value={filters.status_map} 

                  onChange={(e) => setFilters((prev) => ({ ...prev, status_map: e.target.value }))} 

                  style={inputStyle} 

                > 

                  <option value="">Todos</option> 

                  {STATUS_OPTIONS.map((s) => ( 

                    <option key={s} value={s}> 

                      {s} 

                    </option> 

                  ))} 

                </select> 

              </div> 

 

              <button onClick={() => loadRows()} style={primaryButtonStyle}> 

                Pesquisar 

              </button> 

 

              <button 

                onClick={() => { 

                  limparFormulario(); 

                  setMsg(""); 

                }} 

                style={successButtonStyle} 

              > 

                Novo 

              </button> 

 

              <button onClick={limparFiltros} style={secondaryButtonStyle}> 

                Limpar 

              </button> 

            </div> 

          </div> 

 

          <div style={cardStyle}> 

            <div style={cardHeaderStyle}> 

              <div> 

                <h3 style={{ margin: 0 }}>Mapeamentos ({rows.length})</h3> 

                <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}> 

                  Lista de itens mapeados para a empresa 

                </div> 

              </div> 

            </div> 

 

            {loading ? ( 

              <div style={{ padding: 16 }}>Carregando...</div> 

            ) : rows.length === 0 ? ( 

              <div style={{ padding: 16 }}>Nenhum mapeamento de item encontrado.</div> 

            ) : ( 

              <div style={{ overflowX: "auto" }}> 

                <table style={tableStyle}> 

                  <thead> 

                    <tr> 

                      <th style={tableHead}>ID</th> 

                      <th style={tableHead}>CNPJ fornecedor</th> 

                      <th style={tableHead}>Cód. origem</th> 

                      <th style={tableHead}>Descrição origem</th> 

                      <th style={tableHead}>Cód. ERP</th> 

                      <th style={tableHead}>Descrição ERP</th> 

                      <th style={tableHead}>Status</th> 

                      <th style={tableHead}>Ações</th> 

                    </tr> 

                  </thead> 

                  <tbody> 

                    {rows.map((r) => ( 

                      <tr key={r.id} style={{ background: form.id === r.id ? "#f8fbff" : "#fff" }}> 

                        <td style={tableCell}>{r.id}</td> 

                        <td style={tableCell}>{formatCnpj(r.cnpj_fornecedor)}</td> 

                        <td style={tableCell}>{r.cprod_origem || "-"}</td> 

                        <td style={tableCell}>{r.xprod_origem || "-"}</td> 

                        <td style={tableCell}>{r.codigo_produto_erp || "-"}</td> 

                        <td style={tableCell}>{r.descricao_erp || "-"}</td> 

                        <td style={tableCell}> 

                          <span style={{ ...badgeBase, ...statusBadgeStyle(r.status_map) }}> 

                            {r.status_map || "-"} 

                          </span> 

                        </td> 

                        <td style={tableCell}> 

                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}> 

                            <button onClick={() => editar(r.id)} style={miniBtn}> 

                              Editar 

                            </button> 

                            <button onClick={() => excluir(r.id)} style={miniBtnDanger}> 

                              Excluir 

                            </button> 

                          </div> 

                        </td> 

                      </tr> 

                    ))} 

                  </tbody> 

                </table> 

              </div> 

            )} 

          </div> 

        </div> 

 

        <div style={detailCardStyle}> 

          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}> 

            {form.id ? "Alterar De / Para Item ERP" : "Novo De / Para Item ERP"} 

          </div> 

 

          <div 

            style={{ 

              display: "grid", 

              gridTemplateColumns: "120px 1fr", 

              gap: 10, 

              marginBottom: 12, 

            }} 

          > 

            <div> 

              <label style={labelStyle}>ID mapa</label> 

              <input value={form.id || ""} readOnly style={{ ...inputStyle, background: "#f1f5f9" }} /> 

            </div> 

            <div> 

              <label style={labelStyle}>Participante ID</label> 

              <input 

                value={form.participante_id} 

                onChange={(e) => setForm((prev) => ({ ...prev, participante_id: e.target.value }))} 

                style={inputStyle} 

              /> 

            </div> 

          </div> 

 

          <div style={sectionTitle}>Dados de origem</div> 

 

          <div style={formGrid2}> 

            <div> 

              <label style={labelStyle}>Sistema destino</label> 

              <input 

                value={form.sistema_destino} 

                onChange={(e) => setForm((prev) => ({ ...prev, sistema_destino: e.target.value }))} 

                style={inputStyle} 

              /> 

            </div> 

            <div> 

              <label style={labelStyle}>CNPJ fornecedor</label> 

              <input 

                value={form.cnpj_fornecedor} 

                onChange={(e) => 

                  setForm((prev) => ({ ...prev, cnpj_fornecedor: onlyDigits(e.target.value) })) 

                } 

                style={inputStyle} 

              /> 

            </div> 

          </div> 

 

          <div style={formGrid2}> 

            <div> 

              <label style={labelStyle}>Código origem</label> 

              <input 

                value={form.cprod_origem} 

                onChange={(e) => setForm((prev) => ({ ...prev, cprod_origem: e.target.value }))} 

                style={inputStyle} 

              /> 

            </div> 

            <div> 

              <label style={labelStyle}>Unidade origem</label> 

              <input 

                value={form.unidade_origem} 

                onChange={(e) => setForm((prev) => ({ ...prev, unidade_origem: e.target.value }))} 

                style={inputStyle} 

              /> 

            </div> 

          </div> 

 

          <div style={{ marginBottom: 10 }}> 

            <label style={labelStyle}>Descrição origem</label> 

            <input 

              value={form.xprod_origem} 

              onChange={(e) => setForm((prev) => ({ ...prev, xprod_origem: e.target.value }))} 

              style={inputStyle} 

            /> 

          </div> 

 

          <div style={formGrid2}> 

            <div> 

              <label style={labelStyle}>NCM origem</label> 

              <input 

                value={form.ncm_origem} 

                onChange={(e) => setForm((prev) => ({ ...prev, ncm_origem: e.target.value }))} 

                style={inputStyle} 

              /> 

            </div> 

            <div> 

              <label style={labelStyle}>CFOP origem</label> 

              <input 

                value={form.cfop_origem} 

                onChange={(e) => setForm((prev) => ({ ...prev, cfop_origem: e.target.value }))} 

                style={inputStyle} 

              /> 

            </div> 

          </div> 

 

          <div style={sectionTitle}>Dados ERP</div> 

 

          <div style={formGrid2}> 

            <div> 

              <label style={labelStyle}>Código produto ERP</label> 

              <input 

                value={form.codigo_produto_erp} 

                onChange={(e) => 

                  setForm((prev) => ({ ...prev, codigo_produto_erp: e.target.value })) 

                } 

                style={inputStyle} 

              /> 

            </div> 

            <div> 

              <label style={labelStyle}>SKU ERP</label> 

              <input 

                value={form.sku_erp} 

                onChange={(e) => setForm((prev) => ({ ...prev, sku_erp: e.target.value }))} 

                style={inputStyle} 

              /> 

            </div> 

          </div> 

 

          <div style={{ marginBottom: 10 }}> 

            <label style={labelStyle}>Descrição ERP</label> 

            <input 

              value={form.descricao_erp} 

              onChange={(e) => setForm((prev) => ({ ...prev, descricao_erp: e.target.value }))} 

              style={inputStyle} 

            /> 

          </div> 

 

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}> 

            <div> 

              <label style={labelStyle}>Unidade ERP</label> 

              <input 

                value={form.unidade_erp} 

                onChange={(e) => setForm((prev) => ({ ...prev, unidade_erp: e.target.value }))} 

                style={inputStyle} 

              /> 

            </div> 

            <div> 

              <label style={labelStyle}>NCM ERP</label> 

              <input 

                value={form.ncm_erp} 

                onChange={(e) => setForm((prev) => ({ ...prev, ncm_erp: e.target.value }))} 

                style={inputStyle} 

              /> 

            </div> 

            <div> 

              <label style={labelStyle}>Status mapa</label> 

              <select 

                value={form.status_map} 

                onChange={(e) => setForm((prev) => ({ ...prev, status_map: e.target.value }))} 

                style={inputStyle} 

              > 

                {STATUS_OPTIONS.map((s) => ( 

                  <option key={s} value={s}> 

                    {s} 

                  </option> 

                ))} 

              </select> 

            </div> 

          </div> 

 

          <div style={{ marginBottom: 10 }}> 

            <label style={labelStyle}>Observação</label> 

            <textarea 

              value={form.observacao} 

              onChange={(e) => setForm((prev) => ({ ...prev, observacao: e.target.value }))} 

              style={textAreaStyle} 

            /> 

          </div> 

 

          <div style={{ marginBottom: 16 }}> 

            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8 }}> 

              <input 

                type="checkbox" 

                checked={!!form.ativo} 

                onChange={(e) => setForm((prev) => ({ ...prev, ativo: e.target.checked }))} 

              /> 

              Ativo 

            </label> 

          </div> 

 

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}> 

            <button onClick={salvar} style={primaryButtonStyle}> 

              {form.id ? "Atualizar" : "Cadastrar"} 

            </button> 

            <button 

              onClick={() => excluir(form.id)} 

              disabled={!form.id} 

              style={{ 

                ...dangerButtonStyle, 

                opacity: form.id ? 1 : 0.5, 

                cursor: form.id ? "pointer" : "not-allowed", 

              }} 

            > 

              Excluir 

            </button> 

            <button onClick={limparFormulario} style={secondaryButtonStyle}> 

              Novo 

            </button> 

          </div> 

 

          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}> 

            <button 

              onClick={irAnterior} 

              disabled={selectedIndex <= 0} 

              style={{ 

                ...secondaryButtonStyle, 

                opacity: selectedIndex <= 0 ? 0.5 : 1, 

                cursor: selectedIndex <= 0 ? "not-allowed" : "pointer", 

              }} 

            > 

              ← Anterior 

            </button> 

 

            <button 

              onClick={irProximo} 

              disabled={selectedIndex < 0 || selectedIndex >= rows.length - 1} 

              style={{ 

                ...secondaryButtonStyle, 

                opacity: selectedIndex < 0 || selectedIndex >= rows.length - 1 ? 0.5 : 1, 

                cursor: 

                  selectedIndex < 0 || selectedIndex >= rows.length - 1 

                    ? "not-allowed" 

                    : "pointer", 

              }} 

            > 

              Próximo → 

            </button> 

          </div> 

        </div> 

      </div> 

    </div> 

  ); 

} 

 

export default function ItemErpMapRoute({ empresaId: empresaIdServer }) { 

  const { data: session, status } = useSession(); 

 

  const empresaId = 

    session?.user?.empresa_id ?? 

    session?.empresa_id ?? 

    empresaIdServer ?? 

    null; 

 

  if (status === "loading" && !empresaIdServer) { 

    return <div style={{ padding: 24 }}>Carregando...</div>; 

  } 

 

  return <ItemErpMapPage empresaId={empresaId} />; 

} 

 

export async function getServerSideProps(context) { 

  const session = await getSession(context); 

 

  const empresaId = 

    session?.user?.empresa_id ?? 

    session?.empresa_id ?? 

    null; 

 

  return { 

    props: { 

      empresaId: empresaId || null, 

    }, 

  }; 

} 

 

const pageStyle = { 

  padding: 20, 

  background: "#f8fafc", 

  minHeight: "100vh", 

}; 

 

const pageHeaderStyle = { 

  display: "flex", 

  justifyContent: "space-between", 

  alignItems: "flex-start", 

  gap: 16, 

  flexWrap: "wrap", 

  marginBottom: 16, 

}; 

 

const empresaBadgeStyle = { 

  background: "#eff6ff", 

  color: "#1d4ed8", 

  border: "1px solid #bfdbfe", 

  padding: "10px 14px", 

  borderRadius: 10, 

  fontSize: 14, 

  fontWeight: 600, 

}; 

 

const messageBoxStyle = { 

  marginBottom: 16, 

  padding: "14px 16px", 

  borderRadius: 10, 

  border: "1px solid #e2e8f0", 

  background: "#ffffff", 

  fontWeight: 600, 

}; 

 

const mainGridStyle = { 

  display: "grid", 

  gridTemplateColumns: "1.35fr 560px", 

  gap: 18, 

  alignItems: "start", 

}; 

 

const cardStyle = { 

  background: "#fff", 

  border: "1px solid #e2e8f0", 

  borderRadius: 16, 

  padding: 16, 

  marginBottom: 16, 

  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)", 

}; 

 

const detailCardStyle = { 

  background: "#fff", 

  border: "1px solid #e2e8f0", 

  borderRadius: 16, 

  padding: 16, 

  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)", 

}; 

 

const cardHeaderStyle = { 

  display: "flex", 

  justifyContent: "space-between", 

  alignItems: "center", 

  marginBottom: 14, 

}; 

 

const labelStyle = { 

  display: "block", 

  marginBottom: 6, 

  fontSize: 13, 

  fontWeight: 600, 

  color: "#334155", 

}; 

 

const inputStyle = { 

  width: "100%", 

  height: 40, 

  borderRadius: 10, 

  border: "1px solid #cbd5e1", 

  padding: "0 12px", 

  fontSize: 14, 

  outline: "none", 

  background: "#fff", 

}; 

 

const textAreaStyle = { 

  width: "100%", 

  minHeight: 90, 

  borderRadius: 10, 

  border: "1px solid #cbd5e1", 

  padding: 12, 

  fontSize: 14, 

  outline: "none", 

  resize: "vertical", 

  background: "#fff", 

}; 

 

const sectionTitle = { 

  marginTop: 8, 

  marginBottom: 12, 

  fontWeight: 700, 

  fontSize: 15, 

  color: "#0f172a", 

  borderBottom: "1px solid #e2e8f0", 

  paddingBottom: 8, 

}; 

 

const formGrid2 = { 

  display: "grid", 

  gridTemplateColumns: "1fr 1fr", 

  gap: 10, 

  marginBottom: 10, 

}; 

 

const primaryButtonStyle = { 

  height: 40, 

  borderRadius: 10, 

  border: "none", 

  background: "#2563eb", 

  color: "#fff", 

  fontWeight: 700, 

  padding: "0 16px", 

  cursor: "pointer", 

}; 

 

const successButtonStyle = { 

  height: 40, 

  borderRadius: 10, 

  border: "none", 

  background: "#16a34a", 

  color: "#fff", 

  fontWeight: 700, 

  padding: "0 16px", 

  cursor: "pointer", 

}; 

 

const secondaryButtonStyle = { 

  height: 40, 

  borderRadius: 10, 

  border: "1px solid #cbd5e1", 

  background: "#fff", 

  color: "#0f172a", 

  fontWeight: 700, 

  padding: "0 16px", 

  cursor: "pointer", 

}; 

 

const dangerButtonStyle = { 

  height: 40, 

  borderRadius: 10, 

  border: "none", 

  background: "#dc2626", 

  color: "#fff", 

  fontWeight: 700, 

  padding: "0 16px", 

  cursor: "pointer", 

}; 

 

const miniBtn = { 

  border: "none", 

  background: "#38bdf8", 

  color: "#fff", 

  padding: "8px 12px", 

  borderRadius: 8, 

  cursor: "pointer", 

  fontWeight: 700, 

}; 

 

const miniBtnDanger = { 

  border: "none", 

  background: "#ef4444", 

  color: "#fff", 

  padding: "8px 12px", 

  borderRadius: 8, 

  cursor: "pointer", 

  fontWeight: 700, 

}; 

 

const tableStyle = { 

  width: "100%", 

  borderCollapse: "collapse", 

  fontSize: 13, 

}; 

 

const tableHead = { 

  textAlign: "left", 

  background: "#f8fafc", 

  borderBottom: "1px solid #e2e8f0", 

  padding: "12px 10px", 

  color: "#334155", 

  fontWeight: 700, 

  whiteSpace: "nowrap", 

}; 

 

const tableCell = { 

  padding: "12px 10px", 

  borderBottom: "1px solid #f1f5f9", 

  verticalAlign: "top", 

}; 

 

const badgeBase = { 

  display: "inline-flex", 

  alignItems: "center", 

  justifyContent: "center", 

  borderRadius: 999, 

  padding: "6px 12px", 

  fontSize: 12, 

  fontWeight: 700, 

  whiteSpace: "nowrap", 

}; 