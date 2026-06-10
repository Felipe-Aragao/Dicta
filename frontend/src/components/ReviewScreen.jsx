import { useEffect } from "react";
import { useSpeech } from "../hooks/useSpeech"; 
// Letras das opcoes
const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

// Encontra resposta da questao
const getAnswerForQuestion = (answers, question, index) => (
  answers.find((item) => item?.questionId === question?.id) ||
  answers.find((item) => item?.qIdx === index)
);

// Formata resposta para exibicao
const formatAnswer = (question, answer) => {
  if (!answer) return "(sem resposta)";

  if (question?.type === "multiple") {
    const letter = answer?.chosenLetter ?? null;
    if (letter) {
      const optionIndex = OPTION_LETTERS.indexOf(letter);
      const optionText = question?.options?.[optionIndex];
      return optionText ? `${letter} - ${optionText}` : letter;
    }
    if (answer?.responseText) return answer.responseText;
  }

  return answer?.responseText || "(sem resposta)";
};

// Tela de revisao de respostas
export function ReviewScreen({ questions = [], answers = [], onEdit, onConfirm }) {
  const hasQuestions = Array.isArray(questions) && questions.length > 0;
  
  const { startRec, setCommands, speak, stopRec} = useSpeech();
  useEffect(() => {
    const timer = setTimeout(() => {
      startRec(() => {}); 
      speak("Tela de revisão. Confira suas respostas. Diga confirmar para entregar o questionário, ou alterar para corrigir.");
    }, 300);

    return () => {
      clearTimeout(timer);
      stopRec(); 
    };
  }, [startRec, speak, stopRec]);

  useEffect(() => {
    setCommands({
      "alterar": () => { if (onEdit) onEdit(); },
      "voltar": () => { if (onEdit) onEdit(); }, 
      "confirmar": () => { if (onConfirm) onConfirm(); },
      "confirmar e finalizar": () => { if (onConfirm) onConfirm(); },
      "finalizar": () => { if (onConfirm) onConfirm(); } // Garante caso o aluno repita o comando anterior
    });
  }, [setCommands, onEdit, onConfirm]);


  return (
    <div className="page page-anim">
      <div className="page-wide">
        <div className="section-header">
          <div className="section-header-left">
            <h2 className="section-title">Revisar respostas</h2>
            <p className="section-sub">Confira tudo antes de finalizar</p>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {hasQuestions ? (
            <table className="data-table" role="table" aria-label="Revisao de respostas">
              <thead>
                <tr>
                  <th scope="col">Questao</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Resposta</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((question, index) => {
                  const answer = getAnswerForQuestion(answers, question, index);
                  return (
                    <tr key={question?.id ?? index} className="data-row">
                      <td style={{ width: "45%" }}>{question?.text || "Questao sem enunciado"}</td>
                      <td>{question?.type === "multiple" ? "Multipla escolha" : "Dissertativa"}</td>
                      <td>{formatAnswer(question, answer)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: "64px 32px", textAlign: "center", color: "var(--text-3)", fontSize: "0.92rem" }} role="status">
              Nenhuma questao encontrada.
            </div>
          )}
        </div>

        <div className="nav-row" style={{ marginTop: 20 }}>
          <button
            className="btn btn-outline"
            onClick={onEdit}
            aria-label="Alterar respostas"
          >
            Alterar
          </button>
          <button
            className="btn btn-primary"
            onClick={onConfirm}
            aria-label="Confirmar e finalizar questionario"
          >
            Confirmar e finalizar
          </button>
        </div>
      </div>
    </div>
  );
}
