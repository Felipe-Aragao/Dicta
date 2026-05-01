import { useState } from "react";
import { DownloadSimple, ArrowRight, ClockCounterClockwise, Plus, User, MagnifyingGlass } from "@phosphor-icons/react";
import { HISTORY_DATA, DEMO_QUESTIONS } from "../data/demoData";

function Sidebar({ username, onLogout }) {
  return (
    <aside className="sidebar" aria-label="Menu lateral">
      <div className="sidebar-avatar" aria-hidden="true">
        <User size={30} weight="regular" color="white" />
      </div>
      <p className="sidebar-welcome">Bem vindo,<br />{username || "Aluno"}!</p>
      <p className="sidebar-role">Aluno</p>
      <button className="sidebar-logout" onClick={onLogout} aria-label="Sair da conta">
        Sair
      </button>
    </aside>
  );
}

export function HistoryScreen({ onNewQuestionnaire, username, onLogout, onOpenActivity }) {
  const [search, setSearch] = useState("");
  const [viewingActivity, setViewingActivity] = useState(null);

  const filtered = HISTORY_DATA.filter((h) => {
    const s = search.toLowerCase();
    // Busca robusta em todos os campos
    return (
      (h.name || "").toLowerCase().includes(s) ||
      (h.professor || "Prof. Ana Lima").toLowerCase().includes(s) ||
      (h.disciplina || "Prog. Orientada a Objetos").toLowerCase().includes(s) ||
      (h.date || "").toLowerCase().includes(s) ||
      (h.criadoem || "12/05/2026").toLowerCase().includes(s)
    );
  });

  return (
    <div className="auth-layout page-anim">
      <Sidebar username={username} onLogout={onLogout} />

      <div className="sidebar-main">
        <div className="page">
          <div className="page-wide">

            {/* Header + busca */}
            <div className="section-header">
              <div className="section-header-left">
                <h2 className="section-title">Histórico de Questionários</h2>
                <p className="section-sub">Atividades respondidas</p>
              </div>

              <div className="section-header-right" style={{ flex: 1, justifyContent: "flex-end" }}>
                <div className="search-wrap" role="search">
                  <span className="search-icon" aria-hidden="true">
                    <MagnifyingGlass size={17} weight="regular" />
                  </span>
                  <input
                    className="search-input"
                    type="search"
                    placeholder="Buscar atividade..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Buscar no histórico"
                  />
                </div>
                
                <div style={{ display: "flex", gap: "10px", marginLeft: "10px" }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => alert("Exportar PDF — integração futura")}
                    aria-label="Exportar histórico como PDF"
                  >
                    <DownloadSimple size={16} weight="regular" />
                    Exportar PDF
                  </button>
                  
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={onNewQuestionnaire}
                    aria-label="Responder novo questionário"
                  >
                    <Plus size={16} weight="bold" />
                    Nova Atividade
                  </button>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {filtered.length > 0 ? (
                <table className="data-table" role="table" aria-label="Histórico de questionários respondidos">
                  <thead>
                    <tr>
                      <th scope="col">Questionário</th>
                      <th scope="col">Professor · Disciplina</th>
                      <th scope="col">Criado em</th>
                      <th scope="col">Data de conclusão</th>
                      <th scope="col">Status</th>
                      <th scope="col"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((h, i) => (
                      <tr key={i} className="data-row" tabIndex={0}
                        onClick={() => setViewingActivity(h)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setViewingActivity(h); }}
                      >
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap"}}>
                            <ClockCounterClockwise size={15} color="var(--text-3)" weight="regular" />
                            {h.name}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontWeight: 600, color: "var(--text-1)", fontSize: "0.92rem" }}>
                              {h.professor || "Prof. Ana Lima"}
                            </span>
                            <span style={{ fontSize: "0.82rem", color: "var(--text-3)" }}>
                              {h.disciplina || "Prog. Orientada a Objetos"}
                            </span>
                          </div>
                        </td>
                        <td>{h.criadoem || "12/05/2026"}</td>
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
                <div style={{ padding: "72px 32px", textAlign: "center", color: "var(--text-3)", fontSize: "0.92rem" }} role="status">
                  {search ? `Nenhum resultado para "${search}".` : "Você ainda não respondeu nenhum questionário."}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
      
      {/* MODAL DE PRÉ-VISUALIZAÇÃO */}
      {viewingActivity && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setViewingActivity(null); }}>
          <div className="modal-card modal-card-wide">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-3)", marginBottom: 6 }}>
                  Pré-visualização
                </p>
                <h2 className="modal-title" style={{ marginBottom: 4 }}>
                  {viewingActivity.name}
                </h2>
                <p style={{ fontSize: "0.88rem", color: "var(--text-3)" }}>
                  {viewingActivity.professor || "Prof. Ana Lima"} · {viewingActivity.disciplina || "Prog. Orientada a Objetos"}
                </p>
              </div>
              <span className="badge badge-indigo">{DEMO_QUESTIONS.length} questões</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28, maxHeight: "50vh", overflowY: "auto" }}>
              {DEMO_QUESTIONS.map((q, i) => (
                <div key={q.id} className="preview-question-item">
                  <p className="preview-question-num">
                    Questão {i + 1} · {q.type === "multiple" ? "Múltipla escolha" : "Dissertativa"}
                  </p>
                  <p className="preview-question-text">{q.text}</p>
                  {q.type === "multiple" && q.options && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                      {q.options.map((opt, j) => (
                        <div key={j} className="preview-alt">
                          <span className="preview-alt-letter">
                            {["A","B","C","D"][j]}
                          </span>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="modal-actions" style={{ marginTop: 0 }}>
              <button className="btn btn-outline" style={{ width: "100%" }} onClick={() => setViewingActivity(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}