// CredentialsScreen.jsx
// Tela de login simulado para Professor e Aluno.
// Não há validação real — qualquer preenchimento aceita.

import { useState } from "react";
import { ArrowLeft, ChalkboardTeacher, Student } from "@phosphor-icons/react";

const ROLE_META = {
  professor: {
    icon: <ChalkboardTeacher size={16} weight="regular" />,
    label: "Professor",
    title: "Acesso do Professor",
    sub: "Entre com suas credenciais institucionais para continuar.",
  },
  aluno: {
    icon: <Student size={16} weight="regular" />,
    label: "Aluno",
    title: "Acesso do Aluno",
    sub: "Entre com suas credenciais institucionais para continuar.",
  },
};

export function CredentialsScreen({ role, onLogin, onRegister, onBack, loading = false }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState("login");

  const meta    = ROLE_META[role];
  const canLogin = email.trim().length > 0 && password.length > 0;
  const canRegister =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    confirmPassword.length >= 6 &&
    password === confirmPassword;

  const handleLogin = async () => {
    if (!canLogin || loading) return;
    await onLogin({ email: email.trim(), password });
  };

  const handleRegister = async () => {
    if (!canRegister || loading) return;
    await onRegister({ name: name.trim(), email: email.trim(), password });
  };

  return (
    <div className="login-bg">
      <div className="creds-card page-anim">

        {/* Voltar */}
        <button className="creds-back" onClick={onBack} aria-label="Voltar à seleção de perfil">
          <ArrowLeft size={15} weight="regular" />
          Trocar perfil
        </button>

        {/* Role badge */}
        <div style={{ marginBottom: 16 }}>
          <span className="creds-role-badge">
            {meta.icon}
            {meta.label}
          </span>
        </div>

        <h1 className="creds-title">{meta.title}</h1>
        <p className="creds-sub">{meta.sub}</p>

        <div className="creds-tabs" role="tablist" aria-label="Selecionar modo">
          <button
            type="button"
            className={`creds-tab${mode === "login" ? " active" : ""}`}
            onClick={() => setMode("login")}
            aria-selected={mode === "login"}
            role="tab"
          >
            Entrar
          </button>
          <button
            type="button"
            className={`creds-tab${mode === "register" ? " active" : ""}`}
            onClick={() => setMode("register")}
            aria-selected={mode === "register"}
            role="tab"
          >
            Cadastrar
          </button>
        </div>

        {/* Campos */}
        <div className="field-group">
          {mode === "register" && (
            <div className="field-wrap">
              <label className="field-label" htmlFor="creds-name">
                Nome completo
              </label>
              <input
                id="creds-name"
                className="text-input"
                type="text"
                placeholder="Ex: Maria Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && canRegister) handleRegister(); }}
                autoComplete="name"
              />
            </div>
          )}
          <div className="field-wrap">
            <label className="field-label" htmlFor="creds-email">
              E-mail institucional
            </label>
            <input
              id="creds-email"
              className="text-input"
              type="email"
              placeholder="nome@instituicao.edu.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && canLogin) handleLogin(); }}
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="field-wrap">
            <label className="field-label" htmlFor="creds-password">
              Senha
            </label>
            <input
              id="creds-password"
              className="text-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && canLogin) handleLogin(); }}
              autoComplete="current-password"
            />
          </div>

          {mode === "register" && (
            <div className="field-wrap">
              <label className="field-label" htmlFor="creds-confirm">
                Confirmar senha
              </label>
              <input
                id="creds-confirm"
                className="text-input"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && canRegister) handleRegister(); }}
                autoComplete="new-password"
              />
            </div>
          )}
        </div>

        <button
          className="btn btn-primary btn-lg btn-full"
          disabled={(mode === "login" ? !canLogin : !canRegister) || loading}
          onClick={mode === "login" ? handleLogin : handleRegister}
          aria-label={`Entrar como ${meta.label}`}
        >
          {loading ? "Processando..." : mode === "login" ? "Entrar" : "Cadastrar"}
        </button>

      </div>
    </div>
  );
}
