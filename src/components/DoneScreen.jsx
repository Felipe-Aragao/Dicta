import { CheckCircle, PencilSimple, DownloadSimple, ArrowLeft, ArrowCounterClockwise } from "@phosphor-icons/react";

export function DoneScreen({ role, onEdit, onGenerate, onHome }) {
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
    Você pode revisar, gerar o PDF ou voltar ao início.
    </p>

    <div className="done-actions">

    {/* Ação principal */}
    <button
    className="btn btn-primary btn-lg btn-full"
    onClick={onGenerate}
    aria-label="Gerar e baixar PDF com as respostas"
    >
    <DownloadSimple size={20} weight="regular" />
    Gerar PDF das Respostas
    </button>

    {/* Ação secundária */}
    <button
    className="btn btn-outline btn-lg btn-full"
    onClick={onEdit}
    aria-label="Revisar e editar respostas antes de gerar o PDF"
    >
    <PencilSimple size={18} weight="regular" />
    Revisar Respostas
    </button>

    {/* Voltar ao início */}
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

    {/* Dica de navegação */}
    <p className="done-nav-hint" aria-live="polite">
    <ArrowCounterClockwise size={14} weight="regular" />
    Use o botão "Revisar" ou o navegador para voltar às questões anteriores.
    </p>

    </div>
  );
}
