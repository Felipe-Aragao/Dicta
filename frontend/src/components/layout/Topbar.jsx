import { ArrowLeft, ArrowRight, SpeakerHigh } from "@phosphor-icons/react";
import { DictaLogo } from "./DictaLogo";
import { ROUTES } from "../../routes";

export function Topbar({
  page,
  role,
  navigate,
  openVoiceCommands,
  closeVoiceCommands,
  onSkipIntro,
  onDoneBack,
}) {
  if (["login", "credentials", "visitor-name"].includes(page)) {
    return (
      <header className="topbar" role="banner">
        <DictaLogo />
      </header>
    );
  }

  if (page === "voice-commands-intro") {
    return (
      <header className="topbar" role="banner">
        <DictaLogo />
        <button
          className="topbar-back-btn"
          onClick={onSkipIntro}
          aria-label="Pular introdução"
        >
          Pular
          <ArrowRight size={16} weight="regular" />
        </button>
      </header>
    );
  }

  if (page === "voice-commands") {
    return (
      <header className="topbar" role="banner">
        <DictaLogo onClick={closeVoiceCommands} />
        <button
          className="topbar-back-btn"
          onClick={closeVoiceCommands}
          aria-label="Fechar ajuda de comandos de voz"
        >
          <ArrowLeft size={16} weight="regular" />
          Voltar
        </button>
      </header>
    );
  }

  if (page === "professor-home") {
    return (
      <header className="topbar" role="banner">
        <DictaLogo onClick={() => navigate(ROUTES.professorHome)} />
        <div className="topbar-area">
          <span className="topbar-area-label">Área do Professor</span>
        </div>
      </header>
    );
  }

  if (page === "history" && role === "aluno") {
    return (
      <header className="topbar" role="banner">
        <DictaLogo onClick={() => navigate(ROUTES.studentHome)} />
        <div className="topbar-area">
          <span className="topbar-area-label">Minha Área</span>
          <button
            className="nav-btn"
            onClick={openVoiceCommands}
            aria-label="Ver comandos de voz disponíveis"
            title="Comandos de voz"
          >
            <SpeakerHigh size={18} weight="regular" />
            Comandos de Voz
          </button>
        </div>
      </header>
    );
  }

  const backLabel = page === "preview" ? "Upload"
    : role === "aluno" ? "Minha Área"
    : role === "visitante" ? "Início"
    : role === "professor" ? "Área do Professor"
    : "Início";

  const backDest = page === "preview" ? ROUTES.upload
    : role === "aluno" ? ROUTES.studentHome
    : role === "visitante" ? ROUTES.login
    : role === "professor" ? ROUTES.professorHome
    : ROUTES.login;

  const handleBack = () => {
    if (page === "done") onDoneBack?.();
    navigate(backDest, { replace: page === "done" });
  };

  return (
    <header className="topbar" role="banner">
      <DictaLogo onClick={handleBack} />
      <nav className="nav-btns" aria-label="Navegação">
        {(role === "aluno" || role === "visitante") && (
          <button
            className="nav-btn"
            onClick={openVoiceCommands}
            aria-label="Ver comandos de voz disponíveis"
            title="Comandos de voz"
          >
            <SpeakerHigh size={18} weight="regular" />
            Comandos de Voz
          </button>
        )}
        <button
          className="topbar-back-btn"
          onClick={handleBack}
          aria-label={`Voltar para ${backLabel}`}
        >
          <ArrowLeft size={16} weight="regular" />
          {backLabel}
        </button>
      </nav>
    </header>
  );
}
