"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";

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

type PersonaCustomizada = {
  id: string;
  nome: string;
  instrucoes: string;
  tema: string;
};

const temasPersona: Record<string, { bg: string; button: string; border: string; text: string; glow: string }> = {
  "Padrão": { bg: "bg-[#212121]", button: "bg-white text-black hover:bg-gray-200", border: "border-gray-700", text: "text-gray-100", glow: "shadow-[0_0_15px_rgba(255,255,255,0.05)]" },
  "Programador": { bg: "bg-[#0d1117]", button: "bg-[#2f81f7] text-white hover:bg-[#1f6feb]", border: "border-[#30363d]", text: "text-[#c9d1d9]", glow: "shadow-[0_0_15px_rgba(47,129,247,0.15)]" },
  "Professor de Inglês": { bg: "bg-[#2a1b1b]", button: "bg-[#da3633] text-white hover:bg-[#b32b29]", border: "border-[#5c3a3a]", text: "text-[#f2eaea]", glow: "shadow-[0_0_15px_rgba(218,54,51,0.15)]" },
  "Copywriter": { bg: "bg-[#2b2210]", button: "bg-[#e3b341] text-black hover:bg-[#c99f38]", border: "border-[#665329]", text: "text-[#f5ecd8]", glow: "shadow-[0_0_15px_rgba(227,179,65,0.15)]" },
  "Mestre Yoda": { bg: "bg-[#142416]", button: "bg-[#4ade80] text-black hover:bg-[#22c55e]", border: "border-[#2c5232]", text: "text-[#dcfce7]", glow: "shadow-[0_0_15px_rgba(74,222,128,0.15)]" },
  "Roxo": { bg: "bg-[#1a1423]", button: "bg-[#a855f7] text-white hover:bg-[#9333ea]", border: "border-[#3b284e]", text: "text-[#e9d5ff]", glow: "shadow-[0_0_15px_rgba(168,85,247,0.15)]" },
  "Azul": { bg: "bg-[#0d1117]", button: "bg-[#2f81f7] text-white hover:bg-[#1f6feb]", border: "border-[#30363d]", text: "text-[#c9d1d9]", glow: "shadow-[0_0_15px_rgba(47,129,247,0.15)]" },
  "Verde": { bg: "bg-[#142416]", button: "bg-[#4ade80] text-black hover:bg-[#22c55e]", border: "border-[#2c5232]", text: "text-[#dcfce7]", glow: "shadow-[0_0_15px_rgba(74,222,128,0.15)]" },
  "Vermelho": { bg: "bg-[#2a1b1b]", button: "bg-[#da3633] text-white hover:bg-[#b32b29]", border: "border-[#5c3a3a]", text: "text-[#f2eaea]", glow: "shadow-[0_0_15px_rgba(218,54,51,0.15)]" },
  "Amarelo": { bg: "bg-[#2b2210]", button: "bg-[#e3b341] text-black hover:bg-[#c99f38]", border: "border-[#665329]", text: "text-[#f5ecd8]", glow: "shadow-[0_0_15px_rgba(227,179,65,0.15)]" }
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
  
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  const [copiadoIndex, setCopiadoIndex] = useState<number | null>(null);
  const [ouvindo, setOuvindo] = useState(false);
  const [falandoIndex, setFalandoIndex] = useState<number | null>(null);
  
  const [imagemBase64, setImagemBase64] = useState<string | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  
  const [persona, setPersona] = useState<string>("Padrão");

  const [personasCustomizadas, setPersonasCustomizadas] = useState<PersonaCustomizada[]>([]);
  const [modalPersona, setModalPersona] = useState(false);
  const [novaPersonaNome, setNovaPersonaNome] = useState("");
  const [novaPersonaInstrucoes, setNovaPersonaInstrucoes] = useState("");
  const [novaPersonaTema, setNovaPersonaTema] = useState("Azul");
  
  const [editandoIndex, setEditandoIndex] = useState<number | null>(null);
  const [textoEdicao, setTextoEdicao] = useState("");
  
  const fimDasMensagensRef = useRef<HTMLDivElement>(null);
  const reconhecimentoRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  let tema = temasPersona[persona];
  if (!tema) {
    const pc = personasCustomizadas.find(p => p.nome === persona);
    tema = pc && temasPersona[pc.tema] ? temasPersona[pc.tema] : temasPersona["Padrão"];
  }

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
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarAberta(false);
      else setSidebarAberta(true);
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const carregarPersonas = async (email: string) => {
    try {
      const { data, error } = await supabase.from('personas_customizadas').select('*').eq('usuario_email', email);
      if (error) throw error;
      setPersonasCustomizadas(data || []);
    } catch (error) {
      console.error("Erro ao carregar personas:", error);
    }
  };

  const criarNovaPersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaPersonaNome.trim() || !novaPersonaInstrucoes.trim()) return;
    try {
      const { data, error } = await supabase.from('personas_customizadas').insert([{
        usuario_email: usuarioLogado,
        nome: novaPersonaNome,
        instrucoes: novaPersonaInstrucoes,
        tema: novaPersonaTema
      }]).select();
      if (error) throw error;
      
      setPersonasCustomizadas([...personasCustomizadas, data[0]]);
      setPersona(data[0].nome);
      setModalPersona(false);
      setNovaPersonaNome(""); 
      setNovaPersonaInstrucoes(""); 
      setNovaPersonaTema("Azul");
    } catch (error) {
      alert("Erro ao criar persona.");
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

  const iniciarEdicao = (index: number, textoAtual: string) => {
    setEditandoIndex(index);
    setTextoEdicao(textoAtual);
  };

  const cancelarEdicao = () => {
    setEditandoIndex(null);
    setTextoEdicao("");
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
    carregarPersonas(usuarioLogado);
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
    if (isMobile) setSidebarAberta(false);
  };

  const selecionarSessao = (id: string) => {
    setSessaoId(id);
    localStorage.setItem("chatbot_sessao_id", id);
    carregarHistorico(id);
    limparImagem();
    if (isMobile) setSidebarAberta(false);
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
      const resposta = await fetch("https://meu-chatbot-ia-01xd.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto: textoMensagem,
          sessao_id: sessaoId,
          usuario_email: usuarioLogado,
          imagem: imagemEnviada,
          persona: persona,
          instrucoes_customizadas: personasCustomizadas.find(p => p.nome === persona)?.instrucoes
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
      const resposta = await fetch("https://meu-chatbot-ia-01xd.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto: ultimaMsgUsuario.texto,
          sessao_id: sessaoId,
          usuario_email: usuarioLogado,
          imagem: imagemEnviada,
          persona: persona,
          instrucoes_customizadas: personasCustomizadas.find(p => p.nome === persona)?.instrucoes
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

  const regerarComEdicao = async (index: number) => {
    if (!textoEdicao.trim() || carregando) return;

    const textoNovo = textoEdicao;
    const imagemAntiga = mensagens[index].imagem;
    cancelarEdicao();

    const mensagensAnteriores = mensagens.slice(0, index);

    const novaMensagemUsuario: Mensagem = {
      autor: "usuario",
      texto: textoNovo,
      imagem: imagemAntiga
    };

    setMensagens([...mensagensAnteriores, novaMensagemUsuario]);
    setCarregando(true);

    let imagemEnviada = undefined;
    if (imagemAntiga) {
      imagemEnviada = imagemAntiga.split(',')[1];
    }

    try {
      const resposta = await fetch("https://meu-chatbot-ia-01xd.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto: textoNovo,
          sessao_id: sessaoId,
          usuario_email: usuarioLogado,
          imagem: imagemEnviada,
          persona: persona,
          instrucoes_customizadas: personasCustomizadas.find(p => p.nome === persona)?.instrucoes
        }),
      });

      const dados = await resposta.json();
      setMensagens((prev) => [...prev, { autor: "ia", texto: dados.resposta }]);
      carregarSessoes(usuarioLogado);
    } catch (error) {
      console.error(error);
      setMensagens((prev) => [...prev, { autor: "ia", texto: "Desculpe, ocorreu um erro ao regerar a resposta editada." }]);
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

  if (!usuarioLogado) {
    return (
      <div className={`flex flex-col h-screen ${tema.bg} ${tema.text} font-sans items-center justify-center p-4 transition-colors duration-500`}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`w-full max-w-md bg-black/40 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border ${tema.border} ${tema.glow}`}
        >
          <div className="flex justify-center mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${tema.button}`}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

          {erroAuth && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">{erroAuth}</motion.div>}
          {msgSucesso && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 p-3 bg-green-900/50 border border-green-500 rounded-lg text-green-200 text-sm">{msgSucesso}</motion.div>}
          
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loadingGoogle || loadingAuth}
              className="w-full bg-white text-gray-900 border border-gray-300 font-semibold py-3 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-3 disabled:opacity-50 shadow-md"
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
              <span className="px-3 text-gray-500 text-sm">ou</span>
              <div className="flex-1 border-t border-gray-700"></div>
            </div>

            <input
              type="email"
              required
              placeholder="seu.email@exemplo.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className={`w-full bg-black/20 ${tema.text} px-4 py-3 rounded-xl border ${tema.border} focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all`}
            />
            {modoAuth !== "esqueci" && (
              <input
                type="password"
                required
                placeholder="Sua senha"
                value={senhaInput}
                onChange={(e) => setSenhaInput(e.target.value)}
                className={`w-full bg-black/20 ${tema.text} px-4 py-3 rounded-xl border ${tema.border} focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all`}
              />
            )}
            <button
              type="submit"
              disabled={loadingAuth || loadingGoogle}
              className={`w-full font-bold py-3 rounded-xl transition-all disabled:opacity-50 ${tema.button}`}
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
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen ${tema.bg} ${tema.text} font-sans overflow-hidden transition-colors duration-500`}>
      
      <AnimatePresence>
        {modalPersona && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#1e1e1e] w-full max-w-lg rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-black/20">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><span className="text-2xl">🎭</span> Nova Persona</h3>
                <button onClick={() => setModalPersona(false)} className="text-gray-400 hover:text-white">✕</button>
              </div>
              <form onSubmit={criarNovaPersona} className="p-6 flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nome da Persona</label>
                  <input required value={novaPersonaNome} onChange={e => setNovaPersonaNome(e.target.value)} placeholder="Ex: Treinador de Valorant" className="w-full bg-black/40 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Como a IA deve agir? (Instruções)</label>
                  <textarea required value={novaPersonaInstrucoes} onChange={e => setNovaPersonaInstrucoes(e.target.value)} placeholder="Ex: Você é um jogador Radiante. Analise as jogadas e dê dicas agressivas de mira." className="w-full bg-black/40 text-white px-4 py-3 rounded-xl border border-gray-700 outline-none focus:border-gray-500 min-h-[100px]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Cor do Tema</label>
                  <div className="flex gap-3">
                    {["Azul", "Roxo", "Verde", "Vermelho", "Amarelo"].map(cor => (
                      <button key={cor} type="button" onClick={() => setNovaPersonaTema(cor)} className={`w-10 h-10 rounded-full border-2 transition-all ${novaPersonaTema === cor ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60'} ${temasPersona[cor].button.split(' ')[0]}`} title={cor} />
                    ))}
                  </div>
                </div>
                <button type="submit" className="w-full mt-2 bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">Salvar Persona</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sidebarAberta && isMobile && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
            onClick={() => setSidebarAberta(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside 
        className={`fixed md:relative z-50 h-full bg-black/40 backdrop-blur-md flex flex-col transition-colors border-r ${tema.border} overflow-hidden`}
        initial={false}
        animate={{ 
          width: isMobile ? 256 : (sidebarAberta ? 256 : 0),
          x: isMobile ? (sidebarAberta ? 0 : "-100%") : 0
        }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
      >
        <div className="w-64 h-full flex flex-col flex-shrink-0">
          <div className="p-4 flex gap-2">
            <button 
              onClick={iniciarNovaConversa} 
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-semibold border ${tema.border} ${tema.button}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Nova
            </button>
            
            <button 
              onClick={() => setSidebarAberta(false)}
              className={`flex-shrink-0 w-12 flex items-center justify-center rounded-xl transition-all border ${tema.border} hover:bg-white/10 text-gray-400 hover:text-white`}
              title="Recolher Painel"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {isMobile ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M15 18l-6-6 6-6" />
                )}
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1 mt-2 custom-scrollbar">
            <h3 className="text-xs font-semibold text-gray-500 mb-2 px-2 uppercase tracking-wider">Histórico</h3>
            {sessoes.map((sessao) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                key={sessao.id} 
                className={`group flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${sessaoId === sessao.id ? "bg-white/10 text-white font-medium" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"}`}
              >
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
              </motion.div>
            ))}
          </div>

          <div className={`p-4 border-t ${tema.border} bg-black/20`}>
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span className="truncate pr-2 font-medium">{usuarioLogado}</span>
              <button onClick={fazerLogout} className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors" title="Sair">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </motion.aside>

      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        <header className={`flex items-center justify-between p-4 border-b ${tema.border} bg-black/20 backdrop-blur-md`}>
          <div className="flex items-center gap-3">
            {!sidebarAberta && (
              <motion.button 
                initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                onClick={() => setSidebarAberta(true)} 
                className={`p-2 text-gray-400 hover:text-white bg-white/5 border ${tema.border} rounded-lg`}
                title="Abrir Histórico"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </motion.button>
            )}
            <h1 className="flex text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-500 items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${tema.button.split(' ')[0]} animate-pulse`}></span>
              Chat IA
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setModalPersona(true)} className={`text-xs font-bold px-3 py-2 rounded-xl transition-all border ${tema.border} hover:bg-white/10 text-gray-300 hidden sm:flex items-center gap-1.5`}><span className="text-base">+</span> Nova Persona</button>
            <select
              value={persona}
              onChange={(e) => { if(e.target.value === "NOVO") setModalPersona(true); else setPersona(e.target.value); }}
              className={`bg-black/40 ${tema.text} text-sm font-medium rounded-xl border ${tema.border} focus:outline-none focus:ring-2 focus:ring-opacity-50 px-3 py-2 cursor-pointer shadow-sm transition-all appearance-none pr-8 relative max-w-[140px] sm:max-w-xs truncate`}
              style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.2em 1.2em' }}
            >
              <optgroup label="Padrões">
                <option value="Padrão">🤖 Padrão</option>
                <option value="Programador">💻 Programador</option>
                <option value="Professor de Inglês">🇬🇧 Prof. Inglês</option>
                <option value="Copywriter">✍️ Copywriter</option>
                <option value="Mestre Yoda">👽 Mestre Yoda</option>
              </optgroup>
              {personasCustomizadas.length > 0 && (
                <optgroup label="As Minhas Personas">
                  {personasCustomizadas.map(p => <option key={p.id} value={p.nome}>🎭 {p.nome}</option>)}
                </optgroup>
              )}
              <option value="NOVO" className="sm:hidden text-green-400 font-bold">+ Criar Persona</option>
            </select>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto w-full flex flex-col items-center scroll-smooth custom-scrollbar">
          {mensagens.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center px-4 max-w-3xl mx-auto w-full"
            >
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-8 shadow-2xl ${tema.button} ${tema.glow} transform rotate-3`}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="-rotate-3">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-10 tracking-tight">Como posso ajudar hoje?</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl px-2">
                {sugestoes.map((sugestao, i) => (
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    key={i}
                    onClick={() => enviarMensagem(undefined, sugestao.texto)}
                    className={`flex items-start gap-4 p-5 bg-black/20 hover:bg-black/40 border ${tema.border} rounded-2xl transition-all text-left group shadow-lg`}
                  >
                    <span className="text-2xl">{sugestao.icone}</span>
                    <span className="text-sm text-gray-300 group-hover:text-white mt-0.5 leading-relaxed font-medium">
                      {sugestao.texto}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="w-full max-w-4xl flex flex-col gap-6 px-4 py-8">
              <AnimatePresence initial={false}>
                {mensagens.map((msg, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 15, scale: 0.98 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    layout
                    key={index} 
                    className={`flex w-full ${msg.autor === "usuario" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.autor === "ia" && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 flex-shrink-0 mt-1 shadow-lg ${tema.button}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                        </svg>
                      </div>
                    )}
                    <div className={`max-w-[85%] md:max-w-[75%] px-6 py-4 ${msg.autor === "usuario" ? `bg-black/30 border ${tema.border} rounded-3xl rounded-tr-sm shadow-md` : "flex flex-col bg-transparent px-0 rounded-none w-full"}`}>
                      {msg.autor === "ia" ? (
                        <>
                          <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-[#161b22] prose-pre:border prose-pre:border-gray-800 max-w-none">
                            <ReactMarkdown>
                              {msg.texto.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => `![${alt}](${url.replace(/ /g, '%20')})`)}
                            </ReactMarkdown>
                          </div>
                          <div className="flex justify-start mt-4 gap-3">
                            <button onClick={() => copiarTexto(msg.texto, index)} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors bg-white/5 px-2 py-1.5 rounded-lg" title="Copiar resposta">
                              {copiadoIndex === index ? (
                                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg> Copiado</>
                              ) : (
                                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copiar</>
                              )}
                            </button>
                            <button onClick={() => alternarVoz(msg.texto, index)} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors bg-white/5 px-2 py-1.5 rounded-lg" title="Ouvir resposta">
                              {falandoIndex === index ? (
                                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Parar</>
                              ) : (
                                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> Ouvir</>
                              )}
                            </button>
                            
                            {index === mensagens.length - 1 && !carregando && (
                              <button onClick={regerarUltimaResposta} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors bg-white/5 px-2 py-1.5 rounded-lg" title="Regerar resposta">
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
                        <div className="flex flex-col gap-2 items-end w-full group">
                          {editandoIndex === index ? (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="w-full flex flex-col gap-3 min-w-[200px] sm:min-w-[300px]">
                              <textarea
                                value={textoEdicao}
                                onChange={(e) => setTextoEdicao(e.target.value)}
                                className={`w-full bg-black/40 text-white p-3 rounded-xl border ${tema.border} focus:outline-none focus:ring-1 focus:ring-gray-400 resize-y min-h-[80px] text-sm`}
                              />
                              <div className="flex justify-end gap-2">
                                <button onClick={cancelarEdicao} className="px-4 py-2 text-xs font-bold text-gray-300 hover:text-white bg-white/10 rounded-xl transition-colors">Cancelar</button>
                                <button onClick={() => regerarComEdicao(index)} disabled={!textoEdicao.trim() || carregando} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all disabled:opacity-50 ${tema.button}`}>Salvar e Enviar</button>
                              </div>
                            </motion.div>
                          ) : (
                            <>
                              {msg.imagem && (
                                <img src={msg.imagem} alt="Anexo enviado" className={`max-w-[200px] sm:max-w-[280px] rounded-xl object-contain border ${tema.border} mb-2 shadow-md`} />
                              )}
                              <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.texto}</p>
                              {!carregando && (
                                <button
                                  onClick={() => iniciarEdicao(index, msg.texto)}
                                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-white mt-1 transition-all duration-200 bg-black/20 px-2 py-1 rounded-md"
                                  title="Editar mensagem"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                  Editar
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {carregando && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex w-full justify-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 flex-shrink-0 mt-1 shadow-lg ${tema.button}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                    </svg>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 py-3">
                    <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className={`w-2 h-2 rounded-full ${tema.button.split(' ')[0]}`}></motion.span>
                    <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className={`w-2 h-2 rounded-full ${tema.button.split(' ')[0]}`}></motion.span>
                    <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className={`w-2 h-2 rounded-full ${tema.button.split(' ')[0]}`}></motion.span>
                  </div>
                </motion.div>
              )}
              <div ref={fimDasMensagensRef} />
            </div>
          )}
        </div>

        <div className={`w-full flex flex-col items-center bg-black/20 backdrop-blur-md px-4 pb-6 pt-3 border-t ${tema.border}`}>
          <div className="w-full max-w-4xl relative">
            
            <AnimatePresence>
              {imagemPreview && (
                <motion.div initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 20 }} className={`absolute bottom-[110%] left-0 bg-black/60 backdrop-blur-md p-2 rounded-2xl border ${tema.border} shadow-2xl inline-block mb-3`}>
                  <button onClick={limparImagem} className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 shadow-md transition-colors text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold" title="Remover imagem">✕</button>
                  <img src={imagemPreview} alt="Anexo" className="h-24 w-auto rounded-xl object-cover" />
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={enviarMensagem} className={`relative flex items-center w-full gap-2 bg-black/40 rounded-full border ${tema.border} shadow-lg px-2 transition-all focus-within:ring-1 focus-within:ring-white/20`}>
              
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleSelecionarImagem} />
              
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 rounded-full transition-colors flex-shrink-0 flex items-center justify-center h-11 w-11 bg-transparent text-gray-400 hover:text-white" title="Anexar imagem" disabled={carregando}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
              </button>

              <button type="button" onClick={alternarMicrofone} className={`p-3 rounded-full transition-colors flex-shrink-0 flex items-center justify-center h-11 w-11 ${ouvindo ? "bg-red-500/20 text-red-500 animate-pulse" : "bg-transparent text-gray-400 hover:text-white"}`} title="Ditar mensagem" disabled={carregando}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
              </button>
              
              <input type="text" className="flex-1 bg-transparent text-gray-100 py-4 focus:outline-none text-[15px]" placeholder={ouvindo ? "A ouvir..." : imagemPreview ? "Faça uma pergunta sobre a imagem..." : "Envie uma mensagem..."} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={carregando} />
              
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className={`rounded-full flex-shrink-0 flex items-center justify-center h-10 w-10 mr-1 shadow-md disabled:bg-[#424242] disabled:text-gray-500 ${tema.button}`} disabled={carregando || (!input.trim() && !imagemBase64)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </motion.button>
            </form>
            <p className="text-center text-xs text-gray-500 mt-3 font-medium">A IA pode cometer erros. Considere verificar as informações importantes.</p>
          </div>
        </div>
      </main>
    </div>
  );
}