import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

export default function AgentConfig() {
  const { data: session } = useSession();
  const [prompt, setPrompt] = useState("");
  const [modelName, setModelName] = useState("gemini-1.5-flash");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/agent/config")
      .then((r) => r.json())
      .then((data) => {
        setPrompt(data.system_prompt || "");
        setModelName(data.model_name || "gemini-1.5-flash");
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar prompt:", err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/agent/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system_prompt: prompt, model_name: modelName }),
      });
      if (res.ok) {
        toast.success("Configurações do agente atualizadas!");
      } else {
        const error = await res.json();
        toast.error(error.error || "Erro ao salvar");
      }
    } catch (err) {
      toast.error("Erro na conexão");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Carregando configurações...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12 px-4 shadow-inner">
      <Head>
        <title>Configurar Agente IA - IasTec</title>
      </Head>

      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-10 text-white">
          <h1 className="text-3xl font-extrabold mb-2">✨ Configurar Agente IA</h1>
          <p className="text-blue-100 opacity-90 text-lg">
            Defina o modelo de inteligência e o comportamento do seu assistente automatizado.
          </p>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                Modelo da IA
              </label>
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-semibold text-gray-700 appearance-none outline-none"
              >
                <option value="gemini-flash-latest">Gemini Flash (Padrão, Super Rápido)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Avançado Experimental)</option>
              </select>
            </div>
            <div className="flex items-center">
              <p className="text-xs text-gray-500 italic bg-gray-100 p-4 rounded-xl border border-dashed border-gray-300">
                O modelo **Flash** é ideal para respostas rápidas e automações simples. 
                O **Pro** é recomendado para análise de dados complexos.
              </p>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
              Prompt de Sistema (Persona do Agente)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-80 p-5 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 resize-none font-mono text-gray-800"
              placeholder="Ex: Você é um assistente proativo que gerencia o estoque..."
            />
            <p className="mt-3 text-sm text-gray-500 leading-relaxed bg-blue-50 p-4 rounded-xl border border-blue-100">
              💡 **Dica:** Descreva as permissões do agente. Por exemplo: "Você pode listar produtos, verificar vendas e ajudar com agendamentos. Seja sempre educado e responda em português."
            </p>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <Link href="/" className="text-gray-500 hover:text-gray-800 font-semibold transition-colors">
              ← Voltar para Home
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transform transition hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar Configurações"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
