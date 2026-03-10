import os
from fastapi import FastAPI
from pydantic import BaseModel
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

app = FastAPI(title="Chatbot IA API")

class MensagemUsuario(BaseModel):
    texto: str

@app.get("/")
def read_root():
    return {"status": "ok", "mensagem": "Backend do Chatbot rodando com sucesso!"}

@app.post("/chat")
def conversar_com_ia(mensagem: MensagemUsuario):
    response = client.models.generate_content(
        model='gemini-1.5-flash',
        contents=mensagem.texto,
    )
    
    return {"resposta": response.text}