from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import re

from sqlalchemy.orm import Session

from app.models.attempts import Attempt
from app.services.activity_service import ActivityService
from app.services.answer_service import AnswerService
from app.services.question_service import QuestionService
from app.services.user_service import UserService

BASE_DIR = Path(__file__).resolve().parents[1]
GENERATED_DIR = BASE_DIR / "storage" / "generated_pdfs"
GENERATED_DIR.mkdir(parents=True, exist_ok=True)

INVALID_FILENAME_RE = re.compile(r"[<>:\"/\\|?*\x00-\x1F]+")
MAX_FILENAME_LENGTH = 150


@dataclass(frozen=True)
class GeneratedAttemptPdf:
    path: Path
    filename: str


class AttemptPdfError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def sanitize_filename(value: str) -> str:
    cleaned = INVALID_FILENAME_RE.sub("", value or "").strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    if not cleaned:
        return "respostas"
    return cleaned[:MAX_FILENAME_LENGTH].rstrip()


def answer_text(answer, question) -> str:
    if not answer:
        return "Sem resposta."
    if answer.response_text:
        text = answer.response_text.strip()
        return text or "Sem resposta."
    if answer.chosen_letter:
        if question and getattr(question, "options", None):
            for option in question.options:
                if option.letter == answer.chosen_letter:
                    return f"{answer.chosen_letter}) {option.text}"
        return answer.chosen_letter
    return "Sem resposta."


def _safe_text(value) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        value = str(value)
    try:
        return value.encode("latin-1", "replace").decode("latin-1")
    except Exception:
        return value


def _build_attempt_pdf(
    file_path: Path,
    activity_name: str,
    professor_name: str,
    aluno_name: str,
    questions,
    answers_by_question,
    generated_at: datetime,
):
    try:
        from fpdf import FPDF
    except ImportError as exc:
        raise AttemptPdfError(500, "Biblioteca fpdf2 nao instalada") from exc

    pdf = FPDF()
    pdf.set_left_margin(15)
    pdf.set_top_margin(15)
    pdf.set_right_margin(15)
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    activity_name = _safe_text(activity_name)
    professor_name = _safe_text(professor_name)
    aluno_name = _safe_text(aluno_name)

    w = pdf.epw

    pdf.set_font("Arial", size=14)
    pdf.multi_cell(w, 7, txt=f"Atividade: {activity_name}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Arial", size=11)
    pdf.multi_cell(w, 6, txt=f"Professor: {professor_name}", new_x="LMARGIN", new_y="NEXT")
    pdf.multi_cell(w, 6, txt=f"Aluno: {aluno_name}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.set_font("Arial", size=12)
    if not questions:
        pdf.multi_cell(w, 6, txt="Nenhuma questao encontrada.", new_x="LMARGIN", new_y="NEXT")

    for index, question in enumerate(questions, 1):
        prompt = _safe_text(getattr(question, "prompt", ""))
        pdf.multi_cell(w, 6, txt=f"{index}. {prompt}", new_x="LMARGIN", new_y="NEXT")
        resolved_answer_text = _safe_text(answer_text(answers_by_question.get(question.id), question))
        pdf.set_font("Arial", size=11)
        pdf.multi_cell(w, 6, txt=f"Resposta: {resolved_answer_text}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)
        pdf.set_font("Arial", size=12)

    pdf.ln(2)
    pdf.set_font("Helvetica", size=10)
    generated_label = generated_at.astimezone().strftime("%d/%m/%Y %H:%M")
    pdf.cell(w, 6, txt=f"Gerado em: {generated_label}", new_x="LMARGIN", new_y="NEXT")

    pdf.output(str(file_path))


class AttemptPdfService:
    def __init__(self, db: Session):
        self.db = db

    def generate_for_attempt(self, attempt: Attempt) -> GeneratedAttemptPdf:
        activity = ActivityService(self.db).get(attempt.activity_id)
        if not activity:
            raise AttemptPdfError(404, "Atividade não encontrada.")

        professor = UserService(self.db).get(activity.owner_id)
        if not professor:
            raise AttemptPdfError(404, "Professor não encontrado.")

        questions = QuestionService(self.db).list(activity_id=activity.id, skip=0, limit=1000)
        answers = AnswerService(self.db).list(attempt_id=attempt.id, skip=0, limit=1000)
        answers_by_question = {answer.question_id: answer for answer in answers}

        aluno_name = attempt.aluno.name if attempt.aluno else attempt.visitor_name or "Visitante"
        base_filename = f"{activity.name} - {professor.name} - {aluno_name}"
        file_name = f"{sanitize_filename(base_filename)}.pdf"
        file_path = GENERATED_DIR / file_name

        generated_at = datetime.now(timezone.utc)
        _build_attempt_pdf(
            file_path=file_path,
            activity_name=activity.name,
            professor_name=professor.name,
            aluno_name=aluno_name,
            questions=questions,
            answers_by_question=answers_by_question,
            generated_at=generated_at,
        )

        attempt.pdf_url = f"/attempts/{attempt.id}/pdf"
        attempt.pdf_generated_at = generated_at
        self.db.add(attempt)
        self.db.commit()

        return GeneratedAttemptPdf(path=file_path, filename=file_name)
