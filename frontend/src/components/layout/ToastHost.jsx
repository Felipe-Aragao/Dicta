export function ToastHost({ toasts }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-wrap" role="alert" aria-live="assertive">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast">{toast.msg}</div>
      ))}
    </div>
  );
}
