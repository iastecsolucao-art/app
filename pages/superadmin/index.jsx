import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getSession, useSession } from 'next-auth/react';
import { SparklesIcon, Cog6ToothIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

export default function SuperAdminDashboard() {
  const { data: session } = useSession();
  const [empresas, setEmpresas] = useState([]);
  const [planosDisponiveis, setPlanosDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ plano: '', status: '', validadeDias: 30 });

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    try {
      const [resEmpresas, resPlanos] = await Promise.all([
         fetch('/api/superadmin/empresas'),
         fetch('/api/superadmin/planos')
      ]);
      const dataEmp = await resEmpresas.json();
      const dataPlans = await resPlanos.json();
      setEmpresas(Array.isArray(dataEmp) ? dataEmp : []);
      setPlanosDisponiveis(Array.isArray(dataPlans) ? dataPlans : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openConfig = (emp) => {
    setSelectedEmpresa(emp);
    
    // Fallback inteligente caso a empresa nao tenha plano ainda
    const fallbackPlano = planosDisponiveis.length > 0 ? planosDisponiveis[0].nome : 'Bronze';
    setForm({ plano: emp.plano || fallbackPlano, status: emp.assinatura_status || 'TRIAL', validadeDias: 30 });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/superadmin/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId: selectedEmpresa.id,
          plano: form.plano,
          status: form.status,
          validadeDias: form.validadeDias
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchEmpresas();
      } else {
        alert("Falha ao salvar");
      }
    } catch (e) {
      alert("Erro na requisição");
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 py-10 px-4 sm:px-8 pt-24">
      <Head>
        <title>SaaS Master Control - Admin</title>
      </Head>

      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between border-b border-gray-200 pb-6">
          <div>
            <h2 className="text-blue-600 font-bold tracking-widest uppercase text-xs mb-1 flex items-center gap-1">
              <SparklesIcon className="w-4 h-4" /> Superadmin
            </h2>
            <h1 className="text-3xl font-extrabold text-gray-900">Controle de Assinaturas</h1>
          </div>
          <p className="text-gray-500 mt-4 md:mt-0 font-medium">
            Bem-vindo, <span className="text-blue-700 font-bold">{session.user.name}</span>
          </p>
        </header>

        {/* Nav de abas do SuperAdmin */}
        <nav className="flex flex-wrap gap-2 mb-8">
          <Link href="/superadmin" className="bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-lg">
            🏢 Assinaturas
          </Link>
          <Link href="/superadmin/planos" className="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold px-4 py-2 rounded-lg transition">
            💎 Planos & Limites
          </Link>
          <Link href="/superadmin/menu-builder" className="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold px-4 py-2 rounded-lg transition">
            🔗 Construtor de Menus
          </Link>
          <Link href="/superadmin/home-defaults" className="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold px-4 py-2 rounded-lg transition">
            🏠 Menu Inicial Padrão
          </Link>
        </nav>

        {loading ? (
          <div className="text-center py-20 text-gray-500 font-medium">Carregando empresas...</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">
                    <th className="px-6 py-4 font-semibold">ID</th>
                    <th className="px-6 py-4 font-semibold">Empresa / Cliente</th>
                    <th className="px-6 py-4 font-semibold">Plano</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Validade</th>
                    <th className="px-6 py-4 text-center font-semibold">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {empresas.map((emp) => (
                    <tr key={emp.id} className="hover:bg-blue-50/50 transition duration-150">
                      <td className="px-6 py-4 text-gray-500 font-medium">#{emp.id}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-800 text-base">{emp.nome}</p>
                        <p className="text-xs text-gray-400">{emp.cnpj || 'Sem CNPJ'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          emp.plano === 'Ouro' ? 'bg-yellow-100 text-yellow-800' :
                          emp.plano === 'Prata' ? 'bg-gray-200 text-gray-700' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {emp.plano || 'Bronze'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {emp.assinatura_status === 'ATIVO' ? (
                            <CheckCircleIcon className="w-5 h-5 text-green-500" />
                          ) : emp.assinatura_status === 'VENCIDO' ? (
                            <XCircleIcon className="w-5 h-5 text-red-500" />
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 ml-1 mr-1" />
                          )}
                          <span className={`font-semibold ${emp.assinatura_status==='ATIVO' ? 'text-green-600' : emp.assinatura_status==='VENCIDO' ? 'text-red-600' : 'text-yellow-600'}`}>
                            {emp.assinatura_status || 'TRIAL'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-medium">
                        {emp.assinatura_validade ? new Date(emp.assinatura_validade).toLocaleDateString('pt-BR') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => openConfig(emp)}
                          className="p-1.5 bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-600 rounded transition"
                          title="Configurar Acesso"
                        >
                          <Cog6ToothIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {empresas.length === 0 && (
                    <tr><td colSpan="6" className="text-center py-10 text-gray-500">Nenhuma empresa encontrada</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Clean */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white border border-gray-200 rounded-xl shadow-lg w-full max-w-md p-6 transform transition-all">
            <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedEmpresa?.nome}</h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">Modificar parâmetros de assinatura</p>

            <form onSubmit={handleSubmit} className="space-y-4 flex flex-col">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">Plano de Acesso</label>
                <select 
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition"
                  value={form.plano} onChange={(e) => setForm({...form, plano: e.target.value})}
                >
                  <option value="" disabled>Selecione um Plano...</option>
                  {planosDisponiveis.map(p => (
                    <option key={p.nome} value={p.nome}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">Status da Conta</label>
                <select 
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition"
                  value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}
                >
                  <option value="TRIAL">TRIAL (Teste)</option>
                  <option value="ATIVO">ATIVO (Liberado)</option>
                  <option value="VENCIDO">VENCIDO (Bloqueado)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">Renovar / Extender Validade (Dias)</label>
                <input 
                  type="number" min="0" max="3650"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition"
                  value={form.validadeDias} onChange={(e) => setForm({...form, validadeDias: e.target.value})}
                  placeholder="Ex: 30"
                />
                <p className="text-xs text-gray-400 mt-1.5">Deixe '0' se não quiser alterar a data atual.</p>
              </div>

              <div className="flex gap-3 mt-2 pt-5 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 px-4 rounded-lg font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 px-4 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);

  if (!session || !session.user?.email) {
    return { redirect: { destination: '/dashboard', permanent: false } };
  }

  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    const res = await client.query('SELECT admin FROM usuarios WHERE email = $1', [session.user.email]);
    if (res.rows.length === 0 || res.rows[0].admin !== true) {
      return { redirect: { destination: '/dashboard', permanent: false } };
    }
  } finally {
    client.release();
  }

  return { props: { session: JSON.parse(JSON.stringify(session)) } };
}
