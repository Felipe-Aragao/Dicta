import { CheckCircle, PencilSimple, DownloadSimple, ArrowLeft } from "@phosphor-icons/react";

export function DoneScreen({ onEdit, onGenerate, onHome }) {
  return (
    <div className="page-center page-anim">
      <div className="done-icon-wrap" aria-hidden="true">
        <CheckCircle size={32} weight="regular" />
      </div>

      <h2 className="done-title">Questionário concluído</h2>
      <p className="done-sub">
        Todas as respostas foram salvas com sucesso.
        <br />
        Você pode revisar ou gerar o PDF final.
      </p>

      <div className="done-actions">
        <button
          className="btn btn-outline btn-lg btn-full"
          onClick={onEdit}
          aria-label="Revisar respostas"
        >
          <PencilSimple size={17} weight="regular" />
          Revisar respostas
        </button>

        <button
          className="btn btn-primary btn-lg btn-full"
          onClick={onGenerate}
          aria-label="Gerar PDF com respostas"
        >
          <DownloadSimple size={17} weight="regular" />
          Gerar PDF
        </button>

        <button
          className="btn btn-ghost btn-full"
          onClick={onHome}
          aria-label="Enviar novo material"
        >
          <ArrowLeft size={15} weight="regular" />
          Enviar novo material
        </button>
      </div>
    </div>
  );
}
