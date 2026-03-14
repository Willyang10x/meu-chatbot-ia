"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

type Mensagem = {
  autor: "usuario" | "ia";
  texto: string;
};

type Sessao = {
  id: string;
  titulo: string;
};

export default function Home() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [sessaoId, setSessaoId] = useState<string>("");
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [menuAberto, setMenuAberto] = useState(false);
  const fimDasMensagensRef = useRef<HTMLDivElement>(null);

  const rolarParaOFinal = () => {
    fimDasMensagensRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const carregarHistorico = async (id: string) => {
    try {
      const resposta = await fetch(`https://meu-chatbot-ia-01xd.onrender.com/chat/${id}`);
      const dados = await resposta.json();
      if (dados.mensagens) {
        setMensagens(dados.mensagens);
      } else {
        setMensagens([]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const carregarSessoes = async () => {
    try {
      const resposta = await fetch("https://meu-chatbot-ia-01xd.onrender.com/sessoes");
      const dados = await resposta.json();
      if (dados.sessoes) {
        setSessoes(dados.sessoes);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    let idSalvo = localStorage.getItem("chatbot_sessao_id");
    if (!idSalvo) {
      idSalvo = "sessao_" + crypto.randomUUID();
      localStorage.setItem("chatbot_sessao_id", idSalvo);
    }
    setSessaoId(idSalvo);
    carregarHistorico(idSalvo);
    carregarSessoes();
  }, []);

  useEffect(() => {
    rolarParaOFinal();
  }, [mensagens, carregando]);

  const iniciarNovaConversa = () => {
    const novoId = "sessao_" + crypto.randomUUID();
    localStorage.setItem("chatbot_sessao_id", novoId);
    setSessaoId(novoId);
    setMensagens([]);
    if (window.innerWidth < 768) setMenuAberto(false);
  };

  const selecionarSessao = (id: string) => {
    setSessaoId(id);
    localStorage.setItem("chatbot_sessao_id", id);
    carregarHistorico(id);
    if (window.innerWidth < 768) setMenuAberto(false);
  };

  const enviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessaoId) return;

    const novaMensagemUsuario: Mensagem = { autor: "usuario", texto: input };
    setMensagens((prev) => [...prev, novaMensagemUsuario]);
    setInput("");
    setCarregando(true);

    try {
      const resposta = await fetch("https://meu-chatbot-ia-01xd.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto: novaMensagemUsuario.texto,
          sessao_id: sessaoId,
        }),
      });

      const dados = await resposta.json();
      setMensagens((prev) => [...prev, { autor: "ia", texto: dados.resposta }]);
      carregarSessoes();
    } catch (error) {
      console.error(error);
      setMensagens((prev) => [...prev, { autor: "ia", texto: "Desculpe, ocorreu um erro de conexão." }]);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#212121] text-gray-100 font-sans overflow-hidden">
      {menuAberto && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden" 
          onClick={() => setMenuAberto(false)}
        />
      )}

      <aside className={`${menuAberto ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:relative z-50 h-full w-64 bg-[#171717] flex-shrink-0 flex flex-col transition-transform duration-300`}>
        <div className="p-3">
          <button 
            onClick={iniciarNovaConversa} 
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-transparent hover:bg-[#212121] rounded-lg transition-colors text-sm font-medium text-gray-200 border border-gray-700/50"
          >
            <div className="flex items-center gap-2">
              <div className="bg-white text-black rounded-full p-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </div>
              Nova Conversa
            </div>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1 mt-2">
          <h3 className="text-xs font-semibold text-gray-500 mb-2 px-2">Histórico</h3>
          {sessoes.map((sessao) => (
            <button
              key={sessao.id}
              onClick={() => selecionarSessao(sessao.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm truncate transition-colors ${sessaoId === sessao.id ? "bg-[#212121] text-white" : "text-gray-300 hover:bg-[#212121]"}`}
            >
              {sessao.titulo}
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full">
        <header className="md:hidden flex items-center justify-between p-3 border-b border-gray-700/50 bg-[#212121]">
          <button onClick={() => setMenuAberto(true)} className="p-2 text-gray-300 hover:text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-200">Chat IA</h1>
          <div className="w-8"></div>
        </header>

        <div className="flex-1 overflow-y-auto w-full flex flex-col items-center">
          {mensagens.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-300">Como posso ajudar hoje?</h2>
            </div>
          ) : (
            <div className="w-full max-w-3xl flex flex-col gap-6 px-4 py-8">
              {mensagens.map((msg, index) => (
                <div key={index} className={`flex w-full ${msg.autor === "usuario" ? "justify-end" : "justify-start"}`}>
                  {msg.autor === "ia" && (
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mr-4 flex-shrink-0 mt-1">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                      </svg>
                    </div>
                  )}
                  <div className={`max-w-[85%] md:max-w-[75%] px-5 py-3 ${msg.autor === "usuario" ? "bg-[#2f2f2f] text-gray-100 rounded-3xl" : "bg-transparent text-gray-100 px-0 rounded-none"}`}>
                    {msg.autor === "ia" ? (
                      <div className="prose prose-invert max-w-none text-gray-200 leading-relaxed">
                        <ReactMarkdown>{msg.texto}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.texto}</p>
                    )}
                  </div>
                </div>
              ))}
              {carregando && (
                <div className="flex w-full justify-start">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mr-4 flex-shrink-0 mt-1">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                    </svg>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400 py-3">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></span>
                  </div>
                </div>
              )}
              <div ref={fimDasMensagensRef} />
            </div>
          )}
        </div>

        <div className="w-full flex flex-col items-center bg-[#212121] px-4 pb-6 pt-2">
          <div className="w-full max-w-3xl relative">
            <form onSubmit={enviarMensagem} className="relative flex items-center w-full">
              <input
                type="text"
                className="w-full bg-[#2f2f2f] text-gray-100 rounded-3xl pl-5 pr-14 py-3.5 focus:outline-none focus:ring-1 focus:ring-gray-600 border border-gray-700 shadow-sm"
                placeholder="Envie uma mensagem..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={carregando}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white text-black rounded-full hover:bg-gray-200 transition-colors disabled:bg-[#424242] disabled:text-gray-500 flex items-center justify-center h-9 w-9"
                disabled={carregando || !input.trim()}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
            <p className="text-center text-xs text-gray-500 mt-3">
              A IA pode cometer erros. Considere verificar as informações importantes.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}