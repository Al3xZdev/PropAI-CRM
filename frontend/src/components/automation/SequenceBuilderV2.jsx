import { useState, useEffect, useRef } from "react";
import { api } from "../../utils/api";

// ─── config ───────────────────────────────────────────────────────────────────

const DAYS_CONFIG = [
  { day: 1,  name: "Primer contacto"  },
  { day: 3,  name: "Seguimiento"      },
  { day: 7,  name: "Interés"          },
  { day: 14, name: "Último intento"   },
];

const CHANNELS = [
  {
    id: "whatsapp", label: "WhatsApp", color: "#16a34a", bg: "#dcfce7",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="#16a34a">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.105.546 4.083 1.5 5.797L0 24l6.335-1.483A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.371l-.36-.214-3.726.872.939-3.627-.235-.373A9.818 9.818 0 012.182 12c0-5.421 4.397-9.818 9.818-9.818 5.421 0 9.818 4.397 9.818 9.818 0 5.421-4.397 9.818-9.818 9.818z"/>
      </svg>
    ),
  },
  {
    id: "email", label: "Email", color: "#3b82f6", bg: "#eff6ff",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/>
      </svg>
    ),
  },
  {
    id: "instagram", label: "Instagram", color: "#a855f7", bg: "#fdf4ff",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="1" fill="#a855f7" stroke="none"/>
      </svg>
    ),
  },
];

const VARIABLES = [
  "{{nombre}}", "{{propiedad}}", "{{precio}}",
  "{{agente}}", "{{direccion}}", "{{fecha}}",
];

// ─── templates locales ─────────────────────────────────────────────────────────

function getLocalTemplate(channel, dayIndex) {
  const templates = {
    whatsapp: [
      "Hola {{nombre}} 👋 Vi que te interesó {{propiedad}}. ¿Te puedo contar más detalles? Soy {{agente}}.",
      "Hola {{nombre}}, ¿pudiste pensar en {{propiedad}}? Sigue disponible 🏠 Podemos coordinar una visita cuando quieras.",
      "{{nombre}}, quería contarte que {{propiedad}} sigue en {{precio}} 🔑 Es una gran oportunidad. ¿Visitamos esta semana?",
      "Hola {{nombre}}, es mi último mensaje para no molestarte. Si en algún momento querés retomar la búsqueda, acá estoy. ¡Éxitos! 😊",
    ],
    email: [
      "Hola {{nombre}},\n\nMe comunico porque mostraste interés en {{propiedad}} ubicada en {{direccion}}.\n\nEstoy disponible para responder cualquier consulta.\n\nSaludos,\n{{agente}}",
      "Hola {{nombre}},\n\nQuería hacer un seguimiento sobre {{propiedad}}. ¿Pudiste evaluar la propuesta?\n\nPodemos coordinar una visita sin compromiso.\n\n{{agente}}",
      "{{nombre}},\n\n{{propiedad}} sigue disponible a {{precio}}. Es una oportunidad que no suele durar mucho en el mercado.\n\n¿Te interesa agendar una visita?\n\n{{agente}}",
      "Hola {{nombre}},\n\nEs mi último contacto sobre {{propiedad}}. Si en algún momento retomás la búsqueda, no dudes en escribirme.\n\nMuchas gracias,\n{{agente}}",
    ],
    instagram: [
      "Hola {{nombre}} 👋 Vi que te interesó {{propiedad}}. ¿Te puedo contar más? 🏠",
      "{{nombre}}, {{propiedad}} todavía está disponible 🔑 ¿Coordinamos una visita?",
      "{{nombre}} ✨ {{propiedad}} en {{precio}}. ¡No te lo pierdas! ¿Visitamos esta semana?",
      "Hola {{nombre}}, último mensaje de mi parte. Si querés retomar la búsqueda, acá estoy 😊",
    ],
  };
  return templates[channel]?.[dayIndex] || "";
};

// ─── íconos ───────────────────────────────────────────────────────────────────

function SpinIcon() {
  return (
    <svg style={{ animation: "sb-spin 1s linear infinite" }} width="12" height="12"
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5,3 19,12 5,21"/>
    </svg>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function SequenceBuilderV2({ onClose, onSave }) {
  const [seqName, setSeqName]       = useState("");
  const [seqDesc, setSeqDesc]       = useState("");
  const [channel, setChannel]       = useState("whatsapp");
  const [activeDay, setActiveDay]   = useState(0);
  const [messages, setMessages]     = useState(["", "", "", ""]);
  const [generated, setGenerated]   = useState([false, false, false, false]);
  const [generating, setGenerating] = useState(null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState(null);
  const textareaRef                 = useRef(null);

  // ── autocomplete de leads ──────────────────────────────────────────────────
  const [allLeads, setAllLeads]       = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadQuery, setLeadQuery]     = useState("");
  const [showLeads, setShowLeads]     = useState(false);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError]   = useState(null);
  const leadInputRef                  = useRef(null);

  // Cargar todos los leads una sola vez al abrir el modal
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLeadsLoading(true);
      try {
        const res = await api.get('/leads');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setAllLeads(data.leads || []);
      } catch (e) {
        console.error('Error loading leads for autocomplete:', e);
        if (!cancelled) setLeadsError("No se pudieron cargar los leads.");
      } finally {
        if (!cancelled) setLeadsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredLeads = allLeads
    .filter(l =>
      l.name.toLowerCase().includes(leadQuery.toLowerCase()) ||
      (l.email || "").toLowerCase().includes(leadQuery.toLowerCase()) ||
      (l.phone || "").includes(leadQuery)
    )
    .slice(0, 10);

  const activeCh       = CHANNELS.find(c => c.id === channel);
  const generatedCount = generated.filter(Boolean).length;

  // ── cambio de canal → reset ───────────────────────────────────────────────
  function handleChannelChange(ch) {
    setChannel(ch);
    setMessages(["", "", "", ""]);
    setGenerated([false, false, false, false]);
    setActiveDay(0);
    setError(null);
  }

  function updateMessage(i, value) {
    setMessages(prev => { const n = [...prev]; n[i] = value; return n; });
  }

  // ── generar uno ───────────────────────────────────────────────────────────
  async function handleGenerateOne() {
    setGenerating("one");
    setError(null);
    try {
      // Producción: descomentar y usar tu endpoint de backend
      // const res  = await fetch(`${API_URL}/ai/generate-message`, {
      //   method: "POST", headers: getAuthHeaders(),
      //   body: JSON.stringify({ channel, dayIndex: activeDay, seqName, seqDesc }),
      // });
      // const data = await res.json();
      // const text = data.text;

      await new Promise(r => setTimeout(r, 750)); // simular delay de IA
      const text = getLocalTemplate(channel, activeDay);

      updateMessage(activeDay, text);
      setGenerated(prev => { const n = [...prev]; n[activeDay] = true; return n; });
    } catch {
      setError("Error al generar el mensaje.");
    } finally {
      setGenerating(null);
    }
  }

  // ── generar todos ─────────────────────────────────────────────────────────
  async function handleGenerateAll() {
    setGenerating("all");
    setError(null);
    try {
      const newMsgs = [...messages];
      const newGen  = [...generated];
      for (let i = 0; i < DAYS_CONFIG.length; i++) {
        // Producción: llamar al endpoint para cada día
        await new Promise(r => setTimeout(r, 380));
        newMsgs[i] = getLocalTemplate(channel, i);
        newGen[i]  = true;
        setMessages([...newMsgs]);
        setGenerated([...newGen]);
      }
    } catch {
      setError("Error al generar los mensajes.");
    } finally {
      setGenerating(null);
    }
  }

  // ── insertar variable en cursor ───────────────────────────────────────────
  function insertVariable(v) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start  = ta.selectionStart;
    const end    = ta.selectionEnd;
    const newVal = messages[activeDay].slice(0, start) + v + messages[activeDay].slice(end);
    updateMessage(activeDay, newVal);
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + v.length;
      ta.focus();
    }, 0);
  }

  // ── guardar / iniciar ─────────────────────────────────────────────────────
  async function handleStart() {
    if (!seqName.trim()) {
      document.getElementById("sb2-name")?.focus();
      return;
    }
    if (!selectedLead) {
      setError("Seleccioná un lead de la lista para vincular la secuencia.");
      setShowLeads(true);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name:        seqName.trim(),
        description: seqDesc.trim(),
        channel,
        leadId:      selectedLead.id,
        steps: DAYS_CONFIG.map((d, i) => ({
          day:     d.day,
          name:    d.name,
          message: messages[i],
        })),
      };
      const res = await api.post('/automation/sequences', payload);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      onSave?.(data);
      onClose?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes sb-spin { to { transform: rotate(360deg); } }

        .sb2-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 50;
          display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        .sb2-modal {
          background: #1e293b;
          border-radius: 16px;
          border: 0.5px solid #334155;
          width: 100%; max-width: 720px;
          max-height: 90vh;
          display: flex; flex-direction: column; overflow: hidden;
        }
        .sb2-header {
          padding: 18px 22px 16px;
          border-bottom: 0.5px solid #475569;
          flex-shrink: 0;
        }
        .sb2-channel-bar {
          padding: 12px 22px;
          background: #0f172a;
          border-bottom: 0.5px solid #475569;
          display: flex; align-items: center; gap: 8px;
          flex-shrink: 0;
        }
        .sb2-ch-btn {
          width: 38px; height: 38px; border-radius: 10px;
          border: 0.5px solid #334155;
          background: #1e293b;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all .12s; flex-shrink: 0;
        }
        .sb2-ch-btn:hover { border-color: #475569; }
        .sb2-leads-dropdown {
          position: absolute; z-index: 30; top: 100%; left: 0; right: 0;
          background: #1e293b; border: 0.5px solid #334155; border-radius: 8px;
          max-height: 220px; overflow-y: auto; margin-top: 4px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.35);
        }
        .sb2-leads-dropdown button:hover { background: #334155; }
        .sb2-timeline-wrap {
          padding: 16px 22px;
          border-bottom: 0.5px solid #475569;
          overflow-x: auto; flex-shrink: 0;
        }
        .sb2-timeline {
          display: flex; align-items: flex-start; position: relative; min-width: 520px;
        }
        .sb2-node {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; position: relative; cursor: pointer;
        }
        .sb2-node:not(:last-child)::after {
          content: ''; position: absolute; top: 13px; left: 50%;
          width: 100%; height: 1px;
          background: #475569; z-index: 0;
        }
        .sb2-circle {
          width: 26px; height: 26px; border-radius: 50%;
          border: 0.5px solid #334155;
          background: #1e293b;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 500; color: #94a3b8;
          position: relative; z-index: 1; transition: all .15s;
        }
        .sb2-editor {
          padding: 16px 22px; display: flex; flex-direction: column;
          gap: 12px; overflow-y: auto; flex: 1; min-height: 0;
        }
        .sb2-textarea {
          width: 100%; padding: 10px 12px; font-size: 13px;
          font-family: inherit;
          border: 0.5px solid #334155;
          border-radius: 8px;
          background: #0f172a;
          color: #f1f5f9;
          resize: vertical; min-height: 100px; line-height: 1.65;
          transition: border-color .12s;
        }
        .sb2-textarea:focus { outline: none; border-color: #3b82f6; }
        .sb2-preview-strip {
          display: flex; gap: 8px; padding: 12px 22px;
          background: #0f172a;
          border-top: 0.5px solid #475569;
          overflow-x: auto; flex-shrink: 0;
        }
        .sb2-preview-card {
          flex: 0 0 155px; background: #1e293b;
          border: 0.5px solid #475569;
          border-radius: 10px; padding: 10px; cursor: pointer;
          transition: border-color .12s;
        }
        .sb2-preview-card:hover { border-color: #334155; }
        .sb2-footer {
          padding: 13px 22px;
          border-top: 0.5px solid #475569;
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
        }
        .sb2-ai-btn {
          display: flex; align-items: center; gap: 5px;
          font-size: 12px; padding: 5px 12px; border-radius: 20px;
          border: 0.5px solid #3b82f6;
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          cursor: pointer; font-family: inherit;
          transition: opacity .12s;
        }
        .sb2-ai-btn:hover:not(:disabled) { opacity: .85; }
        .sb2-ai-btn:disabled { opacity: .5; cursor: not-allowed; }
        .sb2-gen-all {
          font-size: 12px; padding: 5px 12px; border-radius: 8px;
          border: 0.5px solid #334155;
          background: #0f172a;
          color: #94a3b8;
          cursor: pointer; font-family: inherit;
          transition: all .12s;
        }
        .sb2-gen-all:hover:not(:disabled) { background: #1e293b; }
        .sb2-gen-all:disabled { opacity: .5; cursor: not-allowed; }
        .sb2-var-chip {
          font-size: 11px; padding: 3px 9px; border-radius: 10px;
          background: #0f172a;
          color: #94a3b8;
          border: 0.5px solid #475569;
          cursor: pointer; font-family: monospace;
          transition: all .1s;
        }
        .sb2-var-chip:hover {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border-color: #3b82f6;
        }
        .sb2-start-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 20px; font-size: 13px; font-weight: 500;
          background: #3b82f6;
          color: white;
          border: 1px solid #3b82f6;
          border-radius: 8px; cursor: pointer;
          font-family: inherit; transition: opacity .12s;
        }
        .sb2-start-btn:hover:not(:disabled) { opacity: .9; }
        .sb2-start-btn:disabled { opacity: .45; cursor: not-allowed; }
        .sb2-input {
          width: 100%; padding: 8px 12px; font-size: 13px;
          background: #0f172a; border: 0.5px solid #334155;
          border-radius: 8px; color: #f1f5f9;
        }
        .sb2-input:focus { outline: none; border-color: #3b82f6; }
        .sb2-label {
          font-size: 12px; color: #94a3b8; display: block; margin-bottom: 5px;
        }
        .sb2-error {
          font-size: 12px; color: #ef4444; background: rgba(239, 68, 68, 0.1);
          border: 0.5px solid #ef4444; border-radius: 8px; padding: 8px 12px;
        }
      `}</style>

      <div className="sb2-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
        <div className="sb2-modal">

          {/* ── header ── */}
          <div className="sb2-header">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 500, color: "#f1f5f9" }}>
                Nueva secuencia de automatización
              </h3>
              <button
                onClick={onClose}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "20px", lineHeight: 1, padding: "0 4px" }}
              >×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ position: "relative" }}>
                <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "5px" }}>
                  Nombre <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  id="sb2-name"
                  type="text"
                  ref={leadInputRef}
                  placeholder="Escribí el nombre del lead..."
                  value={seqName}
                  onChange={e => {
                    setSeqName(e.target.value);
                    setLeadQuery(e.target.value);
                    setSelectedLead(null);
                    setShowLeads(true);
                  }}
                  onFocus={() => setShowLeads(true)}
                  onBlur={() => setTimeout(() => setShowLeads(false), 150)}
                  className="sb2-input"
                />
                {showLeads && (
                  <div className="sb2-leads-dropdown">
                    {leadsLoading ? (
                      <div style={{ padding: "8px 10px", fontSize: "12px", color: "#94a3b8" }}>Cargando leads...</div>
                    ) : leadsError ? (
                      <div style={{ padding: "8px 10px", fontSize: "12px", color: "#f87171" }}>{leadsError}</div>
                    ) : filteredLeads.length === 0 ? (
                      <div style={{ padding: "8px 10px", fontSize: "12px", color: "#94a3b8" }}>No se encontraron leads</div>
                    ) : (
                      filteredLeads.map(l => (
                        <button
                          key={l.id}
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            setSeqName(l.name);
                            setLeadQuery(l.name);
                            setSelectedLead(l);
                            setShowLeads(false);
                          }}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", fontSize: "13px", color: "#e2e8f0", background: "transparent", border: "none", cursor: "pointer", borderRadius: "6px" }}
                        >
                          <div style={{ fontWeight: 500 }}>{l.name}</div>
                          {(l.email || l.phone) && (
                            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                              {[l.email, l.phone].filter(Boolean).join(" · ")}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
                {selectedLead && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", padding: "4px 8px", background: "#134e4a", border: "0.5px solid #134e4a", borderRadius: "6px", fontSize: "12px", color: "#5eead4" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      Lead vinculado: {selectedLead.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedLead(null)}
                      title="Desvincular lead"
                      style={{ background: "none", border: "none", color: "#5eead4", cursor: "pointer", fontWeight: "bold", lineHeight: 1, padding: "0 2px", fontSize: "14px", flexShrink: 0 }}
                    >×</button>
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "5px" }}>
                  Descripción (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Objetivo de la secuencia"
                  value={seqDesc}
                  onChange={e => setSeqDesc(e.target.value)}
                  className="sb2-input"
                />
              </div>
            </div>
          </div>

          {/* ── canal ── */}
          <div className="sb2-channel-bar">
            <span style={{ fontSize: "12px", color: "#94a3b8", whiteSpace: "nowrap" }}>Canal:</span>
            {CHANNELS.map(ch => (
              <button
                key={ch.id}
                className="sb2-ch-btn"
                title={ch.label}
                onClick={() => handleChannelChange(ch.id)}
                style={{
                  borderWidth:  channel === ch.id ? "2px" : "0.5px",
                  borderColor:  channel === ch.id ? ch.color : "#334155",
                  background:   channel === ch.id ? ch.bg : "#1e293b",
                }}
              >
                {ch.icon}
              </button>
            ))}
            <span style={{ fontSize: "13px", fontWeight: 500, color: activeCh?.color, marginLeft: "4px" }}>
              {activeCh?.label}
            </span>
          </div>

          {/* ── timeline ── */}
          <div className="sb2-timeline-wrap">
            <div className="sb2-timeline">
              {DAYS_CONFIG.map((d, i) => {
                const isActive = activeDay === i;
                const isDone   = generated[i];
                return (
                  <div key={d.day} className="sb2-node" onClick={() => setActiveDay(i)}>
                    <div
                      className="sb2-circle"
                      style={{
                        borderWidth:  isActive || isDone ? "2px" : "0.5px",
                        borderColor:  isActive ? activeCh?.color : isDone ? "#16a34a" : "#334155",
                        background:   isActive ? (activeCh?.bg || "#eff6ff") : isDone ? "#dcfce7" : "#1e293b",
                        color:        isActive ? activeCh?.color : isDone ? "#15803d" : "#94a3b8",
                        fontWeight:   isActive || isDone ? 600 : 500,
                      }}
                    >
                      {isDone && !isActive ? "✓" : d.day}
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>
                      Día {d.day}
                    </div>
                    <div style={{ fontSize: "10px", color: "#64748b", textAlign: "center", maxWidth: "70px", lineHeight: 1.3, marginTop: "2px" }}>
                      {d.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── editor ── */}
          <div className="sb2-editor">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                Mensaje — Día {DAYS_CONFIG[activeDay].day} · {DAYS_CONFIG[activeDay].name}
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  className="sb2-gen-all"
                  onClick={handleGenerateAll}
                  disabled={generating !== null}
                >
                  {generating === "all" ? "Generando..." : "Generar todos con IA"}
                </button>
                <button
                  className="sb2-ai-btn"
                  onClick={handleGenerateOne}
                  disabled={generating !== null}
                >
                  {generating === "one" ? <SpinIcon /> : <StarIcon />}
                  {generating === "one" ? "Generando..." : "Generar con IA"}
                </button>
              </div>
            </div>

            <textarea
              ref={textareaRef}
              className="sb2-textarea"
              placeholder="Escribí el mensaje o generalo con IA..."
              value={messages[activeDay]}
              onChange={e => updateMessage(activeDay, e.target.value)}
            />

            <div>
              <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px" }}>
                Variables — clic para insertar en el cursor
              </label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {VARIABLES.map(v => (
                  <button key={v} className="sb2-var-chip" onClick={() => insertVariable(v)}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="sb2-error">
                {error}
              </div>
            )}
          </div>

          {/* ── preview strip ── */}
          <div className="sb2-preview-strip">
            {DAYS_CONFIG.map((d, i) => (
              <div
                key={d.day}
                className="sb2-preview-card"
                onClick={() => setActiveDay(i)}
                style={{
                  borderWidth: activeDay === i ? "1.5px" : "0.5px",
                  borderColor: activeDay === i ? (activeCh?.color || "#3b82f6") : "#475569",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 500, color: "#f1f5f9", marginBottom: "4px" }}>
                  Día {d.day} · {d.name}
                </div>
                {messages[i] ? (
                  <div style={{
                    fontSize: "11px", color: "#94a3b8", lineHeight: 1.4,
                    overflow: "hidden", display: "-webkit-box",
                    WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
                  }}>
                    {messages[i].replace(/\n/g, " ")}
                  </div>
                ) : (
                  <div style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>
                    Sin mensaje
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── footer ── */}
          <div className="sb2-footer">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                {generatedCount === 0 ? "Generá al menos un mensaje" : `${generatedCount} de 4 mensajes listos`}
              </span>
              <div style={{ width: "80px", height: "4px", borderRadius: "2px", background: "#475569", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(generatedCount / 4) * 100}%`, background: activeCh?.color, borderRadius: "2px", transition: "width .3s" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={onClose} style={{ padding: "8px 16px", fontSize: "13px", borderRadius: "8px", background: "#334155", color: "#f1f5f9", border: "none", cursor: "pointer" }}>
                Cancelar
              </button>
              <button
                className="sb2-start-btn"
                onClick={handleStart}
                disabled={!selectedLead || generatedCount === 0 || saving}
              >
                {saving ? <SpinIcon /> : <PlayIcon />}
                {saving ? "Guardando..." : "Crear secuencia"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}