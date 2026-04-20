import { useState, useEffect } from "react";

const BACKEND = import.meta.env.VITE_API_URL?.replace(/\/api$/, "") || "http://localhost:3001";

function getToken() {
  return localStorage.getItem("accessToken") || "";
}

function authHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${getToken()}`,
    ...extra,
  };
}

const TYPE_LABELS = {
  compraventa: "Compraventa",
  alquiler: "Alquiler",
  reserva: "Reserva",
  mandato: "Mandato",
};

const STATUS_CONFIG = {
  generated: { label: "Generado",  bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  signed:    { label: "Firmado",   bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30"},
  cancelled: { label: "Anulado",   bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30"},
};

function formatRelativeDate(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60) return `hace ${mins} min`;
  if (hours < 24) return `hace ${hours} h`;
  if (days  < 30) return `hace ${days} días`;
  return new Date(dateStr).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}

export default function LeadContractsHistory({ leadId, onGenerateNew }) {
  const [docs, setDocs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [downloading, setDl]  = useState(null);

  useEffect(() => {
    if (!leadId) return;
    fetchDocs();
  }, [leadId]);

  async function fetchDocs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${BACKEND}/api/contracts?leadId=${leadId}`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDocs(data.documents || data || []);
    } catch (e) {
      setError("No se pudieron cargar los contratos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(doc) {
    setDl(doc.id);
    try {
      const token = localStorage.getItem("accessToken") || "";
      const url = `${BACKEND}/api/contracts/download/${doc.id}?token=${token}`;
      window.open(url, "_blank");
    } catch (e) {
      alert(`Error al descargar: ${e.message}`);
    } finally {
      setDl(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-700/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
        <span>{error}</span>
        <button onClick={fetchDocs} className="text-xs underline">Reintentar</button>
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-slate-600 rounded-xl">
        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <DocIcon />
        </div>
        <p className="text-sm text-slate-400 mb-1">Sin contratos generados</p>
        <p className="text-xs text-slate-500 mb-4">Los contratos aparecerán aquí una vez generados.</p>
        {onGenerateNew && (
          <button
            onClick={onGenerateNew}
            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Generar primer contrato
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Contratos ({docs.length})
        </p>
        {onGenerateNew && (
          <button
            onClick={onGenerateNew}
            className="text-xs px-3 py-1.5 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-1.5"
          >
            <span className="text-base leading-none">+</span> Nuevo
          </button>
        )}
      </div>

      <div className="space-y-2">
        {docs.map((doc) => {
          const status = STATUS_CONFIG[doc.status] || STATUS_CONFIG.generated;
          return (
            <div
              key={doc.id}
              className="flex items-center gap-3 px-4 py-3 bg-slate-700/30 border border-slate-600 rounded-xl hover:border-slate-500 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                <DocIcon />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {TYPE_LABELS[doc.contractType] || doc.contractType}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {doc.filename} · {formatRelativeDate(doc.createdAt)}
                </p>
              </div>

              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${status.bg} ${status.text} ${status.border}`}>
                {status.label}
              </span>

              <button
                onClick={() => handleDownload(doc)}
                disabled={downloading === doc.id}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-600 hover:text-white transition-colors disabled:opacity-50 flex-shrink-0"
                title="Descargar"
              >
                {downloading === doc.id ? <SpinnerIcon /> : <DownloadIcon />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}