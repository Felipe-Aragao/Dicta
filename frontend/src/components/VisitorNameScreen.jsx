// VisitorNameScreen.jsx
// Tela simples onde o visitante escolhe como quer ser chamado.
// Sem validação de backend — o nome é usado apenas localmente.

import { useState } from "react";
import { ArrowLeft, UserCircle } from "@phosphor-icons/react";

export function VisitorNameScreen({ onContinue, onBack }) {
  const [nome, setNome] = useState("");

  const canContinue = nome.trim().length > 0;

  return (
    <div className="login-bg">
      <div className="creds-card page-anim">

        {/* Voltar */}
        <button
          className="creds-back"
          onClick={onBack}
          aria-label="Voltar à seleção de perfil"
        >
          <ArrowLeft size={16} weight="regular" />
          Trocar perfil
        </button>

        {/* Badge */}
        <div style={{ marginBottom: 20 }}>
          <span className="creds-role-badge">
            <UserCircle size={16} weight="regular" />
            Visitante
          </span>
        </div>

        <h1 className="creds-title">Como posso te chamar?</h1>
        <p className="creds-sub">
          Escolha um nome para identificar suas respostas no questionário.
        </p>

        <div className="field-wrap" style={{ marginBottom: 32 }}>
          <label className="field-label" htmlFor="visitor-name">
            Seu nome
          </label>
          <input
            id="visitor-name"
            className="text-input"
            type="text"
            placeholder="Ex: Maria, João, Anônimo..."
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canContinue)
                onContinue(nome.trim());
            }}
            autoFocus
            autoComplete="given-name"
          />
        </div>

        <button
          className="btn btn-primary btn-lg btn-full"
          disabled={!canContinue}
          onClick={() => onContinue(nome.trim())}
          aria-label="Continuar para o questionário"
        >
          Continuar
        </button>

      </div>
    </div>
  );
}
