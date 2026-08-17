import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Phone, MessageCircle, Mail, Home, FileText, StickyNote,
  Search, X, Check, CheckCircle2, Loader2
} from 'lucide-react'
import { api } from '../../utils/api'

const TYPES = [
  { value: 'call', label: 'Llamada', icon: Phone },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'visit', label: 'Visita', icon: Home },
  { value: 'quote', label: 'Cotización', icon: FileText },
  { value: 'note', label: 'Nota', icon: StickyNote }
]

const TIME_OPTIONS = (() => {
  const opts = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const period = h < 12 ? 'AM' : 'PM'
      const h12 = h % 12 || 12
      opts.push(`${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`)
    }
  }
  return opts
})()

const to24h = (time12) => {
  const [time, period] = time12.split(' ')
  const [h, m] = time.split(':').map(Number)
  let hours = h
  if (period === 'PM' && h !== 12) hours = h + 12
  if (period === 'AM' && h === 12) hours = 0
  return `${hours.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

const fmtSummaryTime = (time24) => {
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'p.m.' : 'a.m.'
  const h12 = h % 12 || 12
  return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`
}

export default function FollowUpModal({ open, onClose, onCreated }) {
  const [leadSearch, setLeadSearch] = useState('')
  const [leads, setLeads] = useState([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [type, setType] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState({ lead: false, type: false, date: false, time: false })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    if (!open) return
    setLeadSearch('')
    setLeads([])
    setLeadsLoading(false)
    setDropdownOpen(false)
    setSelectedLead(null)
    setType('')
    setDate('')
    setTime('')
    setNote('')
    setTouched({ lead: false, type: false, date: false, time: false })
    setSubmitting(false)
    setSubmitError(null)
  }, [open])

  const loadLeads = async () => {
    setLeadsLoading(true)
    try {
      const res = await api.get('/leads')
      if (!res.ok) return
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.leads || [])
      setLeads(list)
    } catch (err) {
      console.error('Error loading leads:', err)
    } finally {
      setLeadsLoading(false)
    }
  }

  useEffect(() => {
    if (open) loadLeads()
  }, [open])

  if (!open) return null

  const q = leadSearch.trim().toLowerCase()
  const filteredLeads = leads.filter(l =>
    !q ||
    (l.name || '').toLowerCase().includes(q) ||
    (l.email || '').toLowerCase().includes(q) ||
    (l.phone || '').toLowerCase().includes(q)
  )

  const handleLeadChange = (e) => {
    setSelectedLead(null)
    setLeadSearch(e.target.value)
    setDropdownOpen(true)
  }

  const selectLead = (lead) => {
    setSelectedLead(lead)
    setLeadSearch(lead.name || '')
    setDropdownOpen(false)
  }

  const isValid = Boolean(selectedLead && type && date && time)
  const time24 = time ? to24h(time) : ''
  const summaryDate = date && time24 ? new Date(`${date}T${time24}`) : null
  const summaryDateStr = summaryDate
    ? summaryDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''
  const typeLabel = TYPES.find(t => t.value === type)?.label || ''

  const handleSubmit = async () => {
    setTouched({ lead: true, type: true, date: true, time: true })
    if (!isValid) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const scheduledAt = new Date(`${date}T${time24}`)
      const res = await api.post('/followups', { leadId: selectedLead.id, type, note, scheduledAt })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'No se pudo crear el follow-up')
      }
      onCreated?.()
      onClose()
    } catch (err) {
      setSubmitError(err.message || 'Error al crear el follow-up')
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Phone className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Nuevo Follow-up</h2>
              <p className="text-slate-400 text-xs">Programá una acción de seguimiento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-slate-600 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Lead */}
          <div>
            <label className="block text-sm text-slate-300 mb-2">Lead *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar lead..."
                value={leadSearch}
                onChange={handleLeadChange}
                onFocus={() => setDropdownOpen(true)}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 outline-none"
              />
              {dropdownOpen && leadSearch && !selectedLead && (
                <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {leadsLoading ? (
                    <div className="px-3 py-2 text-sm text-slate-400">Buscando leads...</div>
                  ) : filteredLeads.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-400">Sin resultados</div>
                  ) : (
                    filteredLeads.slice(0, 6).map(lead => (
                      <button
                        key={lead.id}
                        type="button"
                        onMouseDown={e => { e.preventDefault(); selectLead(lead) }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-700/50 transition-colors"
                      >
                        <p className="text-sm text-white truncate">{lead.name}</p>
                        <p className="text-xs text-slate-400 truncate">{lead.phone || lead.email || ''}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedLead && (
              <div className="mt-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Seleccionado: {selectedLead.name}</span>
              </div>
            )}
            {touched.lead && !selectedLead && (
              <p className="text-red-400 text-xs mt-1">Seleccioná un lead</p>
            )}
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm text-slate-300 mb-2">Tipo de Follow-up *</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(t => {
                const Icon = t.icon
                const active = type === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-medium transition-colors ${
                      active
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                        : 'border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {t.label}
                  </button>
                )
              })}
            </div>
            {touched.type && !type && (
              <p className="text-red-400 text-xs mt-1">Elegí un tipo de follow-up</p>
            )}
          </div>

          {/* Fecha + Hora */}
          <div>
            <label className="block text-sm text-slate-300 mb-2">Fecha y Hora *</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:border-blue-500 outline-none"
                />
                {touched.date && !date && (
                  <p className="text-red-400 text-xs mt-1">Elegí una fecha</p>
                )}
              </div>
              <div>
                <select
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:border-blue-500 outline-none"
                >
                  <option value="">Hora...</option>
                  {TIME_OPTIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {touched.time && !time && (
                  <p className="text-red-400 text-xs mt-1">Elegí una hora</p>
                )}
              </div>
            </div>
          </div>

          {/* Nota */}
          <div>
            <label className="block text-sm text-slate-300 mb-2">Nota (opcional)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ej: Confirmar intereses del cliente, verificar disponibilidad..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          {/* Resumen dinámico */}
          {isValid && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-sm text-emerald-400">
              Programado: {typeLabel} para {selectedLead.name} el {summaryDateStr}, {fmtSummaryTime(time24)}
            </div>
          )}

          {submitError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-400">
              {submitError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Crear Follow-up
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
