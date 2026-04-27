import { useState } from "react";
import { DownloadSimple, ArrowRight, ClockCounterClockwise, Plus, User, MagnifyingGlass } from "@phosphor-icons/react";
import { HISTORY_DATA } from "../data/demoData";

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

export function HistoryScreen({ onNewQuestionnaire, username, onLogout }) {
  const [search, setSearch] = useState("");

  const filtered = HISTORY_DATA.filter((h) =>
  h.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="auth-layout page-anim">
    <Sidebar username={username} onLogout={onLogout} />

    <div className="sidebar-main">
    <div className="page">
    <div className="page-wide">

    {/* Card CTA — Nova Atividade */}
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 32 }}>
    <button
    onClick={onNewQuestionnaire}
    aria-label="Responder novo questionário"
    style={{
      display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12,
      padding: "28px 32px", width: 260,
      cursor: "pointer",
      border: "1.5px solid var(--border)", borderRadius: "var(--r-lg)",
          background: "var(--surface)", textAlign: "left",
          transition: "all .18s", fontFamily: "var(--font)",
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
    <div style={{
      width: 40, height: 40, borderRadius: "var(--r-md)",
          background: "var(--indigo-50)", border: "1px solid var(--indigo-200)",
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

    {/* Header + busca */}
    <div className="section-header">
    <div className="section-header-left">
    <h2 className="section-title">Histórico de Questionários</h2>
    <p className="section-sub">Atividades respondidas</p>
    </div>
    <div className="section-header-right">
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
    <button
    className="btn btn-outline btn-sm"
    onClick={() => alert("Exportar PDF — integração futura")}
    aria-label="Exportar histórico como PDF"
    >
    <DownloadSimple size={16} weight="regular" />
    Exportar PDF
    </button>
    </div>
    </div>

    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
    {filtered.length > 0 ? (
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
      {filtered.map((h, i) => (
        <tr key={i} className="data-row" tabIndex={0}
        aria-label={`${h.name}, concluído em ${h.date}`}
        onClick={() => alert(`Abrindo: ${h.name}`)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") alert(`Abrindo: ${h.name}`); }}
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
      <div style={{ padding: "72px 32px", textAlign: "center", color: "var(--text-3)", fontSize: "0.92rem" }} role="status">
      {search ? `Nenhum resultado para "${search}".` : "Você ainda não respondeu nenhum questionário."}
      </div>
    )}
    </div>

    </div>
    </div>
    </div>
    </div>
  );
}
