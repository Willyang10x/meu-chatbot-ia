import os
from fastapi import FastAPI
from pydantic import BaseModel
from google import genai
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

app = FastAPI(title="Chatbot IA API com Memória")

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
    return {"status": "ok", "mensagem": "Backend rodando!"}

@app.post("/chat")
def conversar_com_ia(mensagem: MensagemUsuario):
    sessao = mensagem.sessao_id
    
    if sessao not in sessoes_chat:
        sessoes_chat[sessao] = client.chats.create(model='gemini-2.5-flash')
        
    chat_atual = sessoes_chat[sessao]
    
    response = chat_atual.send_message(mensagem.texto)
    
    return {
        "resposta": response.text,
        "sessao_id": sessao
    }