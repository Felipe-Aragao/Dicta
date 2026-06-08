export function DictaLogo({ height = 40, onClick }) {
  return (
    <div
      className="topbar-logo"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) onClick();
      }}
    >
      <img src="/dicta_logo.svg" alt="Dicta" style={{ height }} />
    </div>
  );
}
