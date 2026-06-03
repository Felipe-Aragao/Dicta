import os
import json
import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from markitdown import MarkItDown

from google import genai
from google.genai import types

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

router = APIRouter(prefix="/pdf", tags=["pdf"])

# Limites de upload
MAX_PDF_SIZE_MB = 10
MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024
CHUNK_SIZE = 1024 * 1024

# Caminhos de armazenamento
BASE_DIR = Path(__file__).resolve().parents[1]
INCOMING_DIR = BASE_DIR / "storage" / "incoming_pdfs"
INCOMING_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/receive")
async def receive_pdf(
    pdf: UploadFile = File(...),
    num_questions: int | None = Form(None),
):
    if num_questions is not None and num_questions < 1:
        raise HTTPException(status_code=400, detail="Quantidade de questões inválida.")

    if pdf.content_type and pdf.content_type.lower() != "application/pdf":
        raise HTTPException(status_code=400, detail="Arquivo deve ser PDF.")

    header = await pdf.read(5)
    if len(header) < 5 or header != b"%PDF-":
        raise HTTPException(status_code=400, detail="Arquivo não parece um PDF válido.")

    file_id = uuid.uuid4().hex
    target_path = INCOMING_DIR / f"{file_id}.pdf"
    size_bytes = 0

    try:
        with target_path.open("wb") as out:
            out.write(header)
            size_bytes += len(header)

            while True:
                chunk = await pdf.read(CHUNK_SIZE)
                if not chunk:
                    break
                size_bytes += len(chunk)
                if size_bytes > MAX_PDF_SIZE_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Arquivo acima do limite de {MAX_PDF_SIZE_MB} MB.",
                    )
                out.write(chunk)
    except HTTPException:
        if target_path.exists():
            target_path.unlink()
        raise
    except Exception as exc:
        if target_path.exists():
            target_path.unlink()
        raise HTTPException(status_code=500, detail="Falha ao salvar o PDF.") from exc
    finally:
        await pdf.close()

    # 1. Transformação do PDF para Markdown
    try:
        md = MarkItDown()
        result = md.convert(str(target_path))
        markdown_text = result.text_content
        
        if not markdown_text or not markdown_text.strip():
            raise ValueError("O PDF parece estar vazio ou não contém texto legível.")
    except Exception as e:
        if target_path.exists():
            target_path.unlink()
        raise HTTPException(status_code=422, detail=f"Erro ao converter PDF: {str(e)}")

    # 2. Extração inteligente das questões usando a IA
    try:
        limite_texto = f" Limite estritamente a {num_questions} questões." if num_questions else ""
        prompt = f"""
        Você é um assistente educacional especialista em exames. 
        Abaixo está o conteúdo de uma prova extraída no formato Markdown.
        Sua tarefa é extrair as questões e retornar ESTRITAMENTE um array JSON.{limite_texto}
        
        REGRAS DE ADAPTAÇÃO OBRIGATÓRIAS:
        1. Se a questão for de "Verdadeiro ou Falso", converta-a para o tipo "multiple" onde as opções sejam ["( ) Verdadeiro", "( ) Falso"].
        2. Se a questão for de "Preenchimento de Lacunas" ou "Associação de Colunas", adapte o enunciado para que faça sentido em formato "open" (dissertativo) ou monte alternativas correspondentes em "multiple".
        3. Caso encontre lacunas ou operadores matemáticos corrompidos por falha de leitura (como espaços duplos entre variáveis lógicas), deduza o operador correto pelo contexto para que a questão faça sentido.
        
        REGRAS CRÍTICAS PARA FORMATAÇÃO MATEMÁTICA:
        1. RECONSTRUÇÃO DE FRAÇÕES: PDFs com fórmulas frequentemente quebram frações verticais em linhas separadas (o numerador em cima e o denominador embaixo). Se detectar isso, reconstrua usando uma barra diagonal (ex: "9/32"). NUNCA junte os números transformando-os em inteiros (como "932").
        2. SISTEMAS DE EQUAÇÕES: Quando encontrar equações empilhadas verticalmente dentro de chaves, separe-as de forma clara usando ponto e vírgula ou quebras de linha com espaços legíveis. Cuidado para não colar o resultado da primeira equação com o início da segunda (ex: NÃO transforme '= 7' e '2x' em '= 72x'). Formate de forma legível para o aluno, por exemplo: "{{ 1,5x + 2y = 7 ; 2x - 3,5y = -3 }}".
        3. EXPOENTES E POTÊNCIAS: Se houver potências ou expoentes que foram achatados na extração de texto (como 'x ao cubo' virando 'x3'), corrija inserindo o símbolo de circunflexo padrão de programação (ex: "x^3"), para que o aluno identifique que se trata de uma potência.
        4. Mantenha os prefixos das alternativas (como "A) ", "B) ") padronizados dentro do array de options.

        Formato OBRIGATÓRIO do JSON:
        [
          {{"type": "multiple", "text": "Texto da pergunta?", "options": ["A) Opção 1", "B) Opção 2"]}},
          {{"type": "open", "text": "Texto da pergunta dissertativa?"}}
        ]
        
        Não inclua formatação markdown na resposta, apenas o array JSON bruto.
        
        TEXTO DA PROVA:
        {markdown_text}
        """
        
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite',
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json",
            )
        )
        print("\n=== RELATÓRIO DE CONSUMO DE TOKENS ===")
        print(f"Tokens de Entrada (Prompt + PDF): {response.usage_metadata.prompt_token_count}")
        print(f"Tokens de Saída (JSON gerado): {response.usage_metadata.candidates_token_count}")
        print(f"Total de Tokens Gastos: {response.usage_metadata.total_token_count}")
        print("=======================================\n")
        
        texto_limpo = response.text.strip()
        questions_data = json.loads(texto_limpo)
        questions_data = json.loads(response.text.strip())
        
    except Exception as e:
        print("Erro no Gemini:", e)
        if target_path.exists():
            target_path.unlink()
        raise HTTPException(status_code=503, detail="A IA está sobrecarregada ou falhou ao processar a prova. Tente novamente.")

    # 3. Limpeza do disco e Retorno
    if target_path.exists():
        target_path.unlink()

    return {
        "ok": True,
        "questions": questions_data,
        "warnings": []
    }