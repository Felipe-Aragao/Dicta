import json
import logging
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types
from markitdown import MarkItDown

load_dotenv()

logger = logging.getLogger(__name__)

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")


class PdfLlmServiceError(Exception):
    pass


class EmptyPdfTextError(PdfLlmServiceError):
    pass


class LlmExtractionError(PdfLlmServiceError):
    pass


class NotAnExamError(PdfLlmServiceError):
    pass


def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise LlmExtractionError("GEMINI_API_KEY não configurada.")
    return genai.Client(api_key=api_key)


def extract_markdown_from_pdf(file_path: Path) -> str:
    try:
        result = MarkItDown().convert(str(file_path))
    except Exception as exc:
        raise LlmExtractionError("Falha ao converter o PDF para Markdown.") from exc

    markdown_text = (result.text_content or "").strip()
    if not markdown_text:
        raise EmptyPdfTextError("PDF sem texto legível.")
    return markdown_text


def build_question_extraction_prompt(markdown_text: str, num_questions: int | None = None) -> str:
    limit_text = f" Limite estritamente a {num_questions} questões." if num_questions else ""
    return f"""
Você é um assistente educacional especialista em exames.
Abaixo está o conteúdo de uma prova extraída no formato Markdown.
Sua tarefa é extrair as questões e retornar ESTRITAMENTE um array JSON.{limit_text}

REGRA DE SEGURANÇA MÁXIMA:
Primeiro, leia e avalie o texto. Se este documento NÃO for claramente uma prova, questionário, simulado ou lista de exercícios (ex: se for um artigo, receita, manual, TCC ou slides de aula), VOCÊ É ESTRITAMENTE PROIBIDO DE INVENTAR QUESTÕES.
Nesse caso, você deve retornar EXATAMENTE este JSON e nada mais:
[
  {{"type": "error", "text": "not_an_exam"}}
]

SE O DOCUMENTO FOR UMA PROVA REAL, sua tarefa é extrair as questões reais e retornar ESTRITAMENTE um array JSON.{limit_text}
REGRAS DE ADAPTAÇÃO OBRIGATÓRIAS:
1. Se a questão for de "Verdadeiro ou Falso", converta-a para o tipo "multiple" onde as opções sejam ["( ) Verdadeiro", "( ) Falso"].
2. Se a questão for de "Preenchimento de Lacunas" ou "Associação de Colunas", adapte o enunciado para que faça sentido em formato "open" (dissertativo) ou monte alternativas correspondentes em "multiple".
3. Caso encontre lacunas ou operadores matemáticos corrompidos por falha de leitura (como espaços duplos entre variáveis lógicas), deduza o operador correto pelo contexto para que a questão faça sentido.

REGRAS CRÍTICAS PARA FORMATAÇÃO MATEMÁTICA:
1. RECONSTRUÇÃO DE FRAÇÕES: PDFs com fórmulas frequentemente quebram frações verticais em linhas separadas (o numerador em cima e o denominador embaixo). Se detectar isso, reconstrua usando uma barra diagonal (ex: "9/32"). NUNCA junte os números transformando-os em inteiros (como "932").
2. SISTEMAS DE EQUAÇÕES: Quando encontrar equações empilhadas verticalmente dentro de chaves, separe-as de forma clara usando ponto e vírgula ou quebras de linha com espaços legíveis. Cuidado para não colar o resultado da primeira equação com o início da segunda (ex: NÃO transforme '= 7' e '2x' em '= 72x'). Formate de forma legível para o aluno, por exemplo: "{{ 1,5x + 2y = 7 ; 2x - 3,5y = -3 }}".
3. EXPOENTES E POTÊNCIAS: Se houver potências ou expoentes que foram achatados na extração de texto (como 'x ao cubo' virando 'x3'), corrija inserindo o símbolo de circunflexo padrão de programação (ex: "x^3").
4. Mantenha os prefixos das alternativas (como "A) ", "B) ") padronizados dentro do array de options.

Formato OBRIGATÓRIO do JSON:
[
  {{"type": "multiple", "text": "Texto da pergunta?", "options": ["A) Opção 1", "B) Opção 2"]}},
  {{"type": "open", "text": "Texto da pergunta dissertativa?"}}
]

Não inclua formatação markdown na resposta, apenas o array JSON bruto.

TEXTO DA PROVA:
{markdown_text}
""".strip()


def _is_not_an_exam_response(data: Any) -> bool:
    return (
        isinstance(data, list)
        and len(data) == 1
        and isinstance(data[0], dict)
        and data[0].get("type") == "error"
        and data[0].get("text") == "not_an_exam"
    )


def _normalize_question(item: Any) -> dict[str, Any] | None:
    if not isinstance(item, dict):
        return None

    question_type = "multiple" if item.get("type") == "multiple" else "open"
    text = str(item.get("text") or "").strip()
    if not text:
        return None

    question = {
        "type": question_type,
        "text": text,
    }
    if question_type == "multiple":
        options = [
            str(option).strip()
            for option in item.get("options") or []
            if str(option).strip()
        ]
        if len(options) < 2:
            return None
        question["options"] = options
    return question


def parse_llm_questions_response(response_text: str) -> list[dict[str, Any]]:
    try:
        data = json.loads(response_text.strip())
    except (AttributeError, json.JSONDecodeError) as exc:
        raise LlmExtractionError("A LLM retornou um JSON inválido.") from exc

    if _is_not_an_exam_response(data):
        raise NotAnExamError("Documento não identificado como prova.")
    if not isinstance(data, list):
        raise LlmExtractionError("A LLM não retornou uma lista de questões.")

    questions = [
        question
        for question in (_normalize_question(item) for item in data)
        if question is not None
    ]
    if not questions:
        raise LlmExtractionError("A LLM não retornou questões válidas.")
    return questions


def extract_questions_from_pdf_with_llm(
    file_path: Path,
    num_questions: int | None = None,
) -> list[dict[str, Any]]:
    markdown_text = extract_markdown_from_pdf(file_path)
    prompt = build_question_extraction_prompt(markdown_text, num_questions)

    try:
        response = get_gemini_client().models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json",
            ),
        )
    except PdfLlmServiceError:
        raise
    except Exception as exc:
        raise LlmExtractionError("Falha ao consultar a LLM.") from exc

    usage = getattr(response, "usage_metadata", None)
    if usage:
        logger.info(
            "Gemini token usage: prompt=%s candidates=%s total=%s",
            getattr(usage, "prompt_token_count", None),
            getattr(usage, "candidates_token_count", None),
            getattr(usage, "total_token_count", None),
        )

    return parse_llm_questions_response(response.text)
