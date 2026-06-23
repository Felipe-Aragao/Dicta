import { Microphone, MicrophoneSlash, WarningCircle } from "@phosphor-icons/react";

export function FloatingMicButton({ status, onToggle }) {
  const isActive = status === "active";
  const isUnavailable = status === "unavailable";
  const label = isUnavailable
    ? "Microfone sem acesso"
    : isActive
    ? "Mutar microfone"
    : "Ativar microfone";

  return (
    <button
      type="button"
      className={`floating-mic-btn ${status}`}
      onClick={onToggle}
      aria-label={label}
      aria-pressed={isActive}
      title={label}
    >
      {isUnavailable ? (
        <WarningCircle size={28} weight="bold" />
      ) : isActive ? (
        <Microphone size={28} weight="bold" />
      ) : (
        <MicrophoneSlash size={28} weight="bold" />
      )}
    </button>
  );
}
