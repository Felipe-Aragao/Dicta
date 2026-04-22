import { useState, useRef } from "react";
import {
  Plus, Users, FilePdf, ArrowRight,
  CheckCircle, Link, Check, User,
} from "@phosphor-icons/react";

const MOCK_QUESTIONARIOS = [
  { id: 1, nome: "Atividade 8", status: "Ativo", criadoEm: "12/07/2026", alunos: 4,  link: "https://app.example.com/q/atv8"  },
{ id: 2, nome: "Atividade 7", status: "Ativo", criadoEm: "19/05/2026", alunos: 8,  link: "https://app.example.com/q/atv7"  },
{ id: 3, nome: "Prova 8",     status: "Ativo", criadoEm: "04/06/2026", alunos: 7,  link: "https://app.example.com/q/prov8" },
];

// ─── Sidebar ────────────────────────────────────────────────────
function Sidebar({ username, onLogout }) {
  return (
    <aside className="sidebar" aria-label="Menu lateral">
    <div className="sidebar-avatar" aria-hidden="true">
    <User size={30} weight="regular" color="white" />
    </div>
    <p className="sidebar-welcome">
    Bem vindo,<br />{username || "Professor"}!
    </p>
    <p className="sidebar-role">Professor</p>
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

// ─── Botão copiar link ───────────────────────────────────────────
function CopyLinkButton({ link }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
    className={`copy-btn${copied ? " copied" : ""}`}
    onClick={handleCopy}
    aria-label={copied ? "Link copiado!" : "Copiar link da atividade"}
    title={link}
    >
    {copied
      ? <><Check size={13} weight="bold" /> Copiado</>
      : <><Link size={13} weight="regular" /> Copiar link</>}
      </button>
  );
}

// ─── Modal Nova Atividade ────────────────────────────────────────
function NovaAtividadeModal({ onClose, onCreate }) {
  const [nome, setNome]       = useState("");
  const [file, setFile]       = useState(null);
  const [over, setOver]       = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef              = useRef();

  const handleFile  = (f) => { if (f?.type === "application/pdf") setFile(f); };
  const canCreate   = nome.trim().length > 0 && file !== null;

  const handleSubmit = () => {
    if (!canCreate) return;
    setLoading(true);
    setTimeout(() => { onCreate(nome.trim(), file.name); onClose(); }, 2000);
  };

  return (
    <div
    className="modal-overlay"
    role="dialog" aria-modal="true" aria-labelledby="modal-h"
    onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
    <div className="modal-card">
    <h2 className="modal-title" id="modal-h">Nova Atividade</h2>

    <div className="field-wrap" style={{ marginBottom: 22 }}>
    <label className="field-label" htmlFor="ativ-nome">Nome da atividade</label>
    <input
    id="ativ-nome" className="text-input" type="text"
    value={nome} onChange={(e) => setNome(e.target.value)}
    onKeyDown={(e) => { if (e.key === "Enter" && canCreate) handleSubmit(); }}
    placeholder="Ex: Atividade 9, Prova Final..."
    autoFocus disabled={loading}
    />
    </div>

    <div className="field-wrap" style={{ marginBottom: 8 }}>
    <span className="field-label">Arquivo de questões (PDF)</span>
    </div>

    {!file ? (
      <div
      className={`upload-zone compact${over ? " over" : ""}`}
      role="button" tabIndex={0}
      aria-label="Clique ou arraste um PDF para enviar"
      onClick={() => !loading && inputRef.current?.click()}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !loading) { e.preventDefault(); inputRef.current?.click(); } }}
      onDragOver={(e)  => { e.preventDefault(); setOver(true); }}
      onDragLeave={()  => setOver(false)}
      onDrop={(e)      => { e.preventDefault(); setOver(false); handleFile(e.dataTransfer.files[0]); }}
      >
      <div className="upload-icon-wrap">
      <FilePdf size={22} weight="regular" />
      </div>
      <p className="upload-title" style={{ fontSize: "0.95rem" }}>Arraste o PDF aqui</p>
      <p className="upload-sub"  style={{ fontSize: "0.85rem" }}>ou clique para selecionar</p>
      </div>
    ) : (
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "14px 16px",
        background: "var(--green-50)", border: "1px solid var(--green-100)", borderRadius: "var(--r-md)",
      }}>
      <CheckCircle size={18} color="var(--green-600)" weight="fill" />
      <span style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--green-700)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {file.name}
      </span>
      <button
      className="btn btn-ghost btn-sm"
      style={{ minHeight: 36, padding: "0 10px", fontSize: "0.82rem" }}
      onClick={() => setFile(null)} disabled={loading} aria-label="Remover arquivo"
      >
      Remover
      </button>
      </div>
    )}

    <input ref={inputRef} type="file" accept=".pdf" style={{ display: "none" }}
    onChange={(e) => handleFile(e.target.files[0])} />

    {loading && (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", color: "var(--text-3)", fontSize: "0.9rem" }}>
      <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} aria-hidden="true" />
      Extraindo questões do PDF...
      </div>
    )}

    <div className="modal-actions">
    <button className="btn btn-outline" onClick={onClose} disabled={loading}>Cancelar</button>
    <button className="btn btn-primary" disabled={!canCreate || loading} onClick={handleSubmit}>
    {loading ? "Criando..." : "Criar atividade"}
    </button>
    </div>
    </div>
    </div>
  );
}

// ─── Tela principal ──────────────────────────────────────────────
export function ProfessorScreen({ username, onLogout }) {
  const [questionarios, setQuestionarios] = useState(MOCK_QUESTIONARIOS);
  const [showModal, setShowModal]         = useState(false);

  const handleCreate = (nome) => {
    const slug = nome.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setQuestionarios((prev) => [{
      id: Date.now(), nome,
                     status: "Ativo",
                     criadoEm: new Date().toLocaleDateString("pt-BR"),
                     alunos: 0,
                     link: `https://app.example.com/q/${slug}`,
    }, ...prev]);
  };

  return (
    <>
    <div className="auth-layout page-anim">
    <Sidebar username={username} onLogout={onLogout} />

    <div className="sidebar-main">
    <div className="page">
    <div className="page-wide">

    <div className="section-header">
    <div>
    <h2 className="section-title">Gerar Questionários</h2>
    <p className="section-sub">
    {questionarios.length} atividade{questionarios.length !== 1 ? "s" : ""} criada{questionarios.length !== 1 ? "s" : ""}
    </p>
    </div>
    <button
    className="btn btn-primary"
    onClick={() => setShowModal(true)}
    aria-label="Criar nova atividade"
    >
    <Plus size={17} weight="bold" />
    Nova Atividade
    </button>
    </div>

    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
    <table className="data-table" role="table" aria-label="Lista de questionários">
    <thead>
    <tr>
    <th scope="col">Questionário</th>
    <th scope="col">Status</th>
    <th scope="col">Criado em</th>
    <th scope="col">Alunos</th>
    <th scope="col">Link</th>
    <th scope="col"></th>
    </tr>
    </thead>
    <tbody>
    {questionarios.map((q) => (
      <tr
      key={q.id} className="data-row" tabIndex={0}
      aria-label={`${q.nome}, ${q.status}, ${q.criadoEm}`}
      onClick={() => alert(`Abrindo: ${q.nome}`)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") alert(`Abrindo: ${q.nome}`); }}
      >
      <td>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <FilePdf size={16} color="var(--text-3)" weight="regular" />
      {q.nome}
      </div>
      </td>
      <td><span className="badge badge-green">{q.status}</span></td>
      <td>{q.criadoEm}</td>
      <td>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-3)", fontSize: "0.9rem" }}>
      <Users size={14} weight="regular" />
      {q.alunos} aluno{q.alunos !== 1 ? "s" : ""}
      </div>
      </td>
      <td onClick={(e) => e.stopPropagation()}>
      <CopyLinkButton link={q.link} />
      </td>
      <td style={{ textAlign: "right" }}>
      <ArrowRight size={15} color="var(--text-3)" />
      </td>
      </tr>
    ))}
    </tbody>
    </table>

    {questionarios.length === 0 && (
      <div style={{ padding: "64px 32px", textAlign: "center", color: "var(--text-3)", fontSize: "0.92rem" }} role="status">
      Nenhuma atividade criada ainda.
      </div>
    )}
    </div>

    </div>
    </div>
    </div>
    </div>

    {showModal && (
      <NovaAtividadeModal
      onClose={() => setShowModal(false)}
      onCreate={handleCreate}
      />
    )}
    </>
  );
}
