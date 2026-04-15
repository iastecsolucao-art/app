import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { getSession, useSession } from 'next-auth/react';

export default function MenuBuilderDashboard() {
  const { data: session } = useSession();
  const [links, setLinks] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModulo, setSelectedModulo] = useState("inventario");
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");

  useEffect(() => {
    fetchModulos();
    fetchLinks();
  }, [selectedModulo]);

  const fetchModulos = async () => {
    try {
      const res = await fetch('/api/superadmin/modulos');
      const data = await res.json();
      setModulos(Array.isArray(data) ? data.map(m => m.nome) : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/superadmin/menu-links?modulo=${selectedModulo}`);
      const data = await res.json();
      setLinks(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Erro ao buscar links", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newLabel || !newUrl) return alert("Preencha o Nome e a Rota (URL).");

    try {
      const res = await fetch('/api/superadmin/menu-links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modulo: selectedModulo,
          label: newLabel,
          url: newUrl,
          ordem: links.length
        })
      });
      if (res.ok) {
        setNewLabel("");
        setNewUrl("");
        fetchLinks();
      }
    } catch (err) {
      alert("Erro ao criar link.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Tem certeza que quer remover este atalho da Navbar?")) return;
    try {
      const res = await fetch(`/api/superadmin/menu-links?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchLinks();
      }
    } catch (err) {
      alert("Erro ao deletar.");
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
        <title>SaaS - Construtor de Menus</title>
      </Head>

      <div className="max-w-4xl mx-auto">
        <header className="mb-8 border-b border-gray-200 pb-6">
          <h2 className="text-blue-600 font-bold tracking-widest uppercase text-xs mb-1">
            Super Admin / Roteamento
          </h2>
          <h1 className="text-3xl font-extrabold text-gray-900">Construtor de Menus e Telas</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Vincule as páginas (URLs) a cada aba da Navbar. O que você configurar aqui será protegido pelas regras de limite de planos que você definiu.
          </p>
        </header>

        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Aba Esquerda - Seleção do Módulo */}
          <div className="w-full md:w-1/3 space-y-2">
            <h3 className="font-bold text-gray-700 tracking-wider text-sm mb-4 uppercase">Escolha o Menu</h3>
            {modulos.map(mod => (
              <button
                key={mod}
                onClick={() => setSelectedModulo(mod)}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${
                  selectedModulo === mod 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <span className="capitalize">{mod}</span>
              </button>
            ))}
            <button
                onClick={async () => {
                  const nome = prompt("Digite o nome do novo Módulo (ex: Marketing):");
                  if (!nome) return;
                  try {
                     const res = await fetch('/api/superadmin/modulos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nome })
                     });
                     if (res.ok) {
                        fetchModulos();
                     } else {
                        alert("Erro ao criar. Verifique se já não existe.");
                     }
                  } catch (e) {
                     alert("Erro interno.");
                  }
                }}
                className="w-full mt-4 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold py-3 px-4 rounded-lg transition"
            >
              + Novo Menu Principal
            </button>
          </div>

          {/* Aba Direita - Edição e Listagem */}
          <div className="w-full md:w-2/3">
            <div className="bg-white border text-left border-gray-200 rounded-xl overflow-hidden shadow-sm p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 capitalize">Vincular Rota em: {selectedModulo}</h3>
              <form onSubmit={handleCreate} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">Nome do Botão</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Novo Relatório"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={newLabel} 
                    onChange={(e) => setNewLabel(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">Destino (URL / Rota)</label>
                  <input 
                    type="text"
                    placeholder="Ex: /novo-relatorio"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={newUrl} 
                    onChange={(e) => setNewUrl(e.target.value)}
                  />
                </div>
                <button 
                  type="submit"
                  className="bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-blue-700 transition"
                >
                   Adicionar
                </button>
              </form>
            </div>

            <div className="bg-white border text-left border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-100 px-6 py-3 border-b flex justify-between font-bold text-gray-600 text-xs tracking-widest uppercase">
                <span>Páginas Vinculadas</span>
              </div>
              <ul className="divide-y divide-gray-100">
                {loading ? (
                   <li className="p-6 text-center text-gray-500 animate-pulse">Carregando ligações...</li>
                ) : links.length === 0 ? (
                   <li className="p-6 text-center text-gray-400">Nenhuma rota foi ligada a este menu ainda.</li>
                ) : (
                  links.map(link => (
                    <li key={link.id} className="p-4 px-6 flex justify-between items-center hover:bg-slate-50 transition">
                      <div>
                        <div className="font-bold text-gray-900">{link.label}</div>
                        <div className="text-gray-500 text-sm font-mono">{link.url}</div>
                      </div>
                      <button 
                        onClick={() => handleDelete(link.id)}
                        className="text-red-500 hover:text-red-700 font-bold text-sm bg-red-50 px-3 py-1 rounded"
                      >
                        Desvincular
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>

          </div>
        </div>
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
