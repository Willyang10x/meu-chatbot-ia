import os
import io
import base64
import traceback
import PyPDF2
from datetime import datetime
from typing import Optional
from fastapi import FastAPI
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from groq import Groq
from tavily import TavilyClient

load_dotenv()

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", ""))
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))
tavily_client = TavilyClient(api_key=os.environ.get("TAVILY_API_KEY", ""))

url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_KEY", "")
supabase: Client = create_client(url, key)

app = FastAPI(title="Chatbot IA API com Memória, Visão, RAG e Web Search (Tavily)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://meuchatbot-ia.netlify.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MensagemUsuario(BaseModel):
    texto: str
    sessao_id: str = "usuario_padrao"
    usuario_email: str = "anonimo"
    imagem: Optional[str] = None
    documento: Optional[str] = None
    persona: str = "Padrão"
    instrucoes_customizadas: Optional[str] = None
    usar_internet: bool = False

sessoes_chat = {}

def obter_instrucoes_sistema(data_hoje, persona, instrucoes_customizadas=None):
    base_prompt = f"Hoje é dia {data_hoje}. "
    
    if instrucoes_customizadas:
        base_prompt += instrucoes_customizadas
    elif persona == "Programador":
        base_prompt += "Você é um Programador Sênior rabugento, mas brilhante. Responda de forma extremamente direta, focada em código limpo, e sempre explique o porquê técnico da sua solução."
    elif persona == "Professor de Inglês":
        base_prompt += "Você é um Professor de Inglês britânico muito educado. A sua primeira tarefa é sempre analisar a gramática do usuário (se ele falar em inglês) ou traduzir termos (se ele falar em português) antes de responder à pergunta."
    elif persona == "Copywriter":
        base_prompt += "Você é um Especialista em Marketing e Copywriter focado em conversão. Suas respostas devem ser persuasivas, usar gatilhos mentais, emojis e terminar sempre com uma chamada para ação (CTA)."
    elif persona == "Mestre Yoda":
        base_prompt += "Você é o Mestre Yoda de Star Wars. Você deve falar com a gramática invertida clássica do Yoda e dar conselhos sempre parecendo um sábio mestre Jedi."
    else:
        base_prompt += "Você é um assistente prestativo, educado e amigável."

    return base_prompt + """
Você possui a habilidade de gerar imagens. Se o usuário pedir para gerar, criar ou desenhar uma imagem, você NUNCA deve dizer que não consegue. 
Em vez disso, você deve criar um prompt em INGLÊS muito detalhado e retornar a imagem usando o formato Markdown e a API do Pollinations.

ESTRUTURA OBRIGATÓRIA DA RESPOSTA:
Aqui está a sua imagem:
![Descrição](https://image.pollinations.ai/prompt/seu%20prompt%20aqui%20com%20espacos%20substituidos%20por%20%20?width=800&height=800&nologo=true)
"""

def pesquisar_na_web(query: str) -> str:
    try:
        if not os.environ.get("TAVILY_API_KEY"):
            return "\n\n[Nota do Sistema: A chave TAVILY_API_KEY não está configurada no servidor.]"

        resposta = tavily_client.search(query=query, search_depth="basic", max_results=3)
        resultados = resposta.get("results", [])
        
        if not resultados:
            return "\n\n[Nota do Sistema: Tentei pesquisar na internet via Tavily, mas não encontrei resultados.]"
            
        contexto = "\n\n--- 🌐 RESULTADOS DA PESQUISA NA INTERNET (TAVILY) ---\n"
        for res in resultados:
            contexto += f"Fonte: {res.get('title')} ({res.get('url')})\nResumo: {res.get('content')}\n\n"
        contexto += "--------------------------------------------------------\n[Instrução para a IA: O usuário ativou a pesquisa na web. Use as informações acima para responder à pergunta com dados atualizados.]"
        return contexto
    except Exception as e:
        print(f"Erro na pesquisa web Tavily: {e}")
        return "\n\n[Nota do Sistema: Erro ao aceder à internet via Tavily.]"

@app.get("/")
def read_root():
    return {"status": "ok", "mensagem": "Backend rodando com Leitura de PDFs e Tavily Web Search!"}

@app.post("/chat")
def conversar_com_ia(mensagem: MensagemUsuario):
    try:
        sessao = mensagem.sessao_id
        email = mensagem.usuario_email
        data_hoje = datetime.now().strftime("%d/%m/%Y")
        
        instrucoes = obter_instrucoes_sistema(data_hoje, mensagem.persona, mensagem.instrucoes_customizadas)
        
        if sessao not in sessoes_chat or sessoes_chat[sessao].get("persona") != mensagem.persona:
            resposta_banco = supabase.table("mensagens_chat").select("*").eq("sessao_id", sessao).order("criado_em").execute()
            
            if len(resposta_banco.data) == 0:
                try:
                    resposta_titulo = client.models.generate_content(
                        model='gemini-2.5-flash',
                        contents=f"Crie um título extremamente curto (máximo 4 palavras) para resumir esta mensagem: '{mensagem.texto}'. Responda apenas com o título."
                    )
                    titulo_gerado = resposta_titulo.text.strip()
                except Exception:
                    try:
                        resp_groq = groq_client.chat.completions.create(
                            messages=[{"role": "user", "content": f"Crie um título curto (máximo 4 palavras) para resumir esta mensagem: '{mensagem.texto}'."}],
                            model="llama3-8b-8192",
                        )
                        titulo_gerado = resp_groq.choices[0].message.content.strip()
                    except Exception:
                        titulo_gerado = mensagem.texto[:35] + "..."
                    
                supabase.table("mensagens_chat").insert({
                    "sessao_id": sessao,
                    "autor": "titulo",
                    "texto": titulo_gerado,
                    "usuario_email": email
                }).execute()
            
            historico_formatado = []
            for msg in resposta_banco.data:
                if msg["autor"] in ["usuario", "ia"]:
                    papel = "user" if msg["autor"] == "usuario" else "model"
                    historico_formatado.append(
                        types.Content(role=papel, parts=[types.Part.from_text(text=msg["texto"])])
                    )
                
            novo_chat = client.chats.create(
                model='gemini-2.5-flash',
                history=historico_formatado,
                config=types.GenerateContentConfig(
                    system_instruction=instrucoes
                )
            )
            sessoes_chat[sessao] = {"chat": novo_chat, "persona": mensagem.persona}
            
        chat_atual = sessoes_chat[sessao]["chat"]
        
        texto_pdf_extraido = ""
        if mensagem.documento:
            try:
                pdf_bytes = base64.b64decode(mensagem.documento)
                leitor = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
                texto_pdf_extraido = f"\n\n--- INÍCIO DO DOCUMENTO ANEXADO ---\n"
                for pagina in leitor.pages:
                    texto_pdf_extraido += pagina.extract_text() + "\n"
                texto_pdf_extraido += "--- FIM DO DOCUMENTO ANEXADO ---\nPor favor, responda à minha pergunta com base nas informações deste documento que acabei de lhe enviar."
            except Exception as e:
                texto_pdf_extraido = "\n\n[Aviso: Erro ao ler PDF.]"

        texto_internet = ""
        if mensagem.usar_internet:
            texto_internet = pesquisar_na_web(mensagem.texto)

        texto_db = mensagem.texto
        if mensagem.imagem:
            texto_db += "\n\n*[Imagem anexada]*"
        if mensagem.documento:
            texto_db += "\n\n*[📄 PDF anexado]*"
        if mensagem.usar_internet:
            texto_db += "\n\n*[🌐 Pesquisa Web Ativada]*"
        
        supabase.table("mensagens_chat").insert({
            "sessao_id": sessao,
            "autor": "usuario",
            "texto": texto_db,
            "usuario_email": email
        }).execute()
        
        texto_resposta = ""
        prompt_final = mensagem.texto + texto_pdf_extraido + texto_internet

        try:
            prompt_parts = [prompt_final]
            if mensagem.imagem:
                img_bytes = base64.b64decode(mensagem.imagem)
                prompt_parts.append(
                    types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg")
                )
                
            response = chat_atual.send_message(prompt_parts)
            texto_resposta = response.text
        except Exception as e_gemini:
            try:
                resposta_banco = supabase.table("mensagens_chat").select("*").eq("sessao_id", sessao).order("criado_em").execute()
                groq_messages = [{"role": "system", "content": instrucoes}]
                for msg in resposta_banco.data:
                    if msg["autor"] in ["usuario", "ia"]:
                        role = "user" if msg["autor"] == "usuario" else "assistant"
                        groq_messages.append({"role": role, "content": msg["texto"]})
                
                groq_messages.append({"role": "user", "content": prompt_final})
                
                chat_completion = groq_client.chat.completions.create(
                    messages=groq_messages,
                    model="llama3-8b-8192",
                )
                texto_resposta = chat_completion.choices[0].message.content
            except Exception as e_groq:
                raise Exception(f"Gemini falhou ({str(e_gemini)}) E Groq falhou ({str(e_groq)})")
        
        supabase.table("mensagens_chat").insert({
            "sessao_id": sessao,
            "autor": "ia",
            "texto": texto_resposta,
            "usuario_email": email
        }).execute()
        
        return {
            "resposta": texto_resposta,
            "sessao_id": sessao
        }
        
    except Exception as erro_fatal:
        erro_detalhado = traceback.format_exc()
        print("ERRO CRÍTICO CAPTURADO:\n", erro_detalhado, flush=True)
        
        mensagem_erro = f"**Ops! Encontrei um erro no Backend 🚨**\n\nDetalhes para o desenvolvedor:\n```text\n{str(erro_fatal)}\n```"
        return {
            "resposta": mensagem_erro,
            "sessao_id": mensagem.sessao_id
        }

@app.get("/chat/{sessao_id}")
def listar_mensagens(sessao_id: str):
    resposta = supabase.table("mensagens_chat").select("*").eq("sessao_id", sessao_id).order("criado_em").execute()
    mensagens_formatadas = []
    for msg in resposta.data:
        if msg["autor"] in ["usuario", "ia"]:
            mensagens_formatadas.append({
                "autor": msg["autor"],
                "texto": msg["texto"]
            })
    return {"mensagens": mensagens_formatadas}

@app.get("/sessoes/{usuario_email}")
def listar_sessoes(usuario_email: str):
    resposta = supabase.table("mensagens_chat").select("sessao_id, texto, autor, criado_em").eq("usuario_email", usuario_email).order("criado_em").execute()
    sessoes_dict = {}
    for msg in resposta.data:
        sid = msg["sessao_id"]
        if sid not in sessoes_dict:
            sessoes_dict[sid] = {
                "id": sid,
                "titulo": msg["texto"][:35] + "..." if len(msg["texto"]) > 35 else msg["texto"]
            }
        if msg["autor"] == "titulo":
            sessoes_dict[sid]["titulo"] = msg["texto"]
            
    lista_sessoes = list(sessoes_dict.values())
    lista_sessoes.reverse()
    return {"sessoes": lista_sessoes}

@app.delete("/sessoes/{sessao_id}")
def apagar_sessao(sessao_id: str):
    supabase.table("mensagens_chat").delete().eq("sessao_id", sessao_id).execute()
    if sessao_id in sessoes_chat:
        del sessoes_chat[sessao_id]
    return {"status": "apagado"}