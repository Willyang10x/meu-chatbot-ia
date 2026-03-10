"use client";

import { useState } from "react";

type Mensagem = {
  autor: "usuario" | "ia";
  texto: string;
};

export default function Home() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);

  const enviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const novaMensagemUsuario: Mensagem = { autor: "usuario", texto: input };
    setMensagens((prev) => [...prev, novaMensagemUsuario]);
    setInput("");
    setCarregando(true);

    try {
      const resposta = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto: novaMensagemUsuario.texto,
          sessao_id: "sessao_nextjs",
        }),
      });

      const dados = await resposta.json();

      setMensagens((prev) => [
        ...prev,
        { autor: "ia", texto: dados.resposta },
      ]);
    } catch (error) {
      console.error("Erro ao comunicar com a API:", error);
      setMensagens((prev) => [
        ...prev,
        { autor: "ia", texto: "Desculpe, ocorreu um erro de conexão. O backend está rodando?" },
      ]);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 p-4 md:p-8">
      <header className="bg-blue-600 text-white p-4 rounded-t-xl shadow-md">
        <h1 className="text-xl font-bold text-center">Meu Chatbot com IA</h1>
      </header>

      <main className="flex-1 bg-white p-4 overflow-y-auto shadow-inner border-x border-gray-200">
        {mensagens.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">
            Mande um "Olá" para começar a conversa!
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {mensagens.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[80%] p-3 rounded-lg ${
                  msg.autor === "usuario"
                    ? "bg-blue-100 text-blue-900 self-end rounded-tr-none"
                    : "bg-gray-200 text-gray-800 self-start rounded-tl-none"
                }`}
              >
                {msg.texto}
              </div>
            ))}
            {carregando && (
              <div className="bg-gray-200 text-gray-800 self-start p-3 rounded-lg rounded-tl-none animate-pulse">
                Digitando...
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white p-4 rounded-b-xl shadow-md border border-gray-200 border-t-0">
        <form onSubmit={enviarMensagem} className="flex gap-2">
          <input
            type="text"
            className="flex-1 border text-black border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Digite sua mensagem..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={carregando}
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:bg-blue-400"
            disabled={carregando}
          >
            Enviar
          </button>
        </form>
      </footer>
    </div>
  );
}