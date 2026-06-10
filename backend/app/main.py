from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.pdf import router as pdf_router
from app.routers.activities import router as activities_router
from app.routers.auth import router as auth_router
from app.routers.questions import router as questions_router
from app.routers.question_options import router as question_options_router
from app.routers.attempts import router as attempts_router
from app.routers.answers import router as answers_router

app = FastAPI()

# CORS para o frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro das rotas
app.include_router(pdf_router)
app.include_router(activities_router)
app.include_router(auth_router)
app.include_router(questions_router)
app.include_router(question_options_router)
app.include_router(attempts_router)
app.include_router(answers_router)
