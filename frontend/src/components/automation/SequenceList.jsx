import { useState } from "react";
import { Trash2, Edit3, Plus, ChevronRight, CheckCircle2, X, Loader2, Search, UserPlus, Play, Pause, Users, Check, Clock } from "lucide-react";

function StatusPill({ isActive }) {
  return isActive ? (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
      Activa
    </span>
  ) : (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
      Pausada
    </span>
  );
}

function StepRow({ step, isLast, colorClass }) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    violet: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
  };
  
  return (
    <div className="flex items-start gap-3 mb-1.5">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-[26px] h-[26px] rounded-full border flex items-center justify-center text-xs font-medium ${colorClasses[colorClass]}`}>
          D{step.day}
        </div>
        {!isLast && <div className="w-px h-3.5 bg-slate-700 my-0.5" />}
      </div>
      <div className="flex-1 min-w-0 bg-slate-700/50 rounded-lg px-3 py-2">
        <p className="text-xs text-slate-500 mb-0.5">Día {step.day}</p>
        <p className="text-sm font-medium text-white">{step.name || step.label}</p>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{step.message}</p>
      </div>
    </div>
  );
}

function DeleteModal({ seq, onConfirm, onCancel }) {
  if (!seq) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <h4 className="text-sm font-medium text-white mb-1.5">Eliminar secuencia</h4>
        <p className="text-xs text-slate-400 mb-5">
          ¿Seguro que querés eliminar <span className="font-medium text-slate-300">"{seq.name}"</span>? Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="text-xs px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="text-xs px-4 py-2 rounded-lg border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors font-medium">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function AddLeadsModal({ seq, allLeads, leadsInSequences, onConfirm, onCancel, apiUrl, getAuthHeaders }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  if (!seq) return null;

  // Filter leads: only show leads NOT already assigned to this sequence
  const alreadyInSeq = leadsInSequences[seq.id] || [];
  const inSeqLeadIds = new Set(alreadyInSeq.map(l => l.id));

  const availableLeads = allLeads.filter(lead => !inSeqLeadIds.has(lead.id));

  const filtered = availableLeads.filter(l =>
    l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase()) ||
    l.phone?.includes(search)
  );

  const toggleSelect = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

const handleConfirm = async () => {
    if (selected.size === 0 || adding) return;
    setAdding(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/automation/sequences/${seq.id}/leads`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: Array.from(selected) })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al agregar leads');
        setAdding(false);
        return;
      }
      // Success - clear adding FIRST, then close modal
      setAdding(false);
      onConfirm();
    } catch (e) {
      setError('Error de conexión');
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h4 className="text-sm font-medium text-white">Agregar leads a secuencia</h4>
            <p className="text-xs text-slate-400 mt-0.5">"{seq.name}"</p>
          </div>
          <button onClick={onCancel} className="w-7 h-7 rounded-lg border border-slate-600 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {filtered.length} lead{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="max-h-64 overflow-y-auto px-5 py-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500">
              No hay leads disponibles
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map(lead => (
                <label key={lead.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => toggleSelect(lead.id)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500/50"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{lead.name || 'Sin nombre'}</p>
                    <p className="text-xs text-slate-400 truncate">{lead.email || 'Sin email'} · {lead.phone || 'Sin teléfono'}</p>
                  </div>
                  <span className="text-xs text-slate-500 capitalize">{lead.status || 'nuevo'}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="px-5 py-2">
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-700">
          <p className="text-xs text-slate-400">
            {selected.size > 0 ? `${selected.size} seleccionado${selected.size !== 1 ? 's' : ''}` : 'Ninguno seleccionado'}
          </p>
          <div className="flex gap-2">
            <button onClick={onCancel} className="text-xs px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0 || adding}
              className="text-xs px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {adding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {adding ? 'Agregando...' : selected.size > 0 ? `Agregar (${selected.size})` : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sequence Actions Modal (start / pause / resume)
// -----------------------------------------------------------------------------
function SequenceActionsModal({ seq, leadsInSeq, onAction, onClose, apiUrl, getAuthHeaders }) {
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');

  if (!seq) return null;

  const leadCount = leadsInSeq?.length || 0;

  const handleAction = async (action) => {
    setLoading(action);
    setError('');
    try {
      if (action === 'start') {
        // Start sequence for each lead individually
        const results = [];
        for (const lead of leadsInSeq) {
          const res = await fetch(`${apiUrl}/automation/sequences/${seq.id}/start`, {
            method: 'POST',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId: lead.id })
          });
          const data = await res.json();
          results.push({ leadId: lead.id, name: lead.name, ok: res.ok, error: data.error });
        }
        const failed = results.filter(r => !r.ok);
        const succeeded = results.filter(r => r.ok);
        if (failed.length > 0 && succeeded.length === 0) {
          setError(failed[0].error || 'Error al iniciar secuencia');
          setLoading('');
          return;
        }
        if (succeeded.length > 0 && failed.length > 0) {
          // Partial success — show warning but still close
          setLoading('');
          onAction('start');
          return;
        }
        // All succeeded
        setLoading('');
        onAction('start');
        return;
      } else {
        let url;
        if (action === 'pause') url = `${apiUrl}/automation/sequences/${seq.id}/pause`;
        else if (action === 'resume') url = `${apiUrl}/automation/sequences/${seq.id}/resume`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || `Error al ${action}`);
          setLoading('');
          return;
        }
      }
      onAction(action);
    } catch (e) {
      setError('Error de conexión');
      setLoading('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h4 className="text-sm font-medium text-white">Control de secuencia</h4>
            <p className="text-xs text-slate-400 mt-0.5">"{seq.name}"</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg border border-slate-600 flex items-center justify-center text-slate-400 hover:bg-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-center gap-3 mb-4 p-3 bg-slate-700/50 rounded-lg">
            <Users className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-white">{leadCount} lead{leadCount !== 1 ? 's' : ''} en secuencia</p>
              <p className="text-xs text-slate-400">{seq.steps?.length || 0} mensajes de seguimiento</p>
            </div>
          </div>

          {leadCount === 0 ? (
            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              Agregá leads a la secuencia antes de iniciarla.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 mb-2">Acciones disponibles:</p>

              <button
                onClick={() => handleAction('start')}
                disabled={loading !== ''}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
              >
                {loading === 'start' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                <span className="text-xs font-medium">Iniciar secuencia</span>
              </button>

              <button
                onClick={() => handleAction('pause')}
                disabled={loading !== ''}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
              >
                {loading === 'pause' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                <span className="text-xs font-medium">Pausar secuencia</span>
              </button>

              <button
                onClick={() => handleAction('resume')}
                disabled={loading !== ''}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
              >
                {loading === 'resume' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                <span className="text-xs font-medium">Reanudar secuencia</span>
              </button>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-3">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Leads in Sequence Modal
// -----------------------------------------------------------------------------
function LeadsInSequenceModal({ seq, leadsInSeq, onRemove, onClose, apiUrl, getAuthHeaders }) {
  const [removing, setRemoving] = useState('');

  if (!seq) return null;

  const handleRemove = async (leadId) => {
    setRemoving(leadId);
    try {
      const res = await fetch(`${apiUrl}/automation/sequences/${seq.id}/leads/${leadId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        onRemove(leadId);
      }
    } catch (e) {
      console.error('Error removing lead:', e);
    }
    setRemoving('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h4 className="text-sm font-medium text-white">Leads en secuencia</h4>
            <p className="text-xs text-slate-400 mt-0.5">"{seq.name}" — {leadsInSeq?.length || 0} lead{leadsInSeq?.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg border border-slate-600 flex items-center justify-center text-slate-400 hover:bg-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto px-5 py-3">
          {!leadsInSeq || leadsInSeq.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500">
              No hay leads en esta secuencia.
            </div>
          ) : (
            <div className="space-y-2">
              {leadsInSeq.map(lead => (
                <div key={lead.id} className="flex items-center gap-3 px-3 py-3 rounded-lg bg-slate-700/50">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {lead.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{lead.name || 'Sin nombre'}</p>
                    <p className="text-xs text-slate-400 truncate">{lead.email || 'Sin email'} · {lead.phone || 'Sin teléfono'}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(lead.id)}
                    disabled={removing === lead.id}
                    className="w-7 h-7 rounded-lg border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 flex-shrink-0"
                    title="Quitar de secuencia"
                  >
                    {removing === lead.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-700 flex justify-end">
          <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------
export default function SequenceList({
  sequences = [],
  leads = [],
  leadsInSequences = {},   // { sequenceId: [lead, lead, ...] }
  onCreateNew,
  onEdit,
  onRefresh,
  onDeleteSequence,
  apiUrl,
  getAuthHeaders,
}) {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [addLeadsTarget, setAddLeadsTarget] = useState(null);
  const [actionsTarget, setActionsTarget] = useState(null);
  const [viewLeadsTarget, setViewLeadsTarget] = useState(null);

  const activeCount = sequences.filter((s) => s.isActive).length;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (onDeleteSequence) {
      try {
        await onDeleteSequence(deleteTarget);
      } catch (e) {
        console.error('Error deleting:', e);
        return;
      }
    }
    setDeleteTarget(null);
  };

  const handleAddLeadsConfirm = () => {
    setAddLeadsTarget(null);
    if (onRefresh) onRefresh();
  };

  const handleActionsConfirm = (action) => {
    setActionsTarget(null);
    if (onRefresh) onRefresh();
  };

  const handleViewLeadsRemove = (leadId) => {
    if (onRefresh) onRefresh();
  };

  // Get leads for a specific sequence
  const getLeadsForSeq = (seqId) => {
    return leadsInSequences[seqId] || [];
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-700">
        <div>
          <h2 className="text-lg font-medium text-white">Secuencias de seguimiento</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {sequences.length} secuencia{sequences.length !== 1 ? "s" : ""} · {activeCount} activa{activeCount !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva secuencia
        </button>
      </div>

      {/* List */}
      {sequences.length === 0 ? (
        <div className="text-center py-16 text-sm text-slate-500">
          No hay secuencias creadas todavía.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sequences.map((seq) => {
            const leadsInSeq = getLeadsForSeq(seq.id);
            const leadCount = leadsInSeq.length;
            const respondedCount = leadsInSeq.filter(l => l.status === 'respondio').length;
            const respRate = leadCount > 0 ? Math.round((respondedCount / leadCount) * 100) : 0;
            const stepColors = ['blue', 'violet', 'amber', 'emerald', 'pink'];

            return (
              <div key={seq.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-colors">
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-700/30 transition-colors"
                  onClick={() => setViewLeadsTarget(seq)}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                    seq.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                  }`}>
                    {leadCount}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{seq.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <StatusPill isActive={seq.isActive} />
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      <span className="text-xs text-slate-400 capitalize">{seq.channel || 'whatsapp'}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      <span className="text-xs text-slate-400">{seq.steps?.length || 0} mensajes</span>
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      <span className="text-xs text-slate-400">{leadCount} leads</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setActionsTarget(seq)}
                      className="w-7 h-7 rounded-lg border border-slate-600 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
                      title="Control de secuencia"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setAddLeadsTarget(seq)}
                      className="w-7 h-7 rounded-lg border border-blue-500/30 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-colors"
                      title="Agregar leads"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(seq)}
                      className="w-7 h-7 rounded-lg border border-slate-600 flex items-center justify-center text-slate-400 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-colors"
                      title="Eliminar secuencia"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(seq)}
                      className="w-7 h-7 rounded-lg border border-slate-600 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
                      title="Editar secuencia"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Steps Preview */}
                <div className="border-t border-slate-700 px-4 py-4">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                    Mensajes de seguimiento
                  </p>
                  {seq.steps?.map((step, i) => (
                    <StepRow key={i} step={step} isLast={i === (seq.steps?.length || 0) - 1} colorClass={stepColors[i % stepColors.length]} />
                  ))}

                  {/* Stats */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700 flex-wrap gap-3">
                    <div className="flex gap-5">
                      <div>
                        <p className="text-sm font-medium text-white">{leadCount}</p>
                        <p className="text-xs text-slate-500">leads asignados</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{respondedCount}</p>
                        <p className="text-xs text-slate-500">respondieron</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{respRate}%</p>
                        <p className="text-xs text-slate-500">tasa respuesta</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <DeleteModal
        seq={deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <AddLeadsModal
        key={addLeadsTarget?.id || 'closed'}
        seq={addLeadsTarget}
        allLeads={leads}
        leadsInSequences={leadsInSequences}
        onConfirm={handleAddLeadsConfirm}
        onCancel={() => setAddLeadsTarget(null)}
        apiUrl={apiUrl}
        getAuthHeaders={getAuthHeaders}
      />

      <SequenceActionsModal
        seq={actionsTarget}
        leadsInSeq={actionsTarget ? getLeadsForSeq(actionsTarget.id) : []}
        onAction={handleActionsConfirm}
        onClose={() => setActionsTarget(null)}
        apiUrl={apiUrl}
        getAuthHeaders={getAuthHeaders}
      />

      <LeadsInSequenceModal
        seq={viewLeadsTarget}
        leadsInSeq={viewLeadsTarget ? getLeadsForSeq(viewLeadsTarget.id) : []}
        onRemove={handleViewLeadsRemove}
        onClose={() => setViewLeadsTarget(null)}
        apiUrl={apiUrl}
        getAuthHeaders={getAuthHeaders}
      />
    </div>
  );
}