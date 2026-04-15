import React, { useState, useEffect, useRef } from "react";

// Mini parser de markdown para negrito e quebras de linha
function renderMarkdown(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\n)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part === "\n") return <br key={i} />;
    return part;
  });
}

function Mensagem({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold mr-2 shrink-0 mt-1">
          ✨
        </div>
      )}
      <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
        isUser
          ? "bg-blue-600 text-white rounded-br-sm"
          : "bg-gray-100 text-gray-800 rounded-bl-sm"
      }`}>
        {msg.loading
          ? <span className="flex gap-1 items-center text-gray-400"><span className="animate-bounce">●</span><span className="animate-bounce" style={{animationDelay:"0.1s"}}>●</span><span className="animate-bounce" style={{animationDelay:"0.2s"}}>●</span></span>
          : renderMarkdown(msg.text)}
        {msg.inlineData && msg.inlineData.mimeType?.startsWith('image/') && (
          <div className="mt-2 text-xs text-blue-200">📎 Imagem enviada</div>
        )}
      </div>
    </div>
  );
}

const STORAGE_KEY = "agent_chat_history";

export default function AgentChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [attachment, setAttachment] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  // Carrega histórico da sessão
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
      else setMessages([{
        role: "model",
        text: "Olá! 👋 Sou seu assistente IasTec. Posso consultar produtos, clientes, agendamentos, vendas e muito mais. Como posso ajudar?",
      }]);
    } catch { 
      setMessages([{ role: "model", text: "Olá! Como posso ajudar?" }]);
    }
  }, []);

  // Salva histórico quando muda (removendo inlineData para poupar LocalStorage/Quota)
  useEffect(() => {
    if (messages.length > 0) {
      try { 
        const stripped = messages.map(m => ({ ...m, inlineData: undefined }));
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stripped)); 
      } catch {}
    }
  }, [messages]);

  // Scroll para o final
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (!open && messages.length > 1) setUnread(n => n + 1);
  }, [messages]);

  // Foco no input ao abrir
  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [open]);

  async function enviar() {
    const texto = input.trim() || (attachment ? "Reconheça e processe o anexo incluído." : "");
    if (!texto && !attachment) return;
    if (loading) return;
    
    setInput("");
    const currAttach = attachment;
    setAttachment(null); // Limpa input e preview

    const newUserMsg = { role: "user", text: texto };
    if (currAttach) newUserMsg.inlineData = currAttach.inlineData;

    const novasMensagens = [...messages, newUserMsg];
    setMessages([...novasMensagens, { role: "model", loading: true, text: "" }]);
    setLoading(true);

    try {
      // Formata para o formato Gemini
      let geminiHistory = novasMensagens.map(m => {
        const parts = [{ text: m.text }];
        if (m.inlineData) parts.push({ inlineData: m.inlineData });
        return { role: m.role, parts };
      });

      if (geminiHistory.length > 0 && geminiHistory[0].role === "model") {
        geminiHistory = geminiHistory.slice(1);
      }

      const r = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: geminiHistory })
      });
      const data = await r.json();

      const reply = r.ok ? data.reply : (data.error || "Ocorreu um erro. Tente novamente.");
      setMessages([...novasMensagens, { role: "model", text: reply }]);
    } catch {
      setMessages([...novasMensagens, { role: "model", text: "Erro de conexão. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
  }

  function limpar() {
    sessionStorage.removeItem(STORAGE_KEY);
    setMessages([{ role: "model", text: "Conversa reiniciada! Como posso ajudar?" }]);
  }

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) return alert("Upload máximo: 4MB");
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachment({
        preview: f.type.startsWith("image/") ? ev.target.result : null,
        name: f.name,
        inlineData: { mimeType: f.type, data: ev.target.result.split(',')[1] }
      });
    };
    reader.readAsDataURL(f);
    e.target.value = null;
  }

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300"
        style={{
          background: open
            ? "linear-gradient(135deg, #ef4444, #dc2626)"
            : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
        }}
        title="Assistente IasTec"
      >
        {unread > 0 && !open && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
        <span className="text-2xl">{open ? "✕" : "✨"}</span>
      </button>

      {/* Janela do chat */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ height: "480px", background: "white" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">✨</div>
              <div>
                <div className="text-white font-bold text-sm">Assistente IasTec</div>
                <div className="text-blue-100 text-xs">Powered by Gemini</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={limpar} title="Limpar conversa"
                className="text-white/70 hover:text-white text-xs bg-white/10 px-2 py-1 rounded-lg transition">
                🗑
              </button>
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {messages.map((msg, i) => <Mensagem key={i} msg={msg} />)}
            <div ref={bottomRef} />
          </div>

          {/* Sugestões rápidas (só quando há 1 mensagem) */}
          {messages.length === 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {["📦 Listar produtos", "💰 Vendas do mês", "👤 Clientes"].map(s => (
                <button key={s} onClick={() => { setInput(s.split(" ").slice(1).join(" ")); }}
                  className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full hover:bg-blue-100 transition">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Anexo Preview */}
          {attachment && (
            <div className="px-3 pt-2 pb-1 bg-gray-50 flex items-center gap-2 border-t border-gray-100">
              {attachment.preview ? (
                <img src={attachment.preview} alt="Anexo" className="w-10 h-10 object-cover rounded shadow-sm border border-gray-200" />
              ) : (
                <div className="w-10 h-10 bg-blue-100 text-blue-500 rounded flex items-center justify-center text-xs font-bold">📄</div>
              )}
              <div className="flex-1 text-xs text-gray-600 truncate">{attachment.name}</div>
              <button onClick={() => setAttachment(null)} className="text-red-500 hover:text-red-700 bg-red-50 p-1 rounded">✕</button>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-100 p-3 flex gap-2 items-end">
            <input type="file" hidden ref={fileRef} onChange={handleFileChange} accept="image/*,application/pdf,audio/*" />
            
            <button
              onClick={() => fileRef.current?.click()}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition shrink-0 bg-gray-100 text-gray-500 hover:bg-gray-200"
              title="Anexar Arquivo"
            >
              📎
            </button>
            
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte ou anexe..."
              rows={1}
              disabled={loading}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
              style={{ maxHeight: "80px" }}
            />
            <button
              onClick={enviar}
              disabled={loading || (!input.trim() && !attachment)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition shrink-0 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-4 h-4">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
