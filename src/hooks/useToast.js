import { useState, useCallback } from "react";

/**
 * useToast
 * Gerencia notificações temporárias (toasts) na tela.
 *
 * Retorna:
 *  - toasts  → array de { id, msg } para renderizar
 *  - show(msg) → exibe um toast por 2.8 segundos
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((msg) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg }]);

    // Remove automaticamente após 2.8s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  return { toasts, show };
}
