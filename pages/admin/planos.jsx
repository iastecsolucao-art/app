import React, { useState } from 'react';
import Head from 'next/head';
import { getSession, useSession } from 'next-auth/react';
import { CheckCircleIcon, SparklesIcon, UsersIcon } from '@heroicons/react/24/solid';

export default function PlanosAdmin({ planosDb }) {
  const { data: session } = useSession();
  const [loadingPlan, setLoadingPlan] = useState('');

  const handleSubscribe = async (planoNome) => {
    setLoadingPlan(planoNome);
    try {
      const res = await fetch('/api/mp/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planoNome }),
      });
      const data = await res.json();
      
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert("Falha ao gerar link: " + (data.error || 'Erro desconhecido'));
      }
    } catch (e) {
      alert("Erro de conexão ao gerar link.");
    } finally {
      setLoadingPlan('');
    }
  };

  const userPlano = session?.user?.plano || 'Bronze';
  const status = session?.user?.assinatura_status || 'TRIAL';
  const isVencido = status === 'VENCIDO' || status === 'TRIAL';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-20 px-4 sm:px-6 lg:px-8 font-sans text-gray-900 pt-24">
      <Head>
        <title>SaaS - Gerenciar Planos</title>
      </Head>

      {/* Hero Section */}
      <div className="max-w-3xl mx-auto text-center mb-16 relative">
        <h2 className="text-sm font-bold tracking-wide uppercase text-blue-600 mb-3 flex items-center justify-center gap-2">
          <SparklesIcon className="w-5 h-5 text-blue-500" /> Planos de Assinatura
        </h2>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 mb-6">
          Escolha o pacote ideal para sua Empresa
        </h1>
        <p className="text-lg sm:text-xl text-gray-600">
          Você está atualmente no plano <span className="font-bold text-gray-900 bg-gray-200 px-2 py-1 rounded">{userPlano}</span>. 
          {isVencido ? (
            <span className="text-red-500 block sm:inline sm:ml-2 font-medium mt-2 sm:mt-0">Sua assinatura requer renovação.</span>
          ) : (
            <span className="text-green-600 block sm:inline sm:ml-2 font-medium mt-2 sm:mt-0">Sua conta está Ativa.</span>
          )}
        </p>
      </div>

      {/* Cards de Planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto w-full">
        {planosDb.map((plano) => {
          const isCurrent = userPlano === plano.nome && !isVencido;
          const isOuro = plano.nome === "Ouro";
          
          return (
            <div 
              key={plano.nome} 
              className={`relative bg-white rounded-2xl flex flex-col p-8 sm:p-10 border transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 
                ${isCurrent ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md scale-105 z-10' : 'border-gray-200'}`}
            >
              {isCurrent && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl rounded-tr-2xl uppercase tracking-wider">
                  Seu Plano Atual
                </div>
              )}
              
              <h3 className={`text-2xl font-extrabold mb-2 ${isOuro ? 'text-yellow-600' : 'text-gray-900'}`}>{plano.nome}</h3>
              <p className="text-gray-500 h-auto min-h-[48px] text-sm">{plano.descricao}</p>
              
              <div className="mt-4 mb-4">
                <span className="text-4xl font-extrabold text-gray-900">R$ {parseFloat(plano.preco).toFixed(2).replace('.',',')}</span>
                <span className="text-gray-500 font-medium">/mês</span>
              </div>

              <div className="flex items-center text-gray-700 bg-gray-100/80 p-3 rounded-lg mb-6 border border-gray-200/50">
                  <UsersIcon className="w-5 h-5 mr-3 text-blue-500 shrink-0" />
                  <span className="font-semibold text-sm">Até {plano.max_usuarios} Usuários</span>
              </div>
              
              <ul className="flex-1 space-y-4 mb-8 border-t border-gray-100 pt-6">
                {(plano.menus_permitidos || []).map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <CheckCircleIcon className={`w-5 h-5 mr-3 shrink-0 ${isOuro ? 'text-yellow-500' : 'text-blue-500'}`} />
                    <span className="text-gray-700 font-medium capitalize text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button
                onClick={() => handleSubscribe(plano.nome)}
                disabled={loadingPlan !== ''}
                className={`w-full py-3.5 rounded-xl font-bold transition-all duration-200 flex justify-center items-center gap-2
                  ${isCurrent ? 
                    'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' : 
                    isOuro ? 
                    'bg-yellow-500 hover:bg-yellow-400 text-white shadow-sm hover:shadow-md' :
                    'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                  }`}
              >
                {loadingPlan === plano.nome ? (
                  <span className="flex items-center gap-2">
                     <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     Processando...
                  </span>
                ) : isCurrent ? 'Plano Atual Ativo' : 'Assinar Plano'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  let planosDb = [];
  try {
    const res = await client.query('SELECT * FROM saas_planos ORDER BY preco ASC');
    planosDb = res.rows.map(r => ({ ...r, preco: parseFloat(r.preco) }));
  } finally {
    client.release();
  }

  return { props: { session: JSON.parse(JSON.stringify(session)), planosDb } };
}
