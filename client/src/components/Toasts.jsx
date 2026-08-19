import { useCallback, useRef, useState } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { ToastContext } from "./toast-context.js";
import "./Toasts.css";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, type = "info", duration = 4000) => {
      const id = ++idRef.current;
      setToasts((list) => [...list.slice(-3), { id, message, type }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss],
  );

  const toast = useCallback(
    (message, type = "info", duration) => push(message, type, duration),
    [push],
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] ?? Info;
          return (
            <button
              key={t.id}
              type="button"
              className={`toast toast-${t.type}`}
              onClick={() => dismiss(t.id)}
            >
              <Icon size={17} className="toast-icon" />
              <span>{t.message}</span>
            </button>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}