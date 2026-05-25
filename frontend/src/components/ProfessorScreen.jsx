import { useCallback, useEffect, useState } from "react";
import {
  Plus, Users, FilePdf, ArrowRight,
  Link, Check, User,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { ActivityCreateModal, ActivityPreviewModal } from "./ActivityModals";
import { DEMO_QUESTIONS } from "../data/demoData";

// Formata data para exibicao
const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
};

// Normaliza dados de atividade
const normalizeActivity = (activity, ownerName) => {
  const statusMap = {
    ativo: "Ativo",
    encerrado: "Encerrado",
    rascunho: "Rascunho",
  };

  return {
    id: activity.id,
    nome: activity.name || "Atividade",
    professor: ownerName || "Professor",
    disciplina: activity.discipline || "Geral",
    status: statusMap[activity.status] || "Ativo",
    criadoEm: formatDate(activity.created_at),
    alunos: activity.total_responses ?? 0,
    link: `${window.location.origin}/q/${activity.id}`,
  };
};

// Menu lateral do professor
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

// Botao de copiar link
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

// Tela principal do professor
export function ProfessorScreen({ username, onLogout, userId, apiBaseUrl }) {
  const [questionarios, setQuestionarios] = useState([]);
  const [showModal, setShowModal]         = useState(false);
  const [previewData, setPreviewData]     = useState(null);
  const [search, setSearch]               = useState("");
  const [viewingActivity, setViewingActivity] = useState(null);
  const [loadingList, setLoadingList]     = useState(false);
  const [saving, setSaving]               = useState(false);
  const [listError, setListError]         = useState("");

  const fetchActivities = useCallback(async () => {
    if (!userId) return;
    setLoadingList(true);
    setListError("");
    try {
      const response = await fetch(`${apiBaseUrl}/activities?owner_id=${userId}`);
      if (!response.ok) throw new Error("Falha ao carregar atividades.");
      const data = await response.json();
      setQuestionarios(data.map((item) => normalizeActivity(item, username)));
    } catch (error) {
      setListError(error?.message ?? "Falha ao carregar atividades.");
    } finally {
      setLoadingList(false);
    }
  }, [apiBaseUrl, userId, username]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const filtered = questionarios.filter((q) =>
    q.nome.toLowerCase().includes(search.toLowerCase()) ||
    q.professor.toLowerCase().includes(search.toLowerCase()) ||
    q.disciplina.toLowerCase().includes(search.toLowerCase())
  );

  const handlePreview = (data) => {
    setShowModal(false);
    setPreviewData(data);
  };

  const handleConfirm = async () => {
    if (!previewData || !userId) return;
    setSaving(true);
    try {
      const response = await fetch(`${apiBaseUrl}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_id: userId,
          name: previewData.name,
          discipline: previewData.discipline,
          status: "ativo",
          is_shareable: true,
        }),
      });

      if (!response.ok) {
        let detail = "Falha ao criar atividade.";
        try {
          const data = await response.json();
          if (data?.detail) detail = data.detail;
        } catch {
          
        }
        throw new Error(detail);
      }

      const created = await response.json();
      setQuestionarios((prev) => [normalizeActivity(created, username), ...prev]);
      setPreviewData(null);
    } catch (error) {
      setListError(error?.message ?? "Falha ao criar atividade.");
    } finally {
      setSaving(false);
    }
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
                {listError && (
                  <div style={{ padding: "14px 22px", color: "var(--red-600)", fontSize: "0.9rem" }} role="status">
                    {listError}
                  </div>
                )}
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

                {!loadingList && filtered.length === 0 && (
                  <div style={{ padding: "64px 32px", textAlign: "center", color: "var(--text-3)", fontSize: "0.92rem" }} role="status">
                    {search ? `Nenhuma atividade encontrada para "${search}".` : "Nenhuma atividade criada ainda."}
                  </div>
                )}
                {loadingList && (
                  <div style={{ padding: "64px 32px", textAlign: "center", color: "var(--text-3)", fontSize: "0.92rem" }} role="status">
                    Carregando atividades...
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <ActivityCreateModal
          ownerName={username || "Professor"}
          onClose={() => setShowModal(false)}
          onPreview={handlePreview}
        />
      )}

      {previewData && (
        <ActivityPreviewModal
          activity={{
            name: previewData.name,
            discipline: previewData.discipline,
            ownerName: username || "Professor",
          }}
          questions={DEMO_QUESTIONS}
          onBack={() => { setPreviewData(null); setShowModal(true); }}
          onConfirm={handleConfirm}
          saving={saving}
        />
      )}

      {/* Modal de visualizacao */}
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