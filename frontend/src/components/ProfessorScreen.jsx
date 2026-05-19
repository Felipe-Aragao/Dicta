import { useState, useRef } from "react";
import {
  Plus, Users, FilePdf, ArrowRight,
  CheckCircle, Link, Check, User,
  MagnifyingGlass, Eye, ArrowLeft,
} from "@phosphor-icons/react";

// ─── Questões falsas para preview ───────────────────────────────
const FAKE_QUESTIONS = [
  {
    id: 1, type: "open",
    text: "Qual a melhor descrição da diferença entre arrays unidimensionais e multidimensionais?",
  },
  {
    id: 2, type: "multiple",
    text: "Em Java, qual modificador de acesso torna um membro acessível somente dentro da própria classe?",
    options: ["public", "protected", "private", "default"],
  },
  {
    id: 3, type: "open",
    text: "Explique o conceito de herança em Programação Orientada a Objetos e dê um exemplo prático.",
  },
  {
    id: 4, type: "multiple",
    text: "Qual estrutura de dados segue o princípio LIFO (Last In, First Out)?",
    options: ["Fila (Queue)", "Pilha (Stack)", "Lista ligada", "Árvore binária"],
  },
  {
    id: 5, type: "open",
    text: "O que é polimorfismo e como ele pode ser implementado em linguagens orientadas a objetos?",
  },
];

const MOCK_QUESTIONARIOS = [
  { id: 1, nome: "Atividade 8", professor: "Prof. Ana Lima",    disciplina: "Prog. Orientada a Objetos", status: "Ativo", criadoEm: "12/07/2026", alunos: 4,  link: "https://app.example.com/q/atv8"  },
  { id: 2, nome: "Atividade 7", professor: "Prof. Ana Lima",    disciplina: "Prog. Orientada a Objetos", status: "Ativo", criadoEm: "19/05/2026", alunos: 8,  link: "https://app.example.com/q/atv7"  },
  { id: 3, nome: "Prova 8",     professor: "Prof. Carlos Melo", disciplina: "Estrutura de Dados",        status: "Ativo", criadoEm: "04/06/2026", alunos: 7,  link: "https://app.example.com/q/prov8" },
];

// ─── Sidebar ─────────────────────────────────────────────────────
function Sidebar({ username, onLogout }) {
  return (
    <aside className="sidebar" aria-label="Menu lateral">
      <div className="sidebar-avatar" aria-hidden="true">
        <User size={30} weight="regular" color="white" />
      </div>
      <p className="sidebar-welcome">Bem vindo,<br />{username || "Professor"}!</p>
      <p className="sidebar-role">Professor</p>
      <button className="sidebar-logout" onClick={onLogout} aria-label="Sair da conta">
        Sair
      </button>
    </aside>
  );
}

// ─── Botão copiar link ────────────────────────────────────────────
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

// ─── Modal: Preview da prova ──────────────────────────────────────
function PreviewModal({ nomeAtividade, professor, disciplina, onBack, onConfirm }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="preview-h">
      <div className="modal-card modal-card-wide">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-3)", marginBottom: 6 }}>
              Pré-visualização
            </p>
            <h2 className="modal-title" id="preview-h" style={{ marginBottom: 4 }}>
              {nomeAtividade}
            </h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-3)" }}>
              {professor} · {disciplina}
            </p>
          </div>
          <span className="badge badge-indigo">{FAKE_QUESTIONS.length} questões</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 8 }}>
          {FAKE_QUESTIONS.map((q, i) => (
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

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onBack} aria-label="Voltar e editar">
            <ArrowLeft size={16} weight="regular" />
            Voltar
          </button>
          <button className="btn btn-primary" onClick={onConfirm} aria-label="Confirmar e publicar atividade">
            <CheckCircle size={17} weight="regular" />
            Confirmar e Publicar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Nova Atividade ────────────────────────────────────────
function NovaAtividadeModal({ onClose, onPreview }) {
  const [nome, setNome]           = useState("");
  const [nomeProf, setNomeProf]   = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [file, setFile]           = useState(null);
  const [over, setOver]           = useState(false);
  const [loading, setLoading]     = useState(false);
  const inputRef                  = useRef();

  const handleFile = (f) => { if (f?.type === "application/pdf") setFile(f); };
  const canNext    = nome.trim() && nomeProf.trim() && disciplina.trim() && file;

  const handleNext = () => {
    if (!canNext) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onPreview({ nome: nome.trim(), professor: nomeProf.trim(), disciplina: disciplina.trim() });
    }, 1500);
  };

  return (
    <div
      className="modal-overlay"
      role="dialog" aria-modal="true" aria-labelledby="modal-h"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div className="modal-card">
        <h2 className="modal-title" id="modal-h">Nova Atividade</h2>
        <div className="field-group">
          <div className="field-wrap">
            <label className="field-label" htmlFor="ativ-nome">Nome da atividade</label>
            <input id="ativ-nome" className="text-input" type="text"
              value={nome} onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Atividade 9, Prova Final..." autoFocus disabled={loading} />
          </div>
          <div className="field-wrap">
            <label className="field-label" htmlFor="ativ-prof">Nome do professor</label>
            <input id="ativ-prof" className="text-input" type="text"
              value={nomeProf} onChange={(e) => setNomeProf(e.target.value)}
              placeholder="Ex: Prof. Maria Silva" disabled={loading} />
          </div>
          <div className="field-wrap">
            <label className="field-label" htmlFor="ativ-disc">Disciplina</label>
            <input id="ativ-disc" className="text-input" type="text"
              value={disciplina} onChange={(e) => setDisciplina(e.target.value)}
              placeholder="Ex: Programação 3" disabled={loading} />
          </div>
        </div>

        <div className="field-wrap" style={{ marginBottom: 8 }}>
          <span className="field-label">Arquivo de questões (PDF)</span>
        </div>

        {!file ? (
          <div
            className={`upload-zone compact${over ? " over" : ""}`}
            role="button" tabIndex={0}
            onClick={() => !loading && inputRef.current?.click()}
            onDragOver={(e)  => { e.preventDefault(); setOver(true); }}
            onDragLeave={()  => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); handleFile(e.dataTransfer.files[0]); }}
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
            <button className="btn btn-ghost btn-sm" style={{ minHeight: 36, padding: "0 10px", fontSize: "0.82rem" }}
              onClick={() => setFile(null)} disabled={loading}>
              Remover
            </button>
          </div>
        )}
        <input ref={inputRef} type="file" accept=".pdf" style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files[0])} />

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", color: "var(--text-3)", fontSize: "0.9rem" }}>
            <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} aria-hidden="true" />
            Lendo questões do PDF...
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" disabled={!canNext || loading} onClick={handleNext}>
            <Eye size={17} weight="regular" />
            {loading ? "Carregando..." : "Pré-visualizar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tela principal ───────────────────────────────────────────────
export function ProfessorScreen({ username, onLogout }) {
  const [questionarios, setQuestionarios] = useState(MOCK_QUESTIONARIOS);
  const [showModal, setShowModal]         = useState(false);
  const [previewData, setPreviewData]     = useState(null);
  const [search, setSearch]               = useState("");
  const [viewingActivity, setViewingActivity] = useState(null);

  const filtered = questionarios.filter((q) =>
    q.nome.toLowerCase().includes(search.toLowerCase()) ||
    q.professor.toLowerCase().includes(search.toLowerCase()) ||
    q.disciplina.toLowerCase().includes(search.toLowerCase())
  );

  const handlePreview = (data) => {
    setShowModal(false);
    setPreviewData(data);
  };

  const handleConfirm = () => {
    const { nome, professor, disciplina } = previewData;
    const slug = nome.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setQuestionarios((prev) => [{
      id: Date.now(), nome, professor, disciplina,
      status: "Ativo",
      criadoEm: new Date().toLocaleDateString("pt-BR"),
      alunos: 0,
      link: `https://app.example.com/q/${slug}`,
    }, ...prev]);
    setPreviewData(null);
  };

  return (
    <>
      <div className="auth-layout page-anim">
        <Sidebar username={username} onLogout={onLogout} />

        <div className="sidebar-main">
          <div className="page">
            <div className="page-wide">

              <div className="section-header">
                <div className="section-header-left">
                  <h2 className="section-title">Gerar Questionários</h2>
                  <p className="section-sub">
                    {questionarios.length} atividade{questionarios.length !== 1 ? "s" : ""} criada{questionarios.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="section-header-right" style={{ flex: 1, justifyContent: "flex-end" }}>
                  <div className="search-wrap" role="search">
                    <span className="search-icon" aria-hidden="true">
                      <MagnifyingGlass size={17} weight="regular" />
                    </span>
                    <input
                      className="search-input"
                      type="search"
                      placeholder="Buscar atividade, professor..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      aria-label="Buscar atividades"
                    />
                  </div>
                  
                  <div style={{ display: "flex", marginLeft: "10px" }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowModal(true)}
                      aria-label="Criar nova atividade"
                    >
                      <Plus size={17} weight="bold" />
                      Nova Atividade
                    </button>
                  </div>
                </div>
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
                    {filtered.map((q) => (
                      <tr key={q.id} className="data-row" tabIndex={0}
                        onClick={() => setViewingActivity(q)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setViewingActivity(q); }}
                      >
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
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

                {filtered.length === 0 && (
                  <div style={{ padding: "64px 32px", textAlign: "center", color: "var(--text-3)", fontSize: "0.92rem" }} role="status">
                    {search ? `Nenhuma atividade encontrada para "${search}".` : "Nenhuma atividade criada ainda."}
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
          onPreview={handlePreview}
        />
      )}

      {previewData && (
        <PreviewModal
          nomeAtividade={previewData.nome}
          professor={previewData.professor}
          disciplina={previewData.disciplina}
          onBack={() => { setPreviewData(null); setShowModal(true); }}
          onConfirm={handleConfirm}
        />
      )}

      {/* MODAL PARA VISUALIZAR ATIVIDADE JÁ CRIADA */}
      {viewingActivity && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setViewingActivity(null); }}>
          <div className="modal-card modal-card-wide">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-3)", marginBottom: 6 }}>
                  Pré-visualização
                </p>
                <h2 className="modal-title" style={{ marginBottom: 4 }}>
                  {viewingActivity.nome}
                </h2>
                <p style={{ fontSize: "0.88rem", color: "var(--text-3)" }}>
                  {viewingActivity.professor} · {viewingActivity.disciplina}
                </p>
              </div>
              <span className="badge badge-indigo">{FAKE_QUESTIONS.length} questões</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28, maxHeight: "50vh", overflowY: "auto" }}>
              {FAKE_QUESTIONS.map((q, i) => (
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
    </>
  );
}