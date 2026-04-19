<img width="1360" height="674" alt="image" src="https://github.com/user-attachments/assets/d8fa4dde-09ee-4078-a73f-ad132f82108b" />

# Assistente Virtual IA

Um Assistente Virtual Inteligente de nível empresarial, construído com uma arquitetura moderna que separa o Frontend (Next.js) do Backend (Python FastAPI). 

Este projeto vai muito além de um simples chatbot, integrando capacidades avançadas como **RAG Vetorial** para leitura de PDFs extensos, **Pesquisa Web em Tempo Real**, **Extração de Transcrições do YouTube**, **Geração de Imagens** e **Memória de Curto Prazo**.

## Funcionalidades Principais

* 🧠 **Motor Híbrido de IA:** Utiliza o Google Gemini 2.5 Flash como motor principal, com um sistema de *fallback* automático para o Groq (Llama-3.1-8b) em caso de falha ou sobrecarga.
* 📚 **Leitura Inteligente de PDFs (RAG Vetorial):** Capacidade de anexar documentos. PDFs longos são fatiados e vetorizados no Supabase (usando `pgvector`), permitindo à IA consultar apenas a secção relevante do documento para responder.
* 🌐 **Pesquisa Web em Tempo Real:** Integração com a API do Tavily para procurar notícias, cotações e factos atuais na internet, contornando a limitação temporal dos modelos de IA.
* 📺 **Leitor Mágico do YouTube:** Cole um link do YouTube e o backend extrai instantaneamente as legendas do vídeo, permitindo resumos e perguntas sobre vídeos longos sem necessidade de os assistir.
* 📝 **Memória de Curto Prazo (Bloco de Notas):** Um painel lateral interativo onde o utilizador pode guardar notas. A IA lê este contexto invisivelmente em cada mensagem, mantendo uma memória de trabalho para projetos complexos.
* ⚡ **Ações Rápidas (Chat Actions):** Botões interativos abaixo de cada resposta para: Resumir, Explicar de forma simples, Traduzir para Inglês/Espanhol, Copiar e Ler em voz alta (Text-to-Speech).
* 🎯 **Perguntas de Seguimento Inteligentes:** A IA gera automaticamente 3 sugestões de perguntas baseadas no contexto atual, guiando a conversa como o Perplexity ou o Bing Copilot.
* 🎭 **Personas Customizáveis:** O utilizador pode criar e guardar diferentes "personalidades" para a IA (ex: Programador Sênior, Tradutor, etc.), com instruções de sistema personalizadas e temas visuais (cores) próprios.
* 🎨 **Geração de Imagens:** A IA consegue gerar imagens através da formulação inteligente de prompts enviados para a API do Pollinations.ai.
* 🔐 **Sistema de Autenticação:** Login seguro via Email/Senha e Autenticação Google através do Supabase Auth.
* 🎙️ **Reconhecimento de Voz:** Dite as suas mensagens através do microfone do dispositivo (Speech-to-Text).

---

## 🛠️ Tecnologias Utilizadas

### Frontend
* **[Next.js](https://nextjs.org/)** (React framework)
* **[Tailwind CSS](https://tailwindcss.com/)** (Estilização avançada e temas dinâmicos)
* **[Framer Motion](https://www.framer.com/motion/)** (Animações fluidas)
* **[Supabase Client](https://supabase.com/)** (Autenticação e base de dados)
* **React Markdown** (Renderização do texto da IA)

### Backend
* **[Python](https://www.python.org/)** & **[FastAPI](https://fastapi.tiangolo.com/)** (API de alta performance)
* **Google GenAI SDK** & **Groq Cloud** (Modelos de LLM e Embeddings)
* **Tavily API** (Motor de pesquisa para IA)
* **YouTube Transcript API** (Extração de legendas)
* **PyPDF2** (Processamento de ficheiros PDF)

### Base de Dados
* **[Supabase](https://supabase.com/)** (PostgreSQL) com a extensão `pgvector` para armazenar e pesquisar embeddings matemáticos.
