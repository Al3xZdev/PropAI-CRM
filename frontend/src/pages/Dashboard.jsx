import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
  Users, Building2, Send, TrendingUp, Clock, 
  CheckCircle2, MessageCircle, Mail, Phone, Instagram,
  ArrowUpRight, AlertCircle, Zap, Loader2, Home, FileText,
  StickyNote, Trash2, CalendarDays, CalendarRange, X
} from 'lucide-react'
import { api } from '../utils/api'
import FollowUpModal from '../components/followups/FollowUpModal'

const Dashboard = ({ onNavigate }) => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState({ today: [], tomorrow: [], overdue: [], week: [] })
  const [completing, setCompleting] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [detailTarget, setDetailTarget] = useState(null)
  const [showFollowUpModal, setShowFollowUpModal] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const [leadsRes, propertiesRes, dashboardRes] = await Promise.all([
        api.get('/leads/stats/summary'),
        api.get('/properties'),
        api.get('/stats/dashboard')
      ])
      
      if (leadsRes.ok) {
        const leadsStats = await leadsRes.json()
        const propertiesData = await propertiesRes.json()
        
        setStats({
          leads: leadsStats,
          properties: propertiesData.properties?.length || 0
        })

        if (dashboardRes.ok) {
          const dash = await dashboardRes.json()
          setTasks(dash.followUps || { today: [], tomorrow: [], overdue: [], week: [] })
        }
      }
    } catch (err) {
      console.error('Error loading stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const completeTask = async (id) => {
    setCompleting(id)
    try {
      const res = await api.patch(`/followups/${id}/complete`)
      if (!res.ok) throw new Error('No se pudo completar la tarea')
      const data = await res.json().catch(() => ({}))
      const updated = data.followUp || { id, completedAt: new Date().toISOString() }
      setTasks(prev => {
        const next = {}
        for (const key of Object.keys(prev)) {
          next[key] = prev[key].map(f => f.id === id ? { ...f, completedAt: updated.completedAt } : f)
        }
        return next
      })
    } catch (err) {
      console.error('Error completing task:', err)
    } finally {
      setCompleting(null)
    }
  }

  const requestDelete = (followUp) => setDeleteTarget(followUp)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setDeleting(id)
    try {
      const res = await api.delete(`/followups/${id}`)
      if (!res.ok) throw new Error('No se pudo eliminar la tarea')
      setDeleteTarget(null)
      await loadStats()
    } catch (err) {
      console.error('Error deleting task:', err)
    } finally {
      setDeleting(null)
    }
  }

  const fmtTime = (iso) => {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: true })
    } catch {
      return ''
    }
  }

  const fmtWeek = (iso) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      const date = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
      const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: true })
      return `${date} · ${time}`
    } catch {
      return ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-slate-500">Cargando métricas...</div>
      </div>
    )
  }

  const leadStats = stats?.leads || {}
  const conversionRate = leadStats.total > 0 
    ? ((leadStats.respondieron / leadStats.total) * 100).toFixed(1) 
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Resumen de tu actividad inmobiliaria</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <span className="flex items-center gap-1 text-emerald-400 text-sm">
              <ArrowUpRight className="w-4 h-4" />
              +12%
            </span>
          </div>
          <h3 className="text-3xl font-bold text-white">{leadStats.total || 0}</h3>
          <p className="text-slate-400 text-sm">Total de Leads</p>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-violet-400" />
            </div>
            <span className="flex items-center gap-1 text-emerald-400 text-sm">
              <ArrowUpRight className="w-4 h-4" />
              Activo
            </span>
          </div>
          <h3 className="text-3xl font-bold text-white">{stats?.properties || 0}</h3>
          <p className="text-slate-400 text-sm">Propiedades</p>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center">
              <Send className="w-6 h-6 text-pink-400" />
            </div>
            <span className="text-slate-400 text-sm">Programadas</span>
          </div>
          <h3 className="text-3xl font-bold text-white">12</h3>
          <p className="text-slate-400 text-sm">Publicaciones</p>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="flex items-center gap-1 text-emerald-400 text-sm">
              <ArrowUpRight className="w-4 h-4" />
              +5%
            </span>
          </div>
          <h3 className="text-3xl font-bold text-white">{conversionRate}%</h3>
          <p className="text-slate-400 text-sm">Tasa de Conversión</p>
        </div>
      </div>

      {/* Lead Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div 
          onClick={() => onNavigate('leads', { status: 'nuevo' })}
          className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-2xl p-5 border border-blue-500/30 cursor-pointer hover:from-blue-500/30 hover:to-blue-600/20 transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-blue-400" />
            <span className="text-blue-400 font-medium">Nuevos</span>
          </div>
          <h4 className="text-3xl font-bold text-white">{leadStats.nuevos || 0}</h4>
          <p className="text-slate-400 text-sm mt-1">Requieren contacto</p>
        </div>

        <div 
          onClick={() => onNavigate('leads', { status: 'contactado' })}
          className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-2xl p-5 border border-amber-500/30 cursor-pointer hover:from-amber-500/30 hover:to-amber-600/20 transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-5 h-5 text-amber-400" />
            <span className="text-amber-400 font-medium">Contactados</span>
          </div>
          <h4 className="text-3xl font-bold text-white">{leadStats.contactados || 0}</h4>
          <p className="text-slate-400 text-sm mt-1">En seguimiento</p>
        </div>

        <div 
          onClick={() => onNavigate('leads', { status: 'respondio' })}
          className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-2xl p-5 border border-emerald-500/30 cursor-pointer hover:from-emerald-500/30 hover:to-emerald-600/20 transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 font-medium">Respondieron</span>
          </div>
          <h4 className="text-3xl font-bold text-white">{leadStats.respondieron || 0}</h4>
          <p className="text-slate-400 text-sm mt-1">Listos para cerrar</p>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <MessageCircle className="w-5 h-5 text-slate-400" />
            <span className="text-slate-400 font-medium">Por Canal</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-sm flex items-center gap-2"><Phone className="w-3 h-3" /> WhatsApp</span>
              <span className="text-white font-medium">{leadStats.byChannel?.whatsapp || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-sm flex items-center gap-2"><Mail className="w-3 h-3" /> Email</span>
              <span className="text-white font-medium">{leadStats.byChannel?.email || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-sm flex items-center gap-2"><Instagram className="w-3 h-3" /> Instagram</span>
              <span className="text-white font-medium">{leadStats.byChannel?.instagram || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Property Interest */}
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Interés por Tipo de Propiedad</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(leadStats.byPropertyType || {}).map(([type, count]) => (
            <div 
              key={type}
              onClick={() => onNavigate('leads', { propertyInterest: type })}
              className="bg-slate-700/50 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-700 transition-colors"
            >
              <h4 className="text-2xl font-bold text-white capitalize">{count}</h4>
              <p className="text-slate-400 text-sm capitalize">{type}</p>
              <div className="mt-2 h-1 bg-slate-600 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-violet-500"
                  style={{ width: `${(count / (leadStats.total || 1)) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Follow-up widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <FollowUpWidget
          title="Tareas para Hoy"
          icon={Clock}
          accent="blue"
          items={tasks.today}
          fmtTime={fmtTime}
          onComplete={completeTask}
          onDelete={requestDelete}
          onDetail={setDetailTarget}
          completing={completing}
          deleting={deleting}
          empty={
            <div className="py-6 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-sm text-slate-400">No hay tareas para hoy</p>
              <button
                onClick={() => setShowFollowUpModal(true)}
                className="text-sm text-blue-400 hover:text-blue-300 mt-1 transition-colors"
              >
                Crear follow-up →
              </button>
            </div>
          }
        />
        <FollowUpWidget
          title="Tareas Vencidas"
          icon={AlertCircle}
          accent="red"
          items={tasks.overdue}
          fmtTime={fmtTime}
          onComplete={completeTask}
          onDelete={requestDelete}
          onDetail={setDetailTarget}
          completing={completing}
          deleting={deleting}
          empty={
            <div className="py-6 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-sm text-slate-400">Sin tareas vencidas</p>
            </div>
          }
        />
        <FollowUpWidget
          title="Tareas para Mañana"
          icon={CalendarDays}
          accent="amber"
          items={tasks.tomorrow}
          fmtTime={fmtTime}
          onComplete={completeTask}
          onDelete={requestDelete}
          onDetail={setDetailTarget}
          completing={completing}
          deleting={deleting}
          empty={
            <p className="text-sm text-slate-400 py-6 text-center">No hay tareas para mañana</p>
          }
        />
        <FollowUpWidget
          title="Tareas de la Semana"
          icon={CalendarRange}
          accent="violet"
          items={tasks.week}
          fmtTime={fmtWeek}
          onComplete={completeTask}
          onDelete={requestDelete}
          onDetail={setDetailTarget}
          completing={completing}
          deleting={deleting}
          empty={
            <p className="text-sm text-slate-400 py-6 text-center">No hay tareas para la semana</p>
          }
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate('properties')}
          className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 hover:border-blue-500/50 transition-all text-left group"
        >
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
            <Building2 className="w-6 h-6 text-blue-400" />
          </div>
          <h4 className="text-white font-semibold mb-1">Nueva Propiedad</h4>
          <p className="text-slate-400 text-sm">Agrega una propiedad y genera contenido automáticamente</p>
        </button>

        <button
          onClick={() => onNavigate('leads')}
          className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 hover:border-emerald-500/50 transition-all text-left group"
        >
          <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/30 transition-colors">
            <Users className="w-6 h-6 text-emerald-400" />
          </div>
          <h4 className="text-white font-semibold mb-1">Ver Leads</h4>
          <p className="text-slate-400 text-sm">Revisa y gestiona tus leads de ventas</p>
        </button>

        <button
          onClick={() => onNavigate('automation')}
          className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 hover:border-violet-500/50 transition-all text-left group"
        >
          <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-violet-500/30 transition-colors">
            <Zap className="w-6 h-6 text-violet-400" />
          </div>
          <h4 className="text-white font-semibold mb-1">Automation</h4>
          <p className="text-slate-400 text-sm">Configura secuencias de follow-up automáticas</p>
        </button>
      </div>

      <FollowUpModal
        open={showFollowUpModal}
        onClose={() => setShowFollowUpModal(false)}
        onCreated={() => {
          setShowFollowUpModal(false)
          loadStats()
        }}
      />

      {deleteTarget && (
        <ConfirmDeletePopup
          followUp={deleteTarget}
          deleting={deleting === deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      {detailTarget && (
        <FollowUpDetailPopup
          followUp={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  )
}

const TYPE_LABELS = {
  call:             'Llamada',
  whatsapp:         'WhatsApp',
  email:            'Email',
  visit:            'Visita',
  quote:            'Cotización',
  note:             'Nota',
  automated:        'Automático',
  automation:       'Automatización',
  automated_failed: 'Automático fallido'
}

const TYPE_META = {
  call:             { icon: Phone,        color: 'blue' },
  whatsapp:         { icon: MessageCircle, color: 'emerald' },
  email:            { icon: Mail,         color: 'blue' },
  visit:            { icon: Home,         color: 'violet' },
  quote:            { icon: FileText,     color: 'amber' },
  note:             { icon: StickyNote,   color: 'slate' },
  automated:        { icon: Zap,          color: 'violet' },
  automation:       { icon: Zap,          color: 'violet' },
  automated_failed: { icon: AlertCircle,  color: 'red' }
}

const ICON_COLORS = {
  blue:    { box: 'bg-blue-500/20',    icon: 'text-blue-400' },
  emerald: { box: 'bg-emerald-500/20', icon: 'text-emerald-400' },
  violet:  { box: 'bg-violet-500/20',  icon: 'text-violet-400' },
  amber:   { box: 'bg-amber-500/20',   icon: 'text-amber-400' },
  slate:   { box: 'bg-slate-500/20',   icon: 'text-slate-400' },
  red:     { box: 'bg-red-500/20',     icon: 'text-red-400' }
}

const WIDGET_ACCENTS = {
  blue:  { box: 'bg-blue-500/20',  icon: 'text-blue-400',  badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  red:   { box: 'bg-red-500/20',   icon: 'text-red-400',   badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
  amber: { box: 'bg-amber-500/20', icon: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  violet:{ box: 'bg-violet-500/20',icon: 'text-violet-400',badge: 'bg-violet-500/20 text-violet-400 border-violet-500/30' }
}

// Widget de follow-ups (hoy / vencidas / mañana / semana) — patrón de tarjetas y filas del sistema
function FollowUpWidget({ title, icon: Icon, accent, items, fmtTime, onComplete, onDelete, onDetail, completing, deleting, empty }) {
  const a = WIDGET_ACCENTS[accent] || WIDGET_ACCENTS.blue

  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${a.box} rounded-xl flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${a.icon}`} />
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs border ${a.badge}`}>{items.filter(f => !f.completedAt).length}</span>
      </div>
      {items.length === 0 ? (
        empty
      ) : (
        <div className="space-y-2">
          {items.map(f => {
            const meta = TYPE_META[f.type] || { icon: StickyNote, color: 'slate' }
            const I = meta.icon
            const c = ICON_COLORS[meta.color] || ICON_COLORS.slate
            const done = Boolean(f.completedAt)
            return (
              <div
                key={f.id}
                onClick={() => onDetail && onDetail(f)}
                className={`flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors ${done ? 'opacity-60' : ''}`}
              >
                <div className={`w-8 h-8 ${c.box} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <I className={`w-4 h-4 ${c.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm text-white truncate ${done ? 'line-through' : ''}`}>{f.lead?.name || 'Lead sin nombre'}</p>
                  {f.note && <p className={`text-xs text-slate-400 mt-0.5 truncate ${done ? 'line-through' : ''}`}>{f.note}</p>}
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">{fmtTime(f.scheduledAt)}</span>
                {!done && (
                  <button
                    onClick={e => { e.stopPropagation(); onComplete(f.id) }}
                    disabled={completing === f.id}
                    className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 flex-shrink-0"
                    title="Marcar como completada"
                  >
                    {completing === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  </button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); onDelete(f) }}
                  disabled={deleting === f.id}
                  className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50 flex-shrink-0"
                  title="Eliminar follow-up"
                >
                  {deleting === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Popup de confirmación de eliminación — patrón de modal portaled del sistema
function ConfirmDeletePopup({ followUp, deleting, onCancel, onConfirm }) {
  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-sm shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Eliminar follow-up</h2>
              <p className="text-slate-400 text-xs">Esta acción no se puede deshacer</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-lg border border-slate-600 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-sm text-slate-300">
            ¿Eliminar el follow-up de <span className="text-white font-medium">{followUp.lead?.name || 'este lead'}</span>?
          </p>
          {followUp.note && (
            <p className="text-xs text-slate-400 mt-2 italic truncate">"{followUp.note}"</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-700">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Eliminar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Popup de detalle de follow-up — patrón de modal portaled del sistema
function FollowUpDetailPopup({ followUp, onClose }) {
  const meta = TYPE_META[followUp.type] || { icon: StickyNote, color: 'slate' }
  const Icon = meta.icon
  const c = ICON_COLORS[meta.color] || ICON_COLORS.slate
  const done = Boolean(followUp.completedAt)

  const fmtDate = (iso) => {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    } catch {
      return ''
    }
  }
  const fmtTime = (iso) => {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: true })
    } catch {
      return ''
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
            <div className={`w-10 h-10 ${c.box} rounded-xl flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${c.icon}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{TYPE_LABELS[followUp.type] || 'Follow-up'}</h2>
              <p className="text-slate-400 text-xs">Detalle de la tarea</p>
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
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Lead</label>
            <p className="text-white font-medium">{followUp.lead?.name || 'Lead sin nombre'}</p>
            {(followUp.lead?.phone || followUp.lead?.email) && (
              <p className="text-slate-400 text-sm mt-0.5">
                {[followUp.lead?.phone, followUp.lead?.email].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          {/* Fecha y hora */}
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Cuándo</label>
            <p className="text-white text-sm capitalize">{fmtDate(followUp.scheduledAt)}</p>
            <p className="text-slate-400 text-sm">{fmtTime(followUp.scheduledAt)}</p>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Estado</label>
            {done ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border bg-amber-500/20 text-amber-400 border-amber-500/30">
                <Clock className="w-3.5 h-3.5" />
                Pendiente
              </span>
            )}
          </div>

          {/* Nota */}
          {followUp.note && (
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Nota</label>
              <p className="text-slate-300 text-sm whitespace-pre-wrap bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2">
                {followUp.note}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default Dashboard
