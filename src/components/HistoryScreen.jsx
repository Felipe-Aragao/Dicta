import { DownloadSimple, ArrowRight, ClockCounterClockwise, Plus, User } from "@phosphor-icons/react";
import { HISTORY_DATA } from "../data/demoData";

// ─── Sidebar ────────────────────────────────────────────────────
function Sidebar({ username, role, onLogout }) {
  const label = role === "professor" ? "Professor" : role === "aluno" ? "Aluno" : "Visitante";
  return (
    <aside className="sidebar" aria-label="Menu lateral">
    <div className="sidebar-avatar" aria-hidden="true">
    <User size={30} weight="regular" color="white" />
    </div>
    <p className="sidebar-welcome">
    Bem vindo,<br />{username || label}!
    </p>
    <p className="sidebar-role">{label}</p>
    <button
    className="sidebar-logout"
    onClick={onLogout}
    aria-label="Sair da conta"
    >
    Sair
    </button>
    </aside>
  );
}

// ─── Tela principal ──────────────────────────────────────────────
export function HistoryScreen({ onNewQuestionnaire, username, onLogout }) {
  return (
    <div className="auth-layout page-anim">
    <Sidebar username={username} role="aluno" onLogout={onLogout} />

    <div className="sidebar-main">
    <div className="page">
    <div className="page-wide">

    {/* Card CTA — Nova Atividade */}
    <div style={{
      display: "flex",
      justifyContent: "flex-end",
      marginBottom: 32,
    }}>
    <button
    className="card"
    onClick={onNewQuestionnaire}
    aria-label="Criar ou responder novo questionário"
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 12,
      padding: "28px 32px",
      width: 260,
      cursor: "pointer",
      border: "1.5px solid var(--border)",
          borderRadius: "var(--r-lg)",
          background: "var(--surface)",
          textAlign: "left",
          transition: "all .18s",
          fontFamily: "var(--font)",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = "var(--indigo-200)";
      e.currentTarget.style.background   = "var(--indigo-50)";
      e.currentTarget.style.boxShadow    = "0 4px 20px rgba(79,70,229,.1)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = "var(--border)";
      e.currentTarget.style.background   = "var(--surface)";
      e.currentTarget.style.boxShadow    = "none";
    }}
    >
    {/* Ícone "+" */}
    <div style={{
      width: 40, height: 40,
      borderRadius: "var(--r-md)",
          background: "var(--indigo-50)",
          border: "1px solid var(--indigo-200)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--accent)",
    }}>
    <Plus size={20} weight="bold" />
    </div>
    <div>
    <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>
    Nova Atividade
    </p>
    <p style={{ fontSize: "0.82rem", color: "var(--text-3)", lineHeight: 1.5 }}>
    Envie um novo material para começar
    </p>
    </div>
    </button>
    </div>

    {/* Histórico */}
    <div className="section-header">
    <div>
    <h2 className="section-title">Histórico de Questionários</h2>
    <p className="section-sub">Atividades respondidas</p>
    </div>
    <button
    className="btn btn-outline btn-sm"
    onClick={() => alert("Exportar PDF — integração futura")}
    aria-label="Exportar histórico como PDF"
    >
    <DownloadSimple size={16} weight="regular" />
    Exportar PDF
    </button>
    </div>

    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
    {HISTORY_DATA.length > 0 ? (
      <table
      className="data-table"
      role="table"
      aria-label="Histórico de questionários respondidos"
      >
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
          if (e.key === "Enter" || e.key === " ")
            alert(`Abrindo: ${h.name}`);
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
      style={{ padding: "72px 32px", textAlign: "center", color: "var(--text-3)", fontSize: "0.92rem" }}
      role="status"
      >
      Você ainda não respondeu nenhum questionário.
      </div>
    )}
    </div>

    </div>
    </div>
    </div>
    </div>
  );
}
