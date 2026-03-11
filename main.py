import os
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
    allow_origins=["http://localhost:3000"],
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
            
        sessoes_chat[sessao] = client.chats.create(
            model='gemini-2.5-flash',
            history=historico_formatado
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