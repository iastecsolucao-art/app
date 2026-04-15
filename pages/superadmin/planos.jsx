import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { getSession, useSession } from 'next-auth/react';

export default function ConfigPlanosDashboard() {
  const { data: session } = useSession();
  const [planos, setPlanos] = useState([]);
  const [modulosDisponiveis, setModulosDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');

  useEffect(() => {
    fetchPlanos();
  }, []);

  const fetchPlanos = async () => {
    try {
      const [resPlanos, resModulos] = await Promise.all([
        fetch('/api/superadmin/planos'),
        fetch('/api/superadmin/modulos')
      ]);
      const dataPlanos = await resPlanos.json();
      const dataModulos = await resModulos.json();
      
      setPlanos(Array.isArray(dataPlanos) ? dataPlanos : []);
      setModulosDisponiveis(Array.isArray(dataModulos) ? dataModulos.map(m => m.nome) : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (index, field, value) => {
    const updated = [...planos];
    updated[index][field] = value;
    setPlanos(updated);
  };

  const handleMenuToggle = (index, menuTitle) => {
    const updated = [...planos];
    let menus = updated[index].menus_permitidos;
    if (menus.includes(menuTitle)) {
      menus = menus.filter(m => m !== menuTitle);
    } else {
      menus.push(menuTitle);
    }
    updated[index].menus_permitidos = menus;
    setPlanos(updated);
  };

  const handleSave = async (index) => {
    const plano = planos[index];
    if (!plano.nome || plano.nome.trim() === '') return alert("O plano precisa ter um Nome.");
    
    setSaving(plano.nome);
    try {
      const res = await fetch('/api/superadmin/planos', {
        method: plano.isNew ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: plano.nome,
          preco: parseFloat(plano.preco),
          descricao: plano.descricao,
          menus_permitidos: plano.menus_permitidos,
          max_usuarios: parseInt(plano.max_usuarios)
        })
      });
      if (res.ok) {
        alert(plano.isNew ? "Plano CRIADO com sucesso!" : "Plano alterado com sucesso!");
        fetchPlanos(); // Recarrega para remover a flag 'isNew'
      } else {
        alert("Erro ao salvar. Verifique se o nome do plano não está duplicado.");
      }
    } catch (e) {
      alert("Erro na requisição.");
    } finally {
      setSaving('');
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
        <title>SaaS - Editor de Limites dos Planos</title>
      </Head>

      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between border-b border-gray-200 pb-6">
          <div>
            <h2 className="text-blue-600 font-bold tracking-widest uppercase text-xs mb-1">
              Super Admin / Ajuste Dinâmico
            </h2>
            <h1 className="text-3xl font-extrabold text-gray-900">Configuração de Regras / Cotas dos Planos</h1>
          </div>
          <button 
            onClick={() => {
              const base = { nome: "", preco: 0, descricao: "", max_usuarios: 5, menus_permitidos: [], isNew: true };
              setPlanos([base, ...planos]);
            }}
            className="mt-4 md:mt-0 py-2.5 px-6 rounded-lg font-bold text-blue-600 bg-blue-100 hover:bg-blue-200 shadow-sm transition"
          >
            + Adicionar Novo Plano
          </button>
        </header>

        {loading ? (
          <div className="text-center py-20 text-gray-500 font-medium animate-pulse">Carregando Planos de Negócio...</div>
        ) : (
          <div className="space-y-6">
            {planos.map((plano, i) => (
              <div key={plano.nome} className="bg-white border text-left border-gray-200 rounded-xl overflow-hidden shadow-sm p-6 relative">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Lado Esquerdo - Info Textual */}
                  <div className="flex-1 space-y-4">
                    <div>
                      {plano.isNew ? (
                         <>
                           <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">Nome do Plano</label>
                           <input 
                              type="text" 
                              placeholder="Ex: Diamante"
                              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-bold text-xl focus:ring-2 focus:ring-blue-500 outline-none"
                              value={plano.nome} 
                              onChange={(e) => handleChange(i, 'nome', e.target.value)}
                           />
                         </>
                      ) : (
                         <h3 className="text-2xl font-bold text-gray-900">{plano.nome}</h3>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">Preço Mensal (R$)</label>
                      <input 
                        type="number" step="0.01"
                        className="w-full lg:w-48 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={plano.preco} 
                        onChange={(e) => handleChange(i, 'preco', e.target.value)}
                      />
                    </div>

                    <div>
                       <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">Nº Máximo de Usuários</label>
                      <input 
                        type="number" min="1" max="9999"
                        className="w-full lg:w-48 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={plano.max_usuarios} 
                        onChange={(e) => handleChange(i, 'max_usuarios', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">Descrição Promocional</label>
                      <textarea 
                        rows="2"
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={plano.descricao} 
                        onChange={(e) => handleChange(i, 'descricao', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Lado Direito - Matriz de Componentes */}
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-3">Telas (Menus) Liberadas neste Plano</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {modulosDisponiveis.map(m => {
                        const checked = plano.menus_permitidos.includes(m);
                        return (
                          <label key={m} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition select-none
                            ${checked ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}
                          `}>
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                              checked={checked}
                              onChange={() => handleMenuToggle(i, m)}
                            />
                            <span className={`text-sm font-medium capitalize ${checked ? 'text-blue-800' : 'text-gray-500'}`}>
                              {m}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                    
                    <div className="mt-8 flex justify-end">
                      <button 
                        onClick={() => handleSave(i)}
                        disabled={saving !== ''}
                        className="py-2.5 px-8 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition flex gap-2 items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         {saving === plano.nome ? 'Salvando...' : 'Atualizar Regras do ' + plano.nome}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const { getServerSession } = require('next-auth/next');
  const { authOptions } = require('../api/auth/[...nextauth]');
  const session = await getServerSession(context.req, context.res, authOptions);

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
