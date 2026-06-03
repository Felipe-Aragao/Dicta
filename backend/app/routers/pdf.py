import os
import json
import uuid
import re
from dataclasses import asdict, dataclass
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from markitdown import MarkItDown
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from google import genai
from google.genai import types

# Inicialização do cliente Gemini
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


@dataclass(frozen=True)
class ExtractedPdfPage:
    page_number: int
    text: str
    text_length: int

@dataclass(frozen=True)
class ExtractedPdfText:
    text: str
    text_length: int
    page_count: int
    pages: list[ExtractedPdfPage]
    warnings: list[str]

@dataclass(frozen=True)
class ParsedQuestion:
    type: str
    text: str
    options: list[str]

QUESTION_START_PATTERNS = [
    re.compile(r"^\s*(?:quest(?:ão|ao)|exerc[ií]cio|pergunta|problema)\s*(?:n[ºo]\.?\s*)?(\d{1,3})\s*[:.)\-–—−]?\s*(.*)$", re.IGNORECASE),
    re.compile(r"^\s*q\.?\s*(\d{1,3})\s*[:.)\-–—−]?\s*(.*)$", re.IGNORECASE),
    re.compile(r"^\s*\(?(\d{1,3})\)?\s*(?:[.):]\s*|[\-–—−]\s+)(.*)$"),
]
PAGE_MARKER_RE = re.compile(r"^\s*---\s*Página\s+\d+\s*---\s*$", re.IGNORECASE)
URL_RE = re.compile(r"(?:https?://|www\.)\S+", re.IGNORECASE)
TOKEN_CODE_RE = re.compile(r"\b[A-Za-z0-9+/]{32,}={0,2}\b")
FOOTER_STAMP_RE = re.compile(r"^(?=.*\b\d{2}/\d{2}/\d{4}\b)(?=.*\b\d{1,2}:\d{2}(?::\d{2})?\b)(?=.*[A-Z0-9_]{4,}).{1,120}$")
LONG_CODE_RE = re.compile(r"\b(?=[A-Za-z0-9_+/:-]{18,}={0,2}\b)(?=\S*(?:\d|[+=]))[A-Za-z0-9_+/:-]+={0,2}\b")
BLANK_MARKER_RE = re.compile(r"(?:[_\-–—−]\s*){3,}")
INLINE_LETTER_OPTION_RE = re.compile(r"(?<!\S)(?:\(([A-Ha-h])\)|([A-Ha-h])\s*[.):]|([A-H])\s*[\-–—−]|([a-h])\s*[\-–—−]\s+)\s+")
INLINE_CONTINUATION_OPTION_RE = re.compile(r"(?<!\S)(?:\(([A-Ha-h])\)|([A-Ha-h])\s*[.):]|([A-H])\s*[\-–—−]|([a-h])\s*[\-–—−]\s+)\s*")
LETTER_OPTION_RE = re.compile(r"^\s*(?:\(([A-Ha-h])\)|([A-Ha-h])\s*[.):]|([A-H])\s*[\-–—−]|([a-h])\s*[\-–—−]\s+)\s*(.*)$")
ROMAN_OPTION_RE = re.compile(r"^\s*(?:\((I|II|III|IV|V|VI|VII|VIII|IX|X)\)|((?:I|II|III|IV|V|VI|VII|VIII|IX|X))\s*[.)\-–—−:])\s*(.*)$", re.IGNORECASE)
PAGE_FOOTER_RE = re.compile(r"^(?=.*\b\d{1,3}\b)(?=.*(?:confidencial|aplica(?:ç|c)(?:ão|ao))).{1,120}$", re.IGNORECASE)
EMBEDDED_PAGE_FOOTER_RE = re.compile(r"\s+\d{1,3}\s+\S{6,50}.*?(?:confidencial|aplica(?:ç|c)(?:ão|ao)).*$", re.IGNORECASE)
EMBEDDED_ANSWER_SHEET_RE = re.compile(r"\s+(?:cart[aã]o|folha)\s+(?:de\s+)?respostas?.*$", re.IGNORECASE)
EMBEDDED_CODE_TAIL_RE = re.compile(r"\s+\S{4,24}\s+(?=[A-Za-z0-9_+/:-]{18,}={0,2}\b)(?=\S*(?:\d|[+=]))[A-Za-z0-9_+/:-]+={0,2}.*$")
EMBEDDED_SCRATCH_RE = re.compile(r"\s+(?:r\s*a\s*s\s*c\s*u\s*n\s*h\s*o|draft|scratch)\b.*$", re.IGNORECASE)
EMBEDDED_NUMERIC_QUESTION_RE = re.compile(r"\s+(\d{2,3}[.)]\s+\S.{11,})$")
WEAK_PROMPT_RE = re.compile(r"^(?:instru(?:ç|c)(?:ões|oes)|orienta(?:ç|c)(?:ões|oes))\b|^(?:nome|aluno|professor|turma|data|disciplina|curso)\b.{0,40}:\s*\S*$", re.IGNORECASE)
TRAILING_CONTENT_RE = re.compile(r"^(?:resposta|answer|gabarito|corre(?:ç|c)(?:ão|ao)|coment[aá]rio|feedback|pontua(?:ç|c)(?:ão|ao)|nota|gerado(?:\s+em)?|criado(?:\s+em)?|emitido(?:\s+em)?|assinado(?:\s+por)?|edital)\s*:", re.IGNORECASE)
METADATA_LABEL_RE = re.compile(r"^(?:nome|aluno|professor|turma|data|inscri(?:ç|c)(?:ão|ao)|cpf|rg|assinatura|cargo|sala|pr[eé]dio|carteira)\b.{0,40}:\s*\S*", re.IGNORECASE)
SUPPORT_TEXT_RE = re.compile(r"leia\s+(?:o|a|os|as)\s+(?:texto|poema|charge|tirinha|excerto|fragmento|not[ií]cia|cr[oô]nica|cartum|passagem)s?.*?(?:quest(?:ões|oes)|n[uú]meros?)\s+(?:de\s+)?(\d{1,3})\s*(?:a|à|e|-|–|—)\s*(\d{1,3})", re.IGNORECASE)
SECTION_RE = re.compile(r"^(?:confidencial|instru(?:ç|c)(?:ões|oes)\s+gerais|orienta(?:ç|c)(?:ões|oes)\s+gerais)\b", re.IGNORECASE)
INSTRUCTION_START_RE = re.compile(r"^(?:instru(?:ç|c)(?:ões|oes)|orienta(?:ç|c)(?:ões|oes)|observa(?:ç|c)(?:ões|oes)).{0,40}(?:candidato|prova|gerais)?\s*:?\s*$", re.IGNORECASE)
INSTRUCTION_END_RE = re.compile(r"^(?:boa\s+prova|concurso\s+p[uú]blico|cargo|l[ií]ngua|matem[aá]tica|conhecimentos|direito|inform[aá]tica|atualidades)\b", re.IGNORECASE)

def _normalize_page_text(text: str) -> str:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = [" ".join(line.split()) for line in normalized.split("\n")]
    return "\n".join(line for line in lines if line)

def _extract_page_text(page) -> str:
    candidates = [
        _normalize_page_text(page.extract_text(extraction_mode="layout") or ""),
        _normalize_page_text(page.extract_text() or ""),
    ]
    return max(candidates, key=_text_usefulness_score, default="")

def _text_usefulness_score(text: str) -> int:
    if not text: return 0
    score = len(text)
    score += sum(1 for line in text.splitlines() if _question_start_match(line)) * 500
    return score

def _matched_chars(pattern: re.Pattern, text: str) -> int:
    return sum(len(match.group(0)) for match in pattern.finditer(text))

def _line_is_mostly_noise(line: str, *patterns: re.Pattern) -> bool:
    line = line.strip()
    if not line: return False
    matched = sum(_matched_chars(pattern, line) for pattern in patterns)
    if matched < max(18, len(line) * 0.55): return False
    remainder = line
    for pattern in patterns: remainder = pattern.sub(" ", remainder)
    meaningful = "".join(char for char in remainder if char.isalnum())
    return len(meaningful) <= max(8, len(line) * 0.18)

def _question_start_match(line: str) -> re.Match | None:
    for index, pattern in enumerate(QUESTION_START_PATTERNS):
        match = pattern.match(line)
        if not match: continue
        marker_text = match.group(2).strip()
        if index < 2 or not marker_text or len(marker_text) >= 8: return match
    return None

def _question_number_from_match(match: re.Match | None) -> int | None:
    return int(match.group(1)) if match else None

def _question_number_from_line(line: str) -> int | None:
    return _question_number_from_match(_question_start_match(line))

def _is_plain_numbered_question_match(line: str, match: re.Match | None) -> bool:
    if not match: return False
    if _explicit_question_start_match(line): return False
    return QUESTION_START_PATTERNS[2].match(line) is not None

def _is_dash_numbered_match(line: str) -> bool:
    return re.match(r"^\s*\(?\d{1,3}\)?\s*[\-–—−]\s+", line) is not None

def _explicit_question_start_match(line: str) -> re.Match | None:
    for pattern in QUESTION_START_PATTERNS[:2]:
        match = pattern.match(line)
        if match: return match
    return None

def _letter_option_match(line: str) -> tuple[str, str] | None:
    match = LETTER_OPTION_RE.match(line)
    if not match: return None
    letter = (match.group(1) or match.group(2) or match.group(3) or match.group(4)).upper()
    return letter, match.group(5).strip()

def _roman_option_match(line: str) -> tuple[str, str] | None:
    match = ROMAN_OPTION_RE.match(line)
    if not match: return None
    roman = (match.group(1) or match.group(2)).upper()
    return roman, match.group(3).strip()

def _looks_like_option(line: str) -> bool:
    return _letter_option_match(line) is not None or _roman_option_match(line) is not None

def _inline_option_letter(match: re.Match) -> str:
    return next(group for group in match.groups() if group).upper()

def _has_sequential_inline_options(matches: list[re.Match]) -> bool:
    if len(matches) < 2: return False
    letters = [_inline_option_letter(match) for match in matches]
    if letters[0] != "A": return False
    expected = [chr(ord("A") + index) for index in range(len(letters))]
    return letters == expected

def _split_inline_letter_options(line: str) -> list[str]:
    matches = list(INLINE_LETTER_OPTION_RE.finditer(line))
    if matches and matches[0].start() == 0:
        if not _has_sequential_inline_options(matches): return [line]
    else:
        continuation_matches = list(INLINE_CONTINUATION_OPTION_RE.finditer(line))
        if not _has_sequential_inline_options(continuation_matches): return [line]
        prefix = line[: continuation_matches[0].start()].strip()
        if not prefix or (not prefix.endswith((".", "?", "!", ":")) and len(prefix) < 16): return [line]
        split_lines = [prefix]
        for index, match in enumerate(continuation_matches):
            end = continuation_matches[index + 1].start() if index + 1 < len(continuation_matches) else len(line)
            segment = line[match.start():end].strip()
            if segment: split_lines.append(segment)
        return split_lines

    split_lines = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(line)
        segment = line[match.start():end].strip()
        if segment: split_lines.append(segment)
    return split_lines or [line]

def _split_embedded_question_start(line: str) -> list[str]:
    match = EMBEDDED_NUMERIC_QUESTION_RE.search(line)
    if not match: return [line]
    before = line[: match.start()].strip()
    after = match.group(1).strip()
    if not before or not _question_start_match(after): return [line]
    return [before, after]

def _split_embedded_question_lines(lines: list[str]) -> list[str]:
    split_lines = []
    for line in lines: split_lines.extend(_split_embedded_question_start(line))
    return split_lines

def _support_text_match(line: str) -> re.Match | None:
    return SUPPORT_TEXT_RE.search(line)

def _looks_like_instruction_item(line: str) -> bool:
    match = _question_start_match(line)
    if not _is_plain_numbered_question_match(line, match): return False
    text = match.group(2).strip()
    if not text or len(text) > 120 or text.endswith("?"): return False
    return re.match(r"^(?:prova|justifique|responda|marque|assinale|preencha|utilize|use|n[aã]o|somente|apenas|cada\s+quest(?:ão|ao)|ser[aá]|boa\s+prova)\b", text, re.IGNORECASE) is not None

def _prepare_question_lines(text: str) -> list[str]:
    lines = []
    in_instruction_block = False
    instruction_line_count = 0
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or PAGE_MARKER_RE.match(line): continue
        starts_question = _question_start_match(line) is not None
        if INSTRUCTION_START_RE.match(line) and not starts_question:
            in_instruction_block = True
            instruction_line_count = 0
            continue
        if in_instruction_block:
            if starts_question and not _looks_like_instruction_item(line):
                in_instruction_block = False
            elif starts_question:
                instruction_line_count += 1
                continue
            elif INSTRUCTION_END_RE.match(line):
                in_instruction_block = False
                continue
            elif instruction_line_count >= 8:
                in_instruction_block = False
            else:
                instruction_line_count += 1
                continue
        if in_instruction_block: continue

        starts_option = _looks_like_option(line)
        starts_trailing = _looks_like_trailing_content(line)
        starts_support = _support_text_match(line) is not None
        if lines and not starts_question and not starts_option and not starts_trailing and not starts_support:
            previous = lines[-1]
            if not previous.endswith((".", "?", "!", ":", ";")):
                lines[-1] = f"{previous} {line}"
                continue
        lines.append(line)
    return lines

def _strip_question_marker(line: str) -> str:
    match = _question_start_match(line)
    return match.group(2).strip() if match else line.strip()

def _normalize_blank_markers(text: str) -> str:
    def replace_marker(match: re.Match) -> str:
        marker_length = sum(1 for char in match.group(0) if char in "_-–—−")
        return " " if marker_length >= 12 else " (espaço em branco) "
    text = BLANK_MARKER_RE.sub(replace_marker, text)
    text = " ".join(text.split())
    return re.sub(r"\s+([.,;:!?])", r"\1", text)

def _trim_embedded_trailing_content(text: str) -> str:
    cut_positions = []
    for pattern in (EMBEDDED_PAGE_FOOTER_RE, EMBEDDED_ANSWER_SHEET_RE, EMBEDDED_CODE_TAIL_RE, EMBEDDED_SCRATCH_RE):
        match = pattern.search(text)
        if match and match.start() > 0: cut_positions.append(match.start())
    for pattern in (FOOTER_STAMP_RE, URL_RE, LONG_CODE_RE, TOKEN_CODE_RE):
        match = pattern.search(text)
        if match and match.start() > 0 and _line_is_mostly_noise(text[match.start():], pattern):
            cut_positions.append(match.start())
    if cut_positions: text = text[: min(cut_positions)]
    return text.strip()

def _clean_question_text(text: str) -> str:
    return _normalize_blank_markers(_trim_embedded_trailing_content(text))

def _is_valid_prompt(prompt: str) -> bool:
    prompt = prompt.strip()
    if len(prompt) < 12: return False
    if WEAK_PROMPT_RE.match(prompt): return False
    return any(char.isalpha() for char in prompt)

def _looks_like_prompt_done(prompt_lines: list[str]) -> bool:
    prompt = " ".join(line.strip() for line in prompt_lines if line.strip())
    return prompt.endswith(("?", ".", "!"))

def _looks_like_trailing_content(line: str) -> bool:
    line = line.strip()
    if re.match(r"^\d{1,3}$", line): return True
    if _line_is_mostly_noise(line, URL_RE): return True
    if _line_is_mostly_noise(line, LONG_CODE_RE, TOKEN_CODE_RE): return True
    if FOOTER_STAMP_RE.match(line): return True
    if PAGE_FOOTER_RE.match(line): return True
    if _support_text_match(line): return True
    if _looks_like_section_header(line): return True
    if TRAILING_CONTENT_RE.match(line): return True
    if METADATA_LABEL_RE.match(line) and not _question_start_match(line): return True
    return False

def _looks_like_section_header(line: str) -> bool:
    line = line.strip()
    if len(line) > 90 or _question_start_match(line) or _looks_like_option(line): return False
    if line.endswith(("?", "!", ".", ";")): return False
    letters = [char for char in line if char.isalpha()]
    if len(letters) < 4: return False
    if SECTION_RE.match(line): return True
    lowercase = [char for char in letters if char.islower()]
    uppercase = [char for char in letters if char.isupper()]
    words = [word for word in re.split(r"\s+", line) if word]
    if len(words) > 8: return False
    return len(uppercase) >= len(letters) * 0.75 and not re.search(r"\b(?:qual|quais|como|por que|explique|assinale|marque|calcule|determine|cite)\b", line, re.IGNORECASE)

def _block_has_options(block_lines: list[str]) -> bool:
    return any(_looks_like_option(line) for line in block_lines)

def _looks_like_numbered_item_continuation(current_block: list[str], line: str, match: re.Match | None) -> bool:
    if not current_block or not _is_plain_numbered_question_match(line, match): return False
    current_number = _question_number_from_line(current_block[0])
    candidate_number = _question_number_from_match(match)
    if current_number is None or candidate_number is None: return False
    current_match = _question_start_match(current_block[0])
    current_marker = current_match.group(1) if current_match else ""
    candidate_marker = match.group(1)
    if current_number == candidate_number and len(current_marker) >= 3 and len(candidate_marker) < len(current_marker): return False
    if _block_has_options(current_block):
        return current_number > 10 and candidate_number <= 10 and candidate_number != current_number + 1 and _is_dash_numbered_match(line)
    return candidate_number != current_number + 1

def _extract_options(block_lines: list[str]) -> tuple[list[str], list[str]]:
    expanded_lines = []
    for line in block_lines: expanded_lines.extend(_split_inline_letter_options(line))
    prompt_lines, option_lines = [], []
    current_option = None
    prompt_closed, block_closed, use_roman = False, False, False

    letter_matches = [_letter_option_match(line) for line in expanded_lines]
    roman_matches = [_roman_option_match(line) for line in expanded_lines]
    letter_count = sum(1 for match in letter_matches if match)
    roman_count = sum(1 for match in roman_matches if match)
    if letter_count == 0 and roman_count >= 2: use_roman = True

    for index, line in enumerate(expanded_lines):
        if index == 0: line = _strip_question_marker(line)
        option_match = _roman_option_match(line) if use_roman else _letter_option_match(line)
        roman_prompt_match = None if use_roman else _roman_option_match(line)
        if block_closed and not option_match: continue

        if roman_prompt_match and current_option is None:
            prompt_lines.append(line)
            prompt_closed = _looks_like_prompt_done(prompt_lines)
            continue

        if option_match:
            if current_option is not None: option_lines.append(_trim_embedded_trailing_content(current_option))
            current_option = option_match[1]
            prompt_closed = True
            continue

        if current_option is not None and current_option.strip() and not re.match(r"^\d{1,3}$", line.strip()) and _looks_like_trailing_content(line):
            option_lines.append(_trim_embedded_trailing_content(current_option))
            current_option = None
            prompt_closed = True
            block_closed = True
        elif current_option is not None:
            current_option = f"{current_option} {line}"
        elif _looks_like_trailing_content(line):
            prompt_closed = True
            block_closed = True
        elif not prompt_closed:
            prompt_lines.append(line)
            prompt_closed = _looks_like_prompt_done(prompt_lines)
        elif not _looks_like_prompt_done(prompt_lines):
            prompt_lines.append(line)

    if current_option is not None: option_lines.append(_trim_embedded_trailing_content(current_option))
    clean_options = [option for option in option_lines if option.strip()]
    if len(clean_options) < 2: return prompt_lines + option_lines, []
    return prompt_lines, clean_options

def extract_questions_from_text(text: str, limit: int | None = None) -> list[ParsedQuestion]:
    lines = _split_embedded_question_lines(_prepare_question_lines(text))
    blocks, current_block = [], []
    prefer_explicit_question_markers = any(_explicit_question_start_match(line) for line in lines)
    first_numbered_question_index = None
    if not prefer_explicit_question_markers:
        for index, line in enumerate(lines):
            match = _question_start_match(line)
            if _is_plain_numbered_question_match(line, match) and _question_number_from_match(match) == 1:
                first_numbered_question_index = index
                break

    for index, line in enumerate(lines):
        starts_question = _explicit_question_start_match(line) if prefer_explicit_question_markers else _question_start_match(line)
        if first_numbered_question_index is not None and index < first_numbered_question_index and _is_plain_numbered_question_match(line, starts_question):
            starts_question = None
        if _looks_like_numbered_item_continuation(current_block, line, starts_question):
            starts_question = None

        if starts_question:
            if current_block: blocks.append(current_block)
            current_block = [line]
        elif current_block:
            current_block.append(line)

    if current_block: blocks.append(current_block)

    questions = []
    for block in blocks:
        prompt_lines, options = _extract_options(block)
        prompt = _clean_question_text(" ".join(line.strip() for line in prompt_lines if line.strip()))
        if not _is_valid_prompt(prompt): continue
        options = [_clean_question_text(option) for option in options]
        questions.append(ParsedQuestion(type="multiple" if options else "open", text=prompt, options=options))
        if limit is not None and len(questions) >= limit: break

    return questions

def extract_text_from_pdf(file_path: Path) -> ExtractedPdfText:
    try:
        reader = PdfReader(str(file_path))
        if reader.is_encrypted:
            decrypt_result = reader.decrypt("")
            if decrypt_result == 0:
                raise HTTPException(status_code=422, detail="PDF criptografado. Não foi possível extrair o texto.")

        pages = []
        warnings = []
        for page_number, page in enumerate(reader.pages, start=1):
            page_text = _extract_page_text(page)
            if page_text:
                pages.append(ExtractedPdfPage(page_number=page_number, text=page_text, text_length=len(page_text)))
            else:
                warnings.append(f"Página {page_number} não contém texto pesquisável extraível.")

        text = "\n\n".join(f"--- Página {page.page_number} ---\n{page.text}" for page in pages).strip()
        if not text:
            warnings.append("Nenhum texto pesquisável foi encontrado. O PDF pode ser escaneado ou conter apenas imagens.")

        return ExtractedPdfText(text=text, text_length=len(text), page_count=len(reader.pages), pages=pages, warnings=warnings)
    except HTTPException:
        raise
    except PdfReadError as exc:
        raise HTTPException(status_code=422, detail="PDF inválido ou corrompido.") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Falha ao extrair o texto do PDF.") from exc


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
                if not chunk: break
                size_bytes += len(chunk)
                if size_bytes > MAX_PDF_SIZE_BYTES:
                    raise HTTPException(status_code=413, detail=f"Arquivo acima do limite de {MAX_PDF_SIZE_MB} MB.")
                out.write(chunk)
    except HTTPException:
        if target_path.exists(): target_path.unlink()
        raise
    except Exception as exc:
        if target_path.exists(): target_path.unlink()
        raise HTTPException(status_code=500, detail="Falha ao salvar o PDF.") from exc
    finally:
        await pdf.close()

    questions_data = []
    warnings_list = []

    try:
        md = MarkItDown()
        result = md.convert(str(target_path))
        markdown_text = result.text_content
        
        if not markdown_text or not markdown_text.strip():
            raise ValueError("O PDF parece estar vazio ou não contém texto legível.")

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
        """
        
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite',
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json",
            )
        )
        
        print("\n=== RELATÓRIO DE CONSUMO DE TOKENS (IA) ===")
        print(f"Tokens de Entrada: {response.usage_metadata.prompt_token_count}")
        print(f"Tokens de Saída: {response.usage_metadata.candidates_token_count}")
        print(f"Total: {response.usage_metadata.total_token_count}")
        print("===========================================\n")
        
        questions_data = json.loads(response.text.strip())

   
    except Exception as e:
        try:
            extracted = extract_text_from_pdf(target_path)
            questions_dataclass = extract_questions_from_text(extracted.text, limit=num_questions)
            
            # Converte a lista de DataClasses de volta para a lista de Dicionários que o React espera
            questions_data = [asdict(q) for q in questions_dataclass]
            
            warnings_list = list(extracted.warnings)
            warnings_list.append("O servidor de Inteligência Artificial estava indisponível. A prova foi lida usando o método de segurança offline.")
            
            if not questions_data:
                warnings_list.append("Nenhuma questão foi identificada pelo método de segurança local.")
                
            print("Questões extraídas via Regex")

        except Exception as ex_regex:
            if target_path.exists(): target_path.unlink()
            raise HTTPException(status_code=503, detail="Não foi possível processar a prova no momento.")

    # 3. Limpeza do disco (apaga o arquivo temporário) e Retorno
    if target_path.exists():
        target_path.unlink()

    return {
        "ok": True,
        "questions": questions_data,
        "warnings": warnings_list
    }