import { DownloadSimple, ArrowRight, ClockCounterClockwise, Plus } from "@phosphor-icons/react";
import { HISTORY_DATA } from "../data/demoData";

export function HistoryScreen({ onNewQuestionnaire }) {
  return (
    <div className="page page-anim">
      <div className="page-wide">

        <div className="section-header">
          <div>
            <h2 className="section-title">Meus Questionários</h2>
            <p className="section-sub">Histórico de atividades respondidas</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-outline"
              onClick={() => alert("Exportar PDF — integração futura")}
              aria-label="Exportar histórico como PDF"
            >
              <DownloadSimple size={16} weight="regular" />
              Exportar
            </button>
            <button
              className="btn btn-primary"
              onClick={onNewQuestionnaire}
              aria-label="Responder novo questionário"
            >
              <Plus size={16} weight="bold" />
              Novo Questionário
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {HISTORY_DATA.length > 0 ? (
            <table className="data-table" role="table" aria-label="Histórico de questionários respondidos">
              <thead>
                <tr>
                  <th scope="col">Questionário</th>
                  <th scope="col">Data de conclusão</th>
                  <th scope="col">Status</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {HISTORY_DATA.map((h, i) => (
                  <tr
                    key={i}
                    className="data-row"
                    tabIndex={0}
                    aria-label={`${h.name}, concluído em ${h.date}`}
                    onClick={() => alert(`Abrindo: ${h.name}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") alert(`Abrindo: ${h.name}`);
                    }}
                  >
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <ClockCounterClockwise size={15} color="var(--text-3)" weight="regular" />
                        {h.name}
                      </div>
                    </td>
                    <td>{h.date}</td>
                    <td><span className="badge badge-green">{h.status}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <ArrowRight size={15} color="var(--text-3)" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div
              style={{ padding: "72px 32px", textAlign: "center", color: "var(--text-3)", fontSize: "0.9rem" }}
              role="status"
            >
              Você ainda não respondeu nenhum questionário.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
