import os
from datetime import datetime
from fastapi import FastAPI
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client

load_dotenv()

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

app = FastAPI(title="Chatbot IA API com Memória Permanente")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://meu-chatbot-ia.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MensagemUsuario(BaseModel):
    texto: str
    sessao_id: str = "usuario_padrao"

sessoes_chat = {}

@app.get("/")
def read_root():
    return {"status": "ok", "mensagem": "Backend rodando com Supabase!"}

@app.post("/chat")
def conversar_com_ia(mensagem: MensagemUsuario):
    sessao = mensagem.sessao_id
    
    if sessao not in sessoes_chat:
        resposta_banco = supabase.table("mensagens_chat").select("*").eq("sessao_id", sessao).order("criado_em").execute()
        
        historico_formatado = []
        for msg in resposta_banco.data:
            papel = "user" if msg["autor"] == "usuario" else "model"
            historico_formatado.append(
                types.Content(role=papel, parts=[types.Part.from_text(text=msg["texto"])])
            )
            
        data_hoje = datetime.now().strftime("%d/%m/%Y")
            
        sessoes_chat[sessao] = client.chats.create(
            model='gemini-2.5-flash',
            history=historico_formatado,
            config=types.GenerateContentConfig(
                system_instruction=f"Você é um assistente prestativo. Hoje é dia {data_hoje}."
            )
        )
        
    chat_atual = sessoes_chat[sessao]
    
    supabase.table("mensagens_chat").insert({
        "sessao_id": sessao,
        "autor": "usuario",
        "texto": mensagem.texto
    }).execute()
    
    response = chat_atual.send_message(mensagem.texto)
    
    supabase.table("mensagens_chat").insert({
        "sessao_id": sessao,
        "autor": "ia",
        "texto": response.text
    }).execute()
    
    return {
        "resposta": response.text,
        "sessao_id": sessao
    }

@app.get("/chat/{sessao_id}")
def listar_mensagens(sessao_id: str):
    resposta = supabase.table("mensagens_chat").select("*").eq("sessao_id", sessao_id).order("criado_em").execute()
    
    mensagens_formatadas = []
    for msg in resposta.data:
        mensagens_formatadas.append({
            "autor": msg["autor"],
            "texto": msg["texto"]
        })
        
    return {"mensagens": mensagens_formatadas}

@app.get("/sessoes")
def listar_sessoes():
    resposta = supabase.table("mensagens_chat").select("sessao_id, texto, criado_em").eq("autor", "usuario").order("criado_em").execute()
    
    sessoes_dict = {}
    for msg in resposta.data:
        sid = msg["sessao_id"]
        if sid not in sessoes_dict:
            titulo = msg["texto"][:35] + "..." if len(msg["texto"]) > 35 else msg["texto"]
            sessoes_dict[sid] = {
                "id": sid,
                "titulo": titulo
            }
            
    lista_sessoes = list(sessoes_dict.values())
    lista_sessoes.reverse()
    
    return {"sessoes": lista_sessoes}