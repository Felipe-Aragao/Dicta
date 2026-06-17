import { CaretLeft, CaretRight, SignOut, User } from "@phosphor-icons/react";

export function Sidebar({ username, roleLabel, fallbackName, onLogout, collapsed, onToggleCollapsed }) {
  const displayName = username || fallbackName;

  return (
    <aside className={`sidebar${collapsed ? " is-collapsed" : ""}`} aria-label="Menu lateral">
      <button
        className="sidebar-toggle"
        type="button"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? "Expandir menu lateral" : "Esconder menu lateral"}
        title={collapsed ? "Expandir menu" : "Esconder menu"}
      >
        {collapsed ? <CaretRight size={18} weight="bold" /> : <CaretLeft size={18} weight="bold" />}
      </button>

      <div className="sidebar-avatar" aria-label={`Perfil de ${displayName}`}>
        <User size={30} weight="regular" color="white" />
      </div>

      {collapsed ? (
        <button
          className="sidebar-logout sidebar-logout-icon"
          onClick={onLogout}
          aria-label="Sair da conta"
          title="Sair"
        >
          <SignOut size={20} weight="bold" />
        </button>
      ) : (
        <>
          <p className="sidebar-welcome">Bem vindo,<br />{displayName}!</p>
          <p className="sidebar-role">{roleLabel}</p>
          <button className="sidebar-logout" onClick={onLogout} aria-label="Sair da conta">
            Sair
          </button>
        </>
      )}
    </aside>
  );
}
