import { useState, useCallback } from "react";


export function useToast() {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((msg) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg }]);

    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  return { toasts, show };
}
