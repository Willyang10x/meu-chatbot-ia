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
    usuario_email: str = "anonimo"

sessoes_chat = {}

@app.get("/")
def read_root():
    return {"status": "ok", "mensagem": "Backend rodando com Supabase e Auth!"}

@app.post("/chat")
def conversar_com_ia(mensagem: MensagemUsuario):
    sessao = mensagem.sessao_id
    email = mensagem.usuario_email
    
    if sessao not in sessoes_chat:
        resposta_banco = supabase.table("mensagens_chat").select("*").eq("sessao_id", sessao).order("criado_em").execute()
        
        if len(resposta_banco.data) == 0:
            try:
                resposta_titulo = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=f"Crie um título extremamente curto (máximo 4 palavras) para resumir esta mensagem de um usuário: '{mensagem.texto}'. Responda apenas com o título, sem aspas ou pontuação no final."
                )
                titulo_gerado = resposta_titulo.text.strip()
                
                supabase.table("mensagens_chat").insert({
                    "sessao_id": sessao,
                    "autor": "titulo",
                    "texto": titulo_gerado,
                    "usuario_email": email
                }).execute()
            except Exception as e:
                print(f"Erro ao gerar título: {e}")
        
        historico_formatado = []
        for msg in resposta_banco.data:
            if msg["autor"] in ["usuario", "ia"]:
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
        "texto": mensagem.texto,
        "usuario_email": email
    }).execute()
    
    response = chat_atual.send_message(mensagem.texto)
    
    supabase.table("mensagens_chat").insert({
        "sessao_id": sessao,
        "autor": "ia",
        "texto": response.text,
        "usuario_email": email
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