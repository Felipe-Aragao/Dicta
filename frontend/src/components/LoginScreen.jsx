import { ChalkboardTeacher, Student, UserCircle } from "@phosphor-icons/react";

// Tela de selecao de perfil
export function LoginScreen({ onSelect }) {
  return (
    <div className="login-bg">
    <div className="login-card page-anim">

    
    <div className="login-logo">
    <img src="/dicta_logo.svg" alt="Dicta" />
    </div>

    <h1 className="login-title">Olá! Eu sou</h1>

    <div className="role-grid" role="group" aria-label="Selecione seu perfil de acesso">

    <button
    className="role-card"
    onClick={() => onSelect("professor")}
    aria-label="Entrar como Professor"
    >
    <div className="role-card-icon">
    <ChalkboardTeacher size={34} weight="regular" />
    </div>
    <span className="role-card-label">Professor</span>
    </button>

    <button
    className="role-card"
    onClick={() => onSelect("aluno")}
    aria-label="Entrar como Aluno"
    >
    <div className="role-card-icon">
    <Student size={34} weight="regular" />
    </div>
    <span className="role-card-label">Aluno</span>
    </button>

    <button
    className="role-card"
    onClick={() => onSelect("visitante")}
    aria-label="Entrar como Visitante"
    >
    <div className="role-card-icon">
    <UserCircle size={34} weight="regular" />
    </div>
    <span className="role-card-label">Visitante</span>
    </button>

    </div>
    </div>
    </div>
  );
}
