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

export function CredentialsScreen({ role, onLogin, onBack }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");

  const meta    = ROLE_META[role];
  const canLogin = email.trim().length > 0 && password.length > 0;

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

        {/* Campos */}
        <div className="field-group">
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
              onKeyDown={(e) => { if (e.key === "Enter" && canLogin) onLogin(); }}
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
              onKeyDown={(e) => { if (e.key === "Enter" && canLogin) onLogin(); }}
              autoComplete="current-password"
            />
          </div>
        </div>

        <button
          className="btn btn-primary btn-lg btn-full"
          disabled={!canLogin}
          onClick={onLogin}
          aria-label={`Entrar como ${meta.label}`}
        >
          Entrar
        </button>

      </div>
    </div>
  );
}
