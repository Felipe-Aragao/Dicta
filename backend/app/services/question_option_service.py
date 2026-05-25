from typing import Optional
import uuid

from sqlalchemy.orm import Session

from app.models.question_options import QuestionOption
from app.schemas.question_option import QuestionOptionCreate, QuestionOptionUpdate


# Compatibilidade entre Pydantic v1/v2
def _model_dump(model, **kwargs):
    if hasattr(model, "model_dump"):
        return model.model_dump(**kwargs)
    return model.dict(**kwargs)


class QuestionOptionService:
    def __init__(self, db: Session):
        self.db = db

    # Cria uma opcao de questao
    def create(self, data: QuestionOptionCreate) -> QuestionOption:
        payload = _model_dump(data, exclude_none=True)
        option = QuestionOption(**payload)
        self.db.add(option)
        self.db.commit()
        self.db.refresh(option)
        return option

    # Lista opcoes com filtros
    def list(
        self,
        question_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[QuestionOption]:
        query = self.db.query(QuestionOption)
        if question_id:
            query = query.filter(QuestionOption.question_id == question_id)
        return query.order_by(QuestionOption.letter.asc()).offset(skip).limit(limit).all()

    # Busca opcao por id
    def get(self, option_id: uuid.UUID) -> Optional[QuestionOption]:
        return self.db.query(QuestionOption).filter(QuestionOption.id == option_id).first()

    # Atualiza opcao existente
    def update(self, option: QuestionOption, data: QuestionOptionUpdate) -> QuestionOption:
        updates = _model_dump(data, exclude_unset=True)
        for field, value in updates.items():
            setattr(option, field, value)
        self.db.add(option)
        self.db.commit()
        self.db.refresh(option)
        return option

    # Remove opcao
    def delete(self, option: QuestionOption) -> None:
        self.db.delete(option)
        self.db.commit()
