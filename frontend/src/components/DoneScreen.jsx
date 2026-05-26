import { CheckCircle, DownloadSimple, ArrowLeft } from "@phosphor-icons/react";

// Tela de finalizacao
export function DoneScreen({ role, onGenerate, onHome }) {
  const homeLabel = role === "aluno" ? "Ir para Minha Área" : "Responder outro questionário";

  return (
    <div className="page-center page-anim">

    <div className="done-icon-wrap" aria-hidden="true">
    <CheckCircle size={36} weight="regular" />
    </div>

    <h2 className="done-title">Questionário concluído!</h2>
    <p className="done-sub">
    Todas as respostas foram salvas com sucesso.
    <br />
    Você pode gerar o PDF ou voltar ao início.
    </p>

    <div className="done-actions">

   
    <button
    className="btn btn-primary btn-lg btn-full"
    onClick={onGenerate}
    aria-label="Gerar e baixar PDF com as respostas"
    >
    <DownloadSimple size={20} weight="regular" />
    Gerar PDF das Respostas
    </button>

  
    {/* Voltar ao inicio */}
    <button
    className="btn btn-ghost btn-full"
    onClick={onHome}
    aria-label={homeLabel}
    style={{ marginTop: 4 }}
    >
    <ArrowLeft size={16} weight="regular" />
    {homeLabel}
    </button>

    </div>

    </div>
  );
}
