import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

const TOAST_STYLES = `
  @keyframes toast-in {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes toast-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  .toast-enter {
    animation: toast-in 0.3s ease forwards;
  }
  .toast-exit {
    animation: toast-out 0.3s ease forwards;
  }
`;

export default function Toast({ show, message, type = "success", onClose }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!show) return;
    setLeaving(false);
    const exitTimer = setTimeout(() => setLeaving(true), 2700);
    const closeTimer = setTimeout(onClose, 3000);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [show, onClose]);

  if (!show) return null;

  const styles = {
    success: { border: "border-emerald-500/30", icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> },
    warning: { border: "border-amber-500/30", icon: <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" /> },
    info: { border: "border-blue-500/30", icon: <Info className="w-4 h-4 text-blue-400 flex-shrink-0" /> },
    error: { border: "border-red-500/30", icon: <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" /> }
  };
  const style = styles[type] || styles.success;

  return createPortal(
    <>
      <style>{TOAST_STYLES}</style>
      <div className="fixed top-5 right-5 z-[100]">
        <div
          className={`bg-slate-800 border rounded-xl px-4 py-3 shadow-2xl flex items-center gap-2 text-sm ${
            leaving ? "toast-exit" : "toast-enter"
          } ${style.border}`}
        >
          {style.icon}
          <span className="text-slate-200">{message}</span>
        </div>
      </div>
    </>,
    document.body
  );
}
