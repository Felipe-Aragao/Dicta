import { ChalkboardTeacher, Student, UserCircle } from "@phosphor-icons/react";
import { useEffect } from "react";
import { useSpeech } from "../hooks/useSpeech";

// Tela de selecao de perfil
export function LoginScreen({ onSelect }) {
  const { speak } = useSpeech(); 

  useEffect(() => {
    // Texto que o Dicta vai falar assim que o aluno abrir a tela de login
    const loginWarning = "Bem-vindo ao dicta. Certifique-se de que seu microfone está habilitado para que o reconhecimento de voz funcione.";
    
    // O pequeno delay de 500ms é uma boa prática para garantir que 
    // o motor de voz do navegador já carregou completamente
    const timer = setTimeout(() => {
      speak(loginWarning);
    }, 500);

    return () => clearTimeout(timer);
  }, [speak]);
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
