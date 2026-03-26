"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { createClient } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

type Mensagem = {
  autor: "usuario" | "ia";
  texto: string;
  imagem?: string;
};

type Sessao = {
  id: string;
  titulo: string;
};

export default function Home() {
  const [emailInput, setEmailInput] = useState("");
  const [senhaInput, setSenhaInput] = useState("");
  const [modoAuth, setModoAuth] = useState<"login" | "cadastro" | "esqueci">("login");
  const [erroAuth, setErroAuth] = useState("");
  const [msgSucesso, setMsgSucesso] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [usuarioLogado, setUsuarioLogado] = useState("");
  
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [sessaoId, setSessaoId] = useState<string>("");
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [menuAberto, setMenuAberto] = useState(false);
  const [copiadoIndex, setCopiadoIndex] = useState<number | null>(null);
  
  const [ouvindo, setOuvindo] = useState(false);
  const [falandoIndex, setFalandoIndex] = useState<number | null>(null);
  
  const [imagemBase64, setImagemBase64] = useState<string | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  
  const [persona, setPersona] = useState<string>("Padrão");
  
  const fimDasMensagensRef = useRef<HTMLDivElement>(null);
  const reconhecimentoRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sugestoes = [
    { icone: "⚛️", texto: "Explica a diferença entre useState e useEffect no React" },
    { icone: "🐍", texto: "Como faço um CRUD básico conectando Python e Supabase?" },
    { icone: "✉️", texto: "Escreve um email profissional para enviar o meu currículo" },
    { icone: "🎨", texto: "Gera uma imagem de um setup gamer cyberpunk com luzes de neon" }
  ];

  const rolarParaOFinal = () => {
    fimDasMensagensRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUsuarioLogado(session.user.email);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setUsuarioLogado(session.user.email);
      } else {
        setUsuarioLogado("");
      }
    });

    return () => {
      subscription.unsubscribe();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroAuth("");
    setMsgSucesso("");
    setLoadingAuth(true);

    try {
      if (modoAuth === "cadastro") {
        const { error } = await supabase.auth.signUp({
          email: emailInput,
          password: senhaInput,
        });
        if (error) throw error;
        setMsgSucesso("Conta criada com sucesso! A entrar...");
      } else if (modoAuth === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailInput,
          password: senhaInput,
        });
        if (error) throw error;
      } else if (modoAuth === "esqueci") {
        const { error } = await supabase.auth.resetPasswordForEmail(emailInput);
        if (error) throw error;
        setMsgSucesso("Instruções de recuperação enviadas para o email.");
      }
    } catch (error: any) {
      setErroAuth(error.message || "Ocorreu um erro na autenticação.");
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErroAuth("");
    setLoadingGoogle(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (error: any) {
      setErroAuth(error.message || "Erro ao conectar com o Google.");
      setLoadingGoogle(false);
    }
  };

  const fazerLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("chatbot_sessao_id");
    setUsuarioLogado("");
    setEmailInput("");
    setSenhaInput("");
    setSessoes([]);
    setMensagens([]);
    setSessaoId("");
    limparImagem();
  };

  const carregarHistorico = async (id: string) => {
    try {
      const resposta = await fetch("https://meu-chatbot-ia-01xd.onrender.com/chat/" + id);
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

  const carregarSessoes = async (email: string) => {
    try {
      const resposta = await fetch("https://meu-chatbot-ia-01xd.onrender.com/sessoes/" + email);
      const dados = await resposta.json();
      if (dados.sessoes) {
        setSessoes(dados.sessoes);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const apagarSessao = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const resposta = await fetch("https://meu-chatbot-ia-01xd.onrender.com/sessoes/" + id, {
        method: "DELETE",
      });

      if (resposta.ok) {
        setSessoes((prev) => prev.filter((s) => s.id !== id));
        if (sessaoId === id) {
          iniciarNovaConversa();
        }
      } else {
        alert("Erro: O servidor não permitiu apagar. Verifique o Render e a chave service_role.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const copiarTexto = (texto: string, index: number) => {
    const textoLimpo = texto
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?/g, ''))
      .replace(/`(.*?)`/g, '$1')
      .replace(/^#+\s+(.*)$/gm, '$1')
      .replace(/~~(.*?)~~/g, '$1');

    navigator.clipboard.writeText(textoLimpo);
    setCopiadoIndex(index);
    setTimeout(() => setCopiadoIndex(null), 2000);
  };

  const alternarMicrofone = () => {
    if (ouvindo) {
      reconhecimentoRef.current?.stop();
      setOuvindo(false);
      return;
    }

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert("O seu navegador não suporta reconhecimento de voz.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setOuvindo(true);
    
    recognition.onresult = (event: any) => {
      let transcricaoAtual = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcricaoAtual += event.results[i][0].transcript;
      }
      setInput(transcricaoAtual);
    };

    recognition.onerror = () => setOuvindo(false);
    recognition.onend = () => setOuvindo(false);

    reconhecimentoRef.current = recognition;
    recognition.start();
  };

  const alternarVoz = (texto: string, index: number) => {
    if (!window.speechSynthesis) {
      alert("O seu navegador não suporta síntese de voz.");
      return;
    }

    if (falandoIndex === index) {
      window.speechSynthesis.cancel();
      setFalandoIndex(null);
      return;
    }

    window.speechSynthesis.cancel();

    const textoLimpo = texto.replace(/[*#~`]/g, '');
    const utterance = new SpeechSynthesisUtterance(textoLimpo);
    utterance.lang = "pt-BR";
    utterance.rate = 1.1;

    utterance.onend = () => setFalandoIndex(null);
    utterance.onerror = () => setFalandoIndex(null);

    setFalandoIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const handleSelecionarImagem = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem é muito grande. O limite é 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64completo = reader.result as string;
      setImagemPreview(base64completo);
      const base64Puro = base64completo.split(',')[1];
      setImagemBase64(base64Puro);
    };
    reader.readAsDataURL(file);
  };

  const limparImagem = () => {
    setImagemBase64(null);
    setImagemPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    if (!usuarioLogado) return;
    
    let idSalvo = localStorage.getItem("chatbot_sessao_id");
    if (!idSalvo) {
      idSalvo = "sessao_" + crypto.randomUUID();
      localStorage.setItem("chatbot_sessao_id", idSalvo);
    }
    setSessaoId(idSalvo);
    carregarHistorico(idSalvo);
    carregarSessoes(usuarioLogado);
  }, [usuarioLogado]);

  useEffect(() => {
    rolarParaOFinal();
  }, [mensagens, carregando]);

  const iniciarNovaConversa = () => {
    const novoId = "sessao_" + crypto.randomUUID();
    localStorage.setItem("chatbot_sessao_id", novoId);
    setSessaoId(novoId);
    setMensagens([]);
    limparImagem();
    if (window.innerWidth < 768) setMenuAberto(false);
  };

  const selecionarSessao = (id: string) => {
    setSessaoId(id);
    localStorage.setItem("chatbot_sessao_id", id);
    carregarHistorico(id);
    limparImagem();
    if (window.innerWidth < 768) setMenuAberto(false);
  };

  const enviarMensagem = async (e?: React.FormEvent, textoDireto?: string) => {
    if (e) e.preventDefault();
    
    let textoMensagem = textoDireto || input;
    
    if (!textoMensagem.trim() && !imagemBase64) return;
    if (!sessaoId || !usuarioLogado) return;

    if (ouvindo) {
      reconhecimentoRef.current?.stop();
      setOuvindo(false);
    }

    if (!textoMensagem.trim() && imagemBase64) {
      textoMensagem = "Analise esta imagem.";
    }

    const novaMensagemUsuario: Mensagem = { 
      autor: "usuario", 
      texto: textoMensagem,
      imagem: imagemPreview || undefined
    };
    
    setMensagens((prev) => [...prev, novaMensagemUsuario]);
    setInput("");
    setCarregando(true);
    
    const imagemEnviada = imagemBase64;
    limparImagem();

    try {
      const resposta = await fetch("[https://meu-chatbot-ia-01xd.onrender.com/chat](https://meu-chatbot-ia-01xd.onrender.com/chat)", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto: textoMensagem,
          sessao_id: sessaoId,
          usuario_email: usuarioLogado,
          imagem: imagemEnviada,
          persona: persona
        }),
      });

      const dados = await resposta.json();
      setMensagens((prev) => [...prev, { autor: "ia", texto: dados.resposta }]);
      carregarSessoes(usuarioLogado);
    } catch (error) {
      console.error(error);
      setMensagens((prev) => [...prev, { autor: "ia", texto: "Desculpe, ocorreu um erro de conexão." }]);
    } finally {
      setCarregando(false);
    }
  };

  const regerarUltimaResposta = async () => {
    if (mensagens.length < 2 || carregando) return;

    const indexUltimoUser = mensagens.map(m => m.autor).lastIndexOf("usuario");
    if (indexUltimoUser === -1) return;

    const ultimaMsgUsuario = mensagens[indexUltimoUser];

    setMensagens((prev) => prev.slice(0, indexUltimoUser + 1));
    setCarregando(true);

    let imagemEnviada = undefined;
    if (ultimaMsgUsuario.imagem) {
      imagemEnviada = ultimaMsgUsuario.imagem.split(',')[1];
    }

    try {
      const resposta = await fetch("[https://meu-chatbot-ia-01xd.onrender.com/chat](https://meu-chatbot-ia-01xd.onrender.com/chat)", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto: ultimaMsgUsuario.texto,
          sessao_id: sessaoId,
          usuario_email: usuarioLogado,
          imagem: imagemEnviada,
          persona: persona
        }),
      });

      const dados = await resposta.json();
      setMensagens((prev) => [...prev, { autor: "ia", texto: dados.resposta }]);
      carregarSessoes(usuarioLogado);
    } catch (error) {
      console.error(error);
      setMensagens((prev) => [...prev, { autor: "ia", texto: "Desculpe, ocorreu um erro ao regerar a resposta." }]);
    } finally {
      setCarregando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      enviarMensagem();
    }
  };

  const exportarConversaPDF = () => {
    if (mensagens.length === 0) {
      alert("Não há mensagens para exportar.");
      return;
    }

    const doc = new jsPDF();
    const margemEsq = 15;
    let posicaoY = 20;
    const larguraMaxima = 180;

    const sessaoAtual = sessoes.find(s => s.id === sessaoId);
    const tituloArquivo = sessaoAtual ? sessaoAtual.titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'conversa';

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Histórico da Conversa - Chat IA", margemEsq, posicaoY);
    posicaoY += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Data: ${new Date().toLocaleString('pt-PT')}`, margemEsq, posicaoY);
    posicaoY += 5;
    
    doc.line(margemEsq, posicaoY, 195, posicaoY);
    posicaoY += 10;

    mensagens.forEach((msg) => {
      const autor = msg.autor === "usuario" ? "Você:" : "Inteligência Artificial:";
      
      let textoLimpo = msg.texto
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/!\[.*?\]\(.*?\)/g, "[Imagem Gerada Aqui]");

      doc.setFont("helvetica", "bold");
      
      if (posicaoY > 270) {
        doc.addPage();
        posicaoY = 20;
      }
      
      doc.text(autor, margemEsq, posicaoY);
      posicaoY += 6;

      doc.setFont("helvetica", "normal");
      const linhasTexto = doc.splitTextToSize(textoLimpo, larguraMaxima);
      
      for (let i = 0; i < linhasTexto.length; i++) {
        if (posicaoY > 280) {
          doc.addPage();
          posicaoY = 20;
        }
        doc.text(linhasTexto[i], margemEsq, posicaoY);
        posicaoY += 6;
      }
      
      posicaoY += 8;
    });

    doc.save(`chat_${tituloArquivo}.pdf`);
  };

  if (!usuarioLogado) {
    return (
      <div className="flex flex-col h-screen bg-[#212121] text-gray-100 font-sans items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#2f2f2f] p-8 rounded-2xl shadow-xl border border-gray-700/50">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">
            {modoAuth === "login" ? "Bem-vindo de volta" : modoAuth === "cadastro" ? "Criar Conta" : "Recuperar Senha"}
          </h2>
          <p className="text-gray-400 text-center mb-6 text-sm">
            {modoAuth === "login" ? "Insira os seus dados para entrar" : modoAuth === "cadastro" ? "Registe-se para aceder ao chat" : "Enviaremos um link para o seu email"}
          </p>

          {erroAuth && <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">{erroAuth}</div>}
          {msgSucesso && <div className="mb-4 p-3 bg-green-900/50 border border-green-500 rounded-lg text-green-200 text-sm">{msgSucesso}</div>}
          
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loadingGoogle || loadingAuth}
              className="w-full bg-white text-gray-900 border border-gray-300 font-semibold py-3 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
              </svg>
              {loadingGoogle ? "Aguarde..." : "Continuar com o Google"}
            </button>

            <div className="flex items-center my-1">
              <div className="flex-1 border-t border-gray-700"></div>
              <span className="px-3 text-gray-400 text-sm">ou</span>
              <div className="flex-1 border-t border-gray-700"></div>
            </div>

            <input
              type="email"
              required
              placeholder="seu.email@exemplo.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full bg-[#212121] text-gray-100 px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all"
            />
            {modoAuth !== "esqueci" && (
              <input
                type="password"
                required
                placeholder="Sua senha"
                value={senhaInput}
                onChange={(e) => setSenhaInput(e.target.value)}
                className="w-full bg-[#212121] text-gray-100 px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all"
              />
            )}
            <button
              type="submit"
              disabled={loadingAuth || loadingGoogle}
              className="w-full bg-transparent border border-gray-500 text-gray-300 font-semibold py-3 rounded-xl hover:bg-[#3a3a3a] transition-colors disabled:opacity-50"
            >
              {loadingAuth ? "Aguarde..." : modoAuth === "login" ? "Entrar com Email" : modoAuth === "cadastro" ? "Registar com Email" : "Enviar Email"}
            </button>
          </form>

          <div className="mt-6 flex flex-col items-center gap-2 text-sm">
            {modoAuth === "login" ? (
              <>
                <button onClick={() => { setModoAuth("cadastro"); setErroAuth(""); setMsgSucesso(""); }} className="text-gray-400 hover:text-white transition-colors">Não tem conta? Registe-se</button>
                <button onClick={() => { setModoAuth("esqueci"); setErroAuth(""); setMsgSucesso(""); }} className="text-gray-500 hover:text-gray-300 transition-colors">Esqueceu a senha?</button>
              </>
            ) : (
              <button onClick={() => { setModoAuth("login"); setErroAuth(""); setMsgSucesso(""); }} className="text-gray-400 hover:text-white transition-colors">Já tem conta? Entrar</button>
            )}
          </div>
        </div>
      </div>
    );
  }

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
            <div key={sessao.id} className={`group flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${sessaoId === sessao.id ? "bg-[#212121] text-white" : "text-gray-300 hover:bg-[#212121]"}`}>
              <button onClick={() => selecionarSessao(sessao.id)} className="flex-1 text-left truncate pr-2">
                {sessao.titulo}
              </button>
              <button onClick={(e) => apagarSessao(sessao.id, e)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all" title="Apagar conversa">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-gray-700/50">
          <div className="flex items-center justify-between px-3 py-2 text-sm text-gray-400">
            <span className="truncate pr-2">{usuarioLogado}</span>
            <button onClick={fazerLogout} className="hover:text-white transition-colors" title="Sair">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        <header className="flex items-center justify-between p-3 border-b border-gray-700/50 bg-[#212121]">
          <div className="flex items-center gap-2">
            <button onClick={() => setMenuAberto(true)} className="md:hidden p-2 text-gray-300 hover:text-white">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h1 className="hidden md:block text-lg font-semibold text-gray-200">Chat IA</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <select
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              className="bg-[#2f2f2f] text-gray-300 text-xs sm:text-sm rounded-lg border border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-400 px-2 py-1.5 cursor-pointer shadow-sm transition-colors"
              title="Escolha a Personalidade da IA"
            >
              <option value="Padrão">🤖 Padrão</option>
              <option value="Programador">💻 Programador</option>
              <option value="Professor de Inglês">🇬🇧 Prof. Inglês</option>
              <option value="Copywriter">✍️ Copywriter</option>
              <option value="Mestre Yoda">👽 Mestre Yoda</option>
            </select>

            <button
              onClick={exportarConversaPDF}
              disabled={mensagens.length === 0}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-xs sm:text-sm text-red-200 rounded-lg transition-colors border border-red-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar Conversa em PDF"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="18" x2="12" y2="12"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto w-full flex flex-col items-center">
          {mensagens.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 max-w-3xl mx-auto w-full">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-6 shadow-lg">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-200 mb-8">Como posso ajudar hoje?</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl px-2">
                {sugestoes.map((sugestao, i) => (
                  <button
                    key={i}
                    onClick={() => enviarMensagem(undefined, sugestao.texto)}
                    className="flex items-start gap-3 p-4 bg-[#2f2f2f] hover:bg-[#3a3a3a] border border-gray-700 hover:border-gray-500 rounded-xl transition-all text-left group"
                  >
                    <span className="text-xl">{sugestao.icone}</span>
                    <span className="text-sm text-gray-300 group-hover:text-white mt-0.5 leading-relaxed">
                      {sugestao.texto}
                    </span>
                  </button>
                ))}
              </div>
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
                  <div className={`max-w-[85%] md:max-w-[75%] px-5 py-3 ${msg.autor === "usuario" ? "bg-[#2f2f2f] text-gray-100 rounded-3xl" : "flex flex-col bg-transparent text-gray-100 px-0 rounded-none w-full"}`}>
                    {msg.autor === "ia" ? (
                      <>
                        <div className="prose prose-invert max-w-none text-gray-200 leading-relaxed">
                          <ReactMarkdown>{msg.texto}</ReactMarkdown>
                        </div>
                        <div className="flex justify-start mt-3 gap-4">
                          <button onClick={() => copiarTexto(msg.texto, index)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors" title="Copiar resposta">
                            {copiadoIndex === index ? (
                              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg> Copiado</>
                            ) : (
                              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copiar</>
                            )}
                          </button>
                          <button onClick={() => alternarVoz(msg.texto, index)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors" title="Ouvir resposta">
                            {falandoIndex === index ? (
                              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Parar</>
                            ) : (
                              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> Ouvir</>
                            )}
                          </button>
                          
                          {index === mensagens.length - 1 && !carregando && (
                            <button onClick={regerarUltimaResposta} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors" title="Regerar resposta">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="1 4 1 10 7 10"></polyline>
                                <polyline points="23 20 23 14 17 14"></polyline>
                                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                              </svg> 
                              Regerar
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col gap-2 items-end">
                        {msg.imagem && (
                          <img src={msg.imagem} alt="Anexo enviado" className="max-w-[200px] sm:max-w-[250px] rounded-lg object-contain border border-gray-600 mb-1" />
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.texto}</p>
                      </div>
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
            
            {imagemPreview && (
              <div className="absolute bottom-[110%] left-0 bg-[#2f2f2f] p-2 rounded-xl border border-gray-700 shadow-lg relative inline-block mb-3">
                <button 
                  onClick={limparImagem}
                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 transition-colors text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                  title="Remover imagem"
                >
                  ✕
                </button>
                <img src={imagemPreview} alt="Anexo" className="h-20 w-auto rounded-lg object-cover" />
              </div>
            )}

            <form onSubmit={enviarMensagem} className="relative flex items-center w-full gap-2 bg-[#2f2f2f] rounded-3xl border border-gray-700 shadow-sm px-2">
              
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleSelecionarImagem} 
              />
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-full transition-colors flex-shrink-0 flex items-center justify-center h-10 w-10 bg-transparent text-gray-400 hover:text-gray-200"
                title="Anexar imagem"
                disabled={carregando}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
              </button>

              <button
                type="button"
                onClick={alternarMicrofone}
                className={`p-2.5 rounded-full transition-colors flex-shrink-0 flex items-center justify-center h-10 w-10 ${ouvindo ? "bg-red-500/20 text-red-500 animate-pulse" : "bg-transparent text-gray-400 hover:text-gray-200"}`}
                title="Ditar mensagem"
                disabled={carregando}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="22"></line>
                </svg>
              </button>
              
              <input
                type="text"
                className="flex-1 bg-transparent text-gray-100 py-3.5 focus:outline-none"
                placeholder={ouvindo ? "A ouvir..." : imagemPreview ? "Faça uma pergunta sobre a imagem..." : "Envie uma mensagem..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={carregando}
              />
              
              <button
                type="submit"
                className="bg-white text-black rounded-full hover:bg-gray-200 transition-colors disabled:bg-[#424242] disabled:text-gray-500 flex-shrink-0 flex items-center justify-center h-9 w-9 mr-1"
                disabled={carregando || (!input.trim() && !imagemBase64)}
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