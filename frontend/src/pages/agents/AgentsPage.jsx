import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useTheme } from '../../hooks/useTheme'
import { 
  Users, UserPlus, Briefcase, Clock, TrendingUp, 
  CheckCircle2, AlertCircle, Loader2, X,
  Phone, Mail, Home, Calendar, DollarSign, Target,
  ChevronRight, Sparkles, Bell, BarChart3, MapPin, Globe,
  Check, Trash2, AlertTriangle, Flame, Zap
} from 'lucide-react'

import { api } from '../../utils/api'
import CommissionsView from './CommissionsView'
import PhoneInput from '../../components/PhoneInput'
import { isValidPhoneNumber } from 'libphonenumber-js'

// Color palette for agents
const AGENT_COLORS = ['#818cf8', '#34d399', '#fb923c', '#f472b6', '#60a5fa', '#a78bfa', '#fbbf24', '#22d3ee']

const getRandomColor = (index) => AGENT_COLORS[index % AGENT_COLORS.length]

// Simple Sparkline component
function Sparkline({ data, color = '#818cf8' }) {
  if (!data || data.length === 0) return null
  
  const max = Math.max(...data)
  const min = Math.min(...data)
  const width = 80
  const height = 28
  
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / (max - min || 1)) * height
    return `${x},${y}`
  }).join(' ')
  
  const fillPoints = `0,${height} ${points} ${width},${height}`
  
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
      <polygon points={fillPoints} fill={color} opacity="0.1" stroke="none"/>
    </svg>
  )
}

// Funnel Chart
function FunnelChart({ pipeline, color = '#818cf8', colors }) {
  const stages = ["nuevo", "contactado", "propuesta", "negociacion", "cerrado"]
  const max = Math.max(...stages.map(s => pipeline[s] || 0))
  
  return (
    <div className="flex flex-col gap-1.5">
      {stages.map(s => {
        const val = pipeline[s] || 0
        const pct = max > 0 ? (val / max) * 100 : 0
        return (
          <div key={s} className="flex items-center gap-2">
            <span className="w-16 text-xs shrink-0" style={{ color: colors?.muted || '#72767a' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
            <div className="flex-1 h-5 rounded overflow-hidden relative" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <div 
                className="h-full rounded transition-all duration-300"
                style={{ 
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${stageConfig[s].color}88, ${stageConfig[s].color}44)`
                }}
              />
            </div>
            <span className="w-6 text-sm font-bold text-right" style={{ color: stageConfig[s].color }}>{val}</span>
          </div>
        )
      })}
    </div>
  )
}

// Stage config
const stageConfig = {
  nuevo: { label: 'Nuevo', color: '#94a3b8' },
  contactado: { label: 'Contactado', color: '#818cf8' },
  respondio: { label: 'Respondió', color: '#34d399' },
  propuesta: { label: 'Propuesta', color: '#fb923c' },
  negociacion: { label: 'Negociación', color: '#f59e0b' },
  cerrado: { label: 'Cerrado', color: '#10b981' },
  perdido: { label: 'Perdido', color: '#ef4444' }
}

const priorityConfig = {
  alta: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', label: 'Alta' },
  media: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', label: 'Media' },
  baja: { color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)', label: 'Baja' },
};

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

// ── Nuevo look: componentes presentacionales ──────────────────────────────
function AgentAvatar({ initial, size = 'md' }) {
  const sizes = { sm: 'w-9 h-9 text-sm', md: 'w-12 h-12 text-lg' }
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0`}>
      {initial}
    </div>
  )
}

function AgentListItem({ agent, selected, onSelect }) {
  const pct = Math.min(100, agent.loadPercent || 0)
  const barColor = pct > 90 ? 'bg-rose-500' : pct > 70 ? 'bg-amber-400' : 'bg-emerald-500'
  return (
    <button
      onClick={() => onSelect(agent)}
      className={`w-full text-left rounded-xl p-3 transition-colors flex items-start gap-3 ${selected ? 'bg-slate-800/90 ring-1 ring-blue-500/40' : 'bg-slate-900/60 hover:bg-slate-800/50'}`}
    >
      <AgentAvatar initial={agent.initial} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="text-sm font-semibold text-white truncate">{agent.name}</p>
          {agent.top && <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400 shrink-0" />}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{agent.activeLeads} leads activos</p>
        <div className="h-1.5 rounded-full bg-slate-800 mt-2 overflow-hidden">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </button>
  )
}

function KpiCard({ label, value, valueClassName }) {
  return (
    <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueClassName || 'text-white'}`}>{value}</p>
    </div>
  )
}

function WeeklyTrendChart({ data, thisWeek }) {
  const max = Math.max(...data, 1)
  return (
    <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-white">Tendencia semanal</p>
          <p className="text-xs text-slate-400 mt-0.5">Leads recibidos en los últimos 7 días</p>
        </div>
        <span className="text-xs text-blue-400 font-medium bg-blue-500/10 px-2.5 py-1 rounded-full">
          {thisWeek} esta semana
        </span>
      </div>
      <div className="flex items-end gap-1.5 h-28">
        {data.map((value, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full rounded-t-md transition-all duration-500" style={{ height: `${(value / max) * 100}%`, backgroundColor: i === data.length - 1 ? '#3b82f6' : '#1e3a5f' }} />
            <span className="text-[10px] text-slate-500">{DAY_LABELS[i]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function UnassignedLeadsBanner({ count, onManual, onRoundRobin }) {
  if (count === 0) return null
  return (
    <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
        <p className="text-sm text-amber-200">
          Hay <span className="font-semibold">{count}</span> leads sin asignar
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onManual} className="text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-colors">
          Asignación manual
        </button>
        <button onClick={onRoundRobin} className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-3 py-1.5 rounded-lg transition-colors">
          Round-robin
        </button>
      </div>
    </div>
  )
}

// ── Nuevo look: Analytics ────────────────────────────────────────────────
function conversionColor(pct) {
  if (pct >= 70) return '#4ade80' // verde
  if (pct >= 50) return '#facc15' // amarillo
  return '#f87171' // rojo
}
function closingColor(days) {
  if (days <= 6) return '#4ade80'
  if (days <= 10) return '#facc15'
  return '#f87171'
}

function SummaryCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="bg-slate-900 rounded-lg p-3.5">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={15} className="text-slate-400" />
        <span className="text-[11px] text-slate-400">{label}</span>
      </div>
      <div className="text-[22px] font-medium text-white">{value}</div>
      <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div>
    </div>
  )
}

function BarRow({ label, valueLabel, percent, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-200">{label}</span>
        <span style={{ color }} className="font-medium">
          {valueLabel}
        </span>
      </div>
      <div className="h-[5px] bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
    </div>
  )
}

function ClosingTimeRow({ label, days, percent, color }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-16 text-xs text-slate-200 shrink-0">{label}</span>
      <div className="flex-1 h-[5px] bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
      <span
        style={{ color }}
        className="w-10 text-right text-xs font-medium shrink-0"
      >
        {days}d
      </span>
    </div>
  )
}

function RankingRow({ position, agent, isTop }) {
  return (
    <div
      className={`flex items-center gap-2.5 py-2 ${
        !isTop ? 'border-t border-slate-800' : ''
      }`}
    >
      <span
        className={`w-4 text-xs ${
          position === 1 ? 'text-amber-400' : 'text-slate-500'
        }`}
      >
        {position}
      </span>
      <div className="w-7 h-7 rounded-full bg-slate-800 text-indigo-200 flex items-center justify-center text-xs font-medium shrink-0">
        {agent.initial}
      </div>
      <span
        className={`flex-1 text-[13px] ${
          isTop ? 'text-white font-medium' : 'text-slate-200'
        }`}
      >
        {agent.name}
      </span>
      <span
        style={{ color: conversionColor(agent.conversion) }}
        className="text-xs w-10 text-right"
      >
        {agent.conversion}%
      </span>
      <span className="text-xs text-slate-400 w-20 text-right">
        {agent.closingDays}d cierre
      </span>
      <span className="text-xs text-white font-medium w-20 text-right">
        ${agent.revenue.toLocaleString('es-MX')}
      </span>
    </div>
  )
}

const AgentsPage = ({ onNavigate, user }) => {
  // Theme colors - always dark mode
  const colors = {
    background: '#17181c',
    card: '#17181c',
    foreground: '#d9d9d9',
    muted: '#72767a',
    border: '#242628',
    primary: '#1c9cf0',
    cardBg: 'rgba(255,255,255,0.05)',
  }
  
  const [loading, setLoading] = useState(true)
  const [realAgents, setRealAgents] = useState([])
  const [unassignedLeads, setUnassignedLeads] = useState([])
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showManualAssign, setShowManualAssign] = useState(false) // deprecated - use showLeadAssignModal
  const [activeTab, setActiveTab] = useState('overview')
  const [globalView, setGlobalView] = useState('agents')
  const [notes, setNotes] = useState({})
  const [newNote, setNewNote] = useState('')
  const [allAvailableLeads, setAllAvailableLeads] = useState([])
  const [selectedLeadsToAssign, setSelectedLeadsToAssign] = useState([])
  const [showLeadAssignModal, setShowLeadAssignModal] = useState(false)
  const [showVacationModal, setShowVacationModal] = useState(false)
  const [vacationForm, setVacationForm] = useState({ label: '', from: '', to: '' })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [agentLeads, setAgentLeads] = useState([]) // Leads for selected agent
  const [agentCommissions, setAgentCommissions] = useState([])
  const [commissionsLoading, setCommissionsLoading] = useState(false)
  const [commissionsMonth, setCommissionsMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [showPayModal, setShowPayModal] = useState(null) // commission object or null
  const [payingCommission, setPayingCommission] = useState(false)
  const [paySuccess, setPaySuccess] = useState(null)
  
  // Create user form
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'agent'
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [workloadRes, unassignedRes, statsRes] = await Promise.all([
        api.get('/assignment/workload').catch(() => ({ ok: true, json: () => ({ workload: [] }) })),
        api.get('/assignment/unassigned').catch(() => ({ ok: true, json: () => ({ leads: [] }) })),
        api.get('/stats/agents').catch(() => ({ ok: true, json: async () => ({ agents: [] }) }))
      ])
      
      const workloadData = await workloadRes.json()
      const unassignedData = await unassignedRes.json()
      const statsData = await statsRes.json()
      const realStats = {}
      for (const s of (statsData.agents || [])) realStats[s.id] = s
      
      // Convert real agents with colors
      const realWithColor = (workloadData.workload || []).map((agent, idx) => ({
        ...agent,
        color: getRandomColor(idx),
        weeklyTrend: realStats[agent.id]?.weeklyTrend || Array.from({ length: 7 }, () => 0),
        revenue: realStats[agent.id]?.revenue || 0,
        conversionRate: realStats[agent.id]?.conversionRate || 0,
        avgCloseDays: realStats[agent.id]?.avgCloseDays || 0,
        pipeline: realStats[agent.id]?.pipeline || {},
        phone: realStats[agent.id]?.phone || '',
        email: agent.email,
        vacations: [],
        notes: []
      }))
      
      setRealAgents(realWithColor)
      setUnassignedLeads(unassignedData.leads || [])
      
      // Combine real agents
      const allAgents = realWithColor
      
      // Select first real agent by default
      if (allAgents.length > 0 && !selectedAgent) {
        setSelectedAgent(realWithColor[0])
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setSelectedAgent(realAgents[0])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAgent = async (agent) => {
    setSelectedAgent(agent)
    setActiveTab('overview')
    setNewNote('')
    
    // Load notes for this agent
    if (agent.notes) {
      setNotes(agent.notes)
    } else {
      setNotes([])
    }
    
    // Load leads for the agent
    try {
      const res = await api.get(`/assignment/agents/${agent.id}/leads`)
      const data = await res.json()
      setAgentLeads(data.leads || [])
    } catch (err) {
      console.error('Error loading agent leads:', err)
      setAgentLeads([])
    }

    // Load commissions for this agent
    setAgentCommissions([])
    fetchAgentCommissions(agent.id, commissionsMonth)
  }

  const handleAddNote = (agentId) => {
    if (!newNote.trim()) return
    
    const currentNotes = notes[agentId] || []
    const updatedNotes = { ...notes, [agentId]: [...currentNotes, newNote.trim()] }
    setNotes(updatedNotes)
    setNewNote('')
    
    toast.success('Nota agregada')
  }

  // Load all leads for assignment
  const loadAllLeads = async () => {
    try {
      const res = await api.get('/leads')
      const data = await res.json()
      setAllAvailableLeads(data.leads || [])
    } catch (err) {
      console.error('Error loading leads:', err)
    }
  }

  // ---- Fetch commissions for selected agent ----
  const fetchAgentCommissions = async (agentId, month) => {
    if (!agentId) return
    setCommissionsLoading(true)
    try {
      const m = month || commissionsMonth
      const res = await api.get(`/commissions/detail?month=${m}&agentId=${agentId}&limit=50`)
      if (res.ok) {
        const data = await res.json()
        setAgentCommissions(data.commissions || [])
      }
    } catch (err) {
      console.error('Error loading agent commissions:', err)
    } finally {
      setCommissionsLoading(false)
    }
  }

  const handlePayCommission = async (commissionId) => {
    setPayingCommission(true)
    try {
      const res = await api.put(`/commissions/${commissionId}`, { status: 'paid' })
      if (res.ok) {
        setPaySuccess('Comisión marcada como pagada')
        setShowPayModal(null)
        fetchAgentCommissions(selectedAgent.id, commissionsMonth)
      } else {
        const err = await res.json()
        setPaySuccess(null)
        console.error('Error paying commission:', err.error)
      }
    } catch (err) {
      console.error('Error paying commission:', err)
    } finally {
      setPayingCommission(false)
      setTimeout(() => setPaySuccess(null), 3000)
    }
  }

  // Open lead assignment modal
  const openLeadAssignModal = async () => {
    await loadAllLeads()
    setSelectedLeadsToAssign([])
    setShowLeadAssignModal(true)
  }

  // Toggle lead selection for assignment
  const toggleLeadSelection = (leadId) => {
    setSelectedLeadsToAssign(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    )
  }

  // Assign selected leads to specific agent
  const assignLeadsToAgent = async (agentId) => {
    if (selectedLeadsToAssign.length === 0) {
      toast.error('Selecciona al menos un lead')
      return
    }

    let assigned = 0
    for (const leadId of selectedLeadsToAssign) {
      try {
        const res = await api.post(`/assignment/assign/${leadId}`, { agentId })
        if (res.ok) assigned++
      } catch (err) {
        console.error('Error assigning lead:', err)
      }
    }

    toast.success(`${assigned} lead(s) asignado(s)`)
    setShowLeadAssignModal(false)
    setSelectedLeadsToAssign([])
    loadData()
  }

  // Add vacation
  const handleAddVacation = (agentId) => {
    if (!vacationForm.label || !vacationForm.from || !vacationForm.to) {
      toast.error('Completá todos los campos')
      return
    }

    const currentAgent = selectedAgent
    if (!currentAgent) return

    // Add vacation to agent's vacations array
    const currentVacations = currentAgent.vacations || []
    const newVacation = {
      ...vacationForm,
      createdAt: new Date().toISOString()
    }
    
    // Update agent's vacations
    const updatedAgents = allAgents.map(a => 
      a.id === agentId 
        ? { ...a, vacations: [...currentVacations, newVacation] }
        : a
    )

    // Update selected agent
    setSelectedAgent({ ...currentAgent, vacations: [...currentVacations, newVacation] })
    
    toast.success('Vacación registrada')
    setShowVacationModal(false)
    setVacationForm({ label: '', from: '', to: '' })
  }

  const handleAutoAssign = async () => {
    try {
      const res = await api.post('/assignment/auto-assign', { count: unassignedLeads.length })
      const data = await res.json()
      
      if (res.ok) {
        toast.success(data.message || 'Leads asignados', {
          description: `${data.assigned} leads distribuidos`
        })
        loadData()
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      toast.error('Error', { description: err.message })
    }
  }

  const handleManualAssign = async (agentId) => {
    for (const lead of unassignedLeads) {
      try {
        await api.post(`/assignment/assign/${lead.id}`, { agentId })
      } catch (err) {
        console.error('Error assigning lead:', err)
      }
    }
    
    toast.success('Leads asignados', {
      description: `${unassignedLeads.length} leads asignados`
    })
    setShowManualAssign(false)
    loadData()
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()

    if (newUser.phone && !isValidPhoneNumber(newUser.phone)) {
      toast.error('El número de teléfono es inválido para el país seleccionado')
      return
    }

    setCreating(true)
    
    try {
      const res = await api.post('/auth/admin/create-user', newUser)
      const data = await res.json()
      
      if (res.ok) {
        toast.success('Usuario creado', {
          description: `${data.user.email} agregado como agente`
        })
        setShowCreateUser(false)
        setNewUser({ name: '', email: '', phone: '', password: '', role: 'agent' })
        loadData()
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      toast.error('Error', { description: err.message })
    } finally {
      setCreating(false)
    }
  }

  // Combine agents for display
  const allAgents = realAgents
  const totalRevenue = allAgents.reduce((s, a) => s + (a.revenue || 0), 0)
  const avgConversion = allAgents.length > 0 
    ? Math.round(allAgents.reduce((s, a) => s + (a.conversionRate || 0), 0) / allAgents.length)
    : 0
  const totalActiveLeads = allAgents.reduce((s, a) => s + (a.stats?.totalLeads || 0), 0)
  const totalClosedLeads = allAgents.reduce((s, a) => s + (a.stats?.closed || a.stats?.byStatus?.respondio || a.stats?.byStatus?.cerrado || 0), 0)
  const maxWorkload = Math.max(...allAgents.map(a => (a.stats?.totalLeads || 0) + (a.stats?.pendingFollowUps || 0)), 1)
  const maxCloseDays = Math.max(...allAgents.map(a => a.avgCloseDays || 0), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  const NAV = [
    { key: 'agents', label: 'Agentes', icon: Users },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'alerts', label: 'Alertas', icon: Bell, badge: unassignedLeads.length },
    { key: 'commissions', label: 'Comisiones', icon: DollarSign }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {globalView === 'agents' && 'Gestión de Agentes'}
            {globalView === 'analytics' && 'Analytics & Performance'}
            {globalView === 'alerts' && 'Alertas & Monitoreo'}
            {globalView === 'commissions' && 'Comisiones'}
          </h1>
          <p className="text-slate-400 mt-1">
            {allAgents.length} agentes • {totalActiveLeads} leads activos
          </p>
        </div>
        <button
          onClick={() => setShowCreateUser(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Agente
        </button>
      </div>

      {/* Sub-navigation tabs */}
      <div className="glass-card p-2">
        <div className="flex flex-wrap gap-1">
          {NAV.map(n => {
            const Icon = n.icon
            return (
              <button
                key={n.key}
                onClick={() => setGlobalView(n.key)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  globalView === n.key
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {n.label}
                {n.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {n.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Unassigned Alert */}
      <UnassignedLeadsBanner
        count={unassignedLeads.length}
        onManual={() => openLeadAssignModal()}
        onRoundRobin={handleAutoAssign}
      />

          {/* VIEW: AGENTS */}
          {globalView === 'agents' && (
            <div className="grid grid-cols-[220px_1fr] gap-3.5">
              {/* Agent List */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-3 pl-1 text-slate-500">
                  Agentes ({allAgents.length})
                </p>
                <div className="flex flex-col gap-2">
                  {allAgents.map((agent) => {
                    const workloadCount = (agent.stats?.totalLeads || 0) + (agent.stats?.pendingFollowUps || 0)
                    const pct = maxWorkload > 0 ? (workloadCount / maxWorkload) * 100 : 0
                    const isSelected = selectedAgent?.id === agent.id
                    const isOverloaded = (agent.stats?.totalLeads || 0) >= 14

                    return (
                      <AgentListItem
                        key={agent.id}
                        agent={{
                          id: agent.id,
                          name: agent.name,
                          initial: agent.name?.charAt(0).toUpperCase() || '?',
                          activeLeads: agent.stats?.totalLeads || 0,
                          loadPercent: pct,
                          top: isOverloaded,
                        }}
                        selected={isSelected}
                        onSelect={handleSelectAgent}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Agent Detail */}
              {selectedAgent && (() => {
                const ag = selectedAgent
                const agLeads = agentLeads
                const tabs = [
                  { key: 'overview', label: 'Resumen' },
                  { key: 'info', label: 'Info' },
                  { key: 'pipeline', label: 'Pipeline' },
                  { key: 'leads', label: `Leads (${agLeads.length})` },
                  { key: 'comisiones', label: 'Comisiones' },
                ]
                const agentNotes = notes[ag.id] || ag.notes || []
                
                return (
                  <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
                    {/* Agent Header */}
                    <div className="flex items-center gap-4 mb-6">
                      <AgentAvatar initial={ag.name?.charAt(0).toUpperCase() || '?'} size="md" />
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-white">{ag.name}</h2>
                        <div className="flex items-center gap-2 mt-1 text-sm">
                          <span className="text-emerald-400 font-medium">${(ag.revenue || 0).toLocaleString()}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">{ag.conversionRate || 0}% conv.</span>
                        </div>
                      </div>
                      <Sparkline data={ag.weeklyTrend || [3,5,4,6,5,7,6]} color={ag.color} />
                      <button
                          onClick={() => { setDeleteConfirmText(''); setShowDeleteModal(true); }}
                          className="px-3 py-2 bg-red-500/15 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium hover:bg-red-500/25 transition-colors flex items-center gap-2 shrink-0"
                          title="Eliminar agente"
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mb-6 border-b border-slate-800">
                      {tabs.map(t => (
                        <button
                          key={t.key}
                          onClick={() => setActiveTab(t.key)}
                          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                            activeTab === t.key
                              ? 'text-blue-400 border-blue-500'
                              : 'text-slate-500 border-transparent hover:text-slate-300'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* TAB: OVERVIEW */}
                    {activeTab === 'overview' && (
                      <div>
                        <div className="grid grid-cols-4 gap-3 mb-5">
                          <KpiCard label="Leads activos" value={ag.stats?.totalLeads || 0} />
                          <KpiCard label="Cerrados" value={ag.stats?.byStatus?.cerrado || ag.stats?.byStatus?.respondio || 0} valueClassName="text-emerald-400" />
                          <KpiCard label="Conversión" value={`${ag.conversionRate || 0}%`} valueClassName={(ag.conversionRate || 0) > 65 ? 'text-emerald-400' : (ag.conversionRate || 0) > 45 ? 'text-amber-400' : 'text-rose-400'} />
                          <KpiCard label="Tiempo cierre" value={`${ag.avgCloseDays || 0}d`} valueClassName="text-blue-400" />
                        </div>

                        <WeeklyTrendChart
                          data={ag.weeklyTrend || [3, 5, 4, 6, 5, 7, 6]}
                          thisWeek={ag.stats?.weekLeads || 0}
                        />
                      </div>
                    )}

                    {/* TAB: INFO */}
                    {activeTab === 'info' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                          <p className="text-xs uppercase tracking-wide mb-3 text-slate-500">Información de contacto</p>
                          <div className="space-y-3 text-slate-300">
                            <div className="flex items-center gap-3">
                              <Globe className="w-4 h-4 text-slate-500" />
                              <span>{ag.email || 'Sin email'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Phone className="w-4 h-4 text-slate-500" />
                              <span>{ag.phone || 'Sin teléfono'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                          <p className="text-xs uppercase tracking-wide mb-3 text-slate-500">Estadísticas</p>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Total leads</span>
                              <span className="font-medium text-slate-200">{ag.stats?.totalLeads || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Leads perdidos</span>
                              <span className="text-red-400 font-medium">{ag.stats?.lost || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Conversión</span>
                              <span className="text-emerald-400 font-medium">{ag.conversionRate || 0}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Días promedio cierre</span>
                              <span className="text-slate-200 font-medium">{ag.avgCloseDays || 0}</span>
                            </div>
                          </div>
                        </div>

                        {/* Notes Section */}
                        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4">
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Notas internas</p>
                          {agentNotes.length === 0 ? (
                            <p className="text-slate-600 text-sm mb-3">Sin notas aún.</p>
                          ) : (
                            <div className="flex flex-col gap-2 mb-3">
                              {agentNotes.map((n, i) => (
                                <div 
                                  key={i} 
                                  className="bg-blue-500/10 border border-blue-500/20 rounded-lg py-2 px-3 text-sm text-blue-300"
                                >
                                  💬 {n}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <input 
                              value={newNote} 
                              onChange={e => setNewNote(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleAddNote(ag.id)}
                              placeholder="Agregar nota..." 
                              className="flex-1 rounded-lg py-2 px-3 text-sm outline-none bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500"
                            />
                            <button 
                              onClick={() => handleAddNote(ag.id)}
                              className="px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-medium hover:bg-blue-500/30"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Vacaciones / disponibilidad */}
                        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4">
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Días libres y disponibilidad</p>
                          {(ag.vacations || []).length === 0 ? (
                            <div className="bg-slate-800/50 border border-dashed border-white/10 rounded-xl p-6 text-center">
                              <p className="text-xl mb-2">📅</p>
                              <p className="text-slate-500 text-sm">Sin días libres registrados</p>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {(ag.vacations || []).map((v, i) => (
                                <div 
                                  key={i} 
                                  className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
                                >
                                  <span className="text-2xl">🏖️</span>
                                  <div>
                                    <p className="font-semibold text-emerald-400">{v.label}</p>
                                    <p className="text-sm text-slate-500">{v.from} → {v.to}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <button onClick={() => setShowVacationModal(true)} className="mt-4 w-full py-3 bg-emerald-500/10 border border-dashed border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors">
                            + Registrar día libre / vacaciones
                          </button>
                        </div>
                      </div>
                    )}


                    {/* TAB: PIPELINE */}
                    {activeTab === 'pipeline' && (
                      <div className="space-y-4">
                        <p className="text-sm mb-4 text-slate-500">Distribución de leads por etapa del embudo</p>
                        <FunnelChart pipeline={ag.pipeline || {}} color={ag.color} colors={colors} />
                        
                        <div className="grid grid-cols-5 gap-2 mt-4">
                          {Object.entries(ag.pipeline || {}).filter(([s]) => stageConfig[s]).map(([s, v]) => {
                            const cfg = stageConfig[s]
                            const total = Object.values(ag.pipeline || {}).reduce((a, b) => a + b, 0)
                            return (
                              <div 
                                key={s} 
                                className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center"
                              >
                                <p className="text-xl font-bold" style={{ color: cfg.color }}>{v}</p>
                                <p className="text-xs text-slate-500">{cfg.label}</p>
                                <p className="text-xs text-slate-600">{total > 0 ? ((v / total) * 100).toFixed(0) : 0}%</p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* TAB: LEADS */}
                    {activeTab === 'leads' && (
                      <div className="flex flex-col gap-2">
                        {agLeads.length === 0 ? (
                          <p className="text-slate-600 text-center py-8">
                            Sin leads asignados
                          </p>
                        ) : (
                          agLeads.map(lead => {
                            const sc = stageConfig[lead.stage] || stageConfig.nuevo
                            const pc = priorityConfig[lead.priority] || priorityConfig.baja
                            return (
                              <div 
                                key={lead.id}
                                className="flex items-center gap-4 p-3 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800/70 transition-colors cursor-pointer"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    {lead.lastActivity >= 10 && <span className="text-sm">🧊</span>}
                                    <span className="font-semibold text-slate-200">{lead.name}</span>
                                    {lead.notes?.length > 0 && <span className="text-xs text-blue-400">💬 {lead.notes.length}</span>}
                                  </div>
                                  <div className="flex gap-2 items-center flex-wrap">
                                    {lead.channel && (
                                      <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400">
                                        {lead.channel === 'facebook' && '📘 '}
                                        {lead.channel === 'instagram' && '📸 '}
                                        {lead.channel === 'whatsapp' && '💬 '}
                                        {lead.channel === 'web' && '🌐 '}
                                        {lead.channel === 'phone' && '📞 '}
                                        {lead.channel === 'email' && '📧 '}
                                        {lead.channel}
                                      </span>
                                    )}
                                    <span 
                                      className="px-2 py-0.5 rounded text-xs"
                                      style={{ 
                                        backgroundColor: `${sc.color}15`, 
                                        border: `1px solid ${sc.color}30`,
                                        color: sc.color 
                                      }}
                                    >
                                      {sc.label}
                                    </span>
                                    <span className="text-xs text-slate-600">Vence: {lead.dueDate}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-emerald-400">
                                    ${lead.value?.toLocaleString()}
                                  </p>
                                  <p className="text-xs text-slate-600">SLA: {lead.slaHours}h</p>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}

                    {/* TAB: COMISIONES */}
                    {activeTab === 'comisiones' && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-slate-500">Comisiones registradas</p>
                          <div className="flex items-center gap-2">
                            <input
                              type="month"
                              value={commissionsMonth}
                              onChange={(e) => {
                                setCommissionsMonth(e.target.value)
                                fetchAgentCommissions(ag.id, e.target.value)
                              }}
                              className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        {/* Success message */}
                        {paySuccess && (
                          <div className="mb-4 p-3 rounded-xl text-sm flex items-center gap-2 bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                            <Check className="w-4 h-4" />
                            {paySuccess}
                          </div>
                        )}

                        {commissionsLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                          </div>
                        ) : agentCommissions.length === 0 ? (
                          <div className="bg-slate-800/50 border border-dashed border-white/10 rounded-xl p-8 text-center">
                            <DollarSign className="w-10 h-10 mx-auto mb-2 text-slate-500" />
                            <p className="text-sm text-slate-500">Sin comisiones este mes</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                  <thead>
                                <tr className="border-b border-slate-800">
                                  <th className="text-left py-2 px-3 font-medium text-slate-500">Lead</th>
                                  <th className="text-right py-2 px-3 font-medium text-slate-500">Monto</th>
                                  <th className="text-right py-2 px-3 font-medium text-slate-500">%</th>
                                  <th className="text-right py-2 px-3 font-medium text-slate-500">Comisión</th>
                                  <th className="text-center py-2 px-3 font-medium text-slate-500">Estado</th>
                                  <th className="text-right py-2 px-3 font-medium text-slate-500">Fecha</th>
                                  {user?.role === 'admin' || user?.role === 'manager' ? <th className="text-center py-2 px-3 font-medium text-slate-500">Acción</th> : null}
                                </tr>
                              </thead>
                              <tbody>
                                {agentCommissions.map(c => (
                                  <tr key={c.id} className="border-b border-slate-800">
                                    <td className="py-2.5 px-3 text-slate-200">{c.leadName || '—'}</td>
                                    <td className="py-2.5 px-3 text-right font-medium text-slate-200">
                                      ${Number(c.propertyPrice || 0).toLocaleString()}
                                    </td>
                                    <td className="py-2.5 px-3 text-right text-slate-500">{c.percentage}%</td>
                                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-400">
                                      ${Number(c.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      {c.status === 'paid' 
                                        ? <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-medium">Pagada</span>
                                        : <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full text-xs font-medium">Pendiente</span>
                                      }
                                    </td>
                                    <td className="py-2.5 px-3 text-right text-xs text-slate-500">
                                      {new Date(c.createdAt).toLocaleDateString('es-AR')}
                                    </td>
                                    {user?.role === 'admin' || user?.role === 'manager' ? (
                                      <td className="py-2.5 px-3 text-center">
                                        {c.status === 'pending' && (
                                          <button
                                            onClick={() => setShowPayModal(c)}
                                            className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-medium transition-colors"
                                          >
                                            Marcar pagada
                                          </button>
                                        )}
                                      </td>
                                    ) : null}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {agentCommissions.length > 0 && (
                          <div className="mt-4 flex justify-between items-center p-3 bg-slate-800/50 rounded-xl">
                            <span className="text-sm text-slate-500">Total comisiones</span>
                            <span className="text-lg font-bold text-emerald-400">
                              ${agentCommissions.reduce((s, c) => s + Number(c.amount), 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {/* VIEW: ANALYTICS */}
          {globalView === 'analytics' && (
            <div className="bg-[#0c1220] rounded-xl p-5">
              <div className="grid grid-cols-4 gap-2.5 mb-3">
                <SummaryCard
                  icon={DollarSign}
                  label="Revenue total"
                  value={`$${totalRevenue.toLocaleString('es-MX')}`}
                  hint="Todos los agentes"
                />
                <SummaryCard
                  icon={Target}
                  label="Conv. promedio"
                  value={`${avgConversion}%`}
                  hint="Tasa de conversión"
                />
                <SummaryCard
                  icon={Zap}
                  label="Leads activos"
                  value={totalActiveLeads}
                  hint="En proceso ahora"
                />
                <SummaryCard
                  icon={Check}
                  label="Leads cerrados"
                  value={totalClosedLeads}
                  hint="Total histórico"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                <div className="bg-slate-900 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-3">Revenue por agente</div>
                  <div className="flex flex-col gap-2.5">
                    {[...allAgents].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).map(a => (
                      <BarRow
                        key={a.id}
                        label={a.name.split(' ')[0]}
                        valueLabel={`$${(a.revenue || 0).toLocaleString('es-MX')}`}
                        percent={totalRevenue > 0 ? ((a.revenue || 0) / totalRevenue) * 100 : 0}
                        color="#2563eb"
                      />
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-3">Conversión por agente</div>
                  <div className="flex flex-col gap-2.5">
                    {[...allAgents].sort((a, b) => (b.conversionRate || 0) - (a.conversionRate || 0)).map(a => (
                      <BarRow
                        key={a.id}
                        label={a.name.split(' ')[0]}
                        valueLabel={`${a.conversionRate || 0}%`}
                        percent={a.conversionRate || 0}
                        color={conversionColor(a.conversionRate || 0)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 rounded-lg p-4 mb-2.5">
                <div className="text-xs text-slate-400 mb-3">
                  Tiempo promedio de cierre (días)
                </div>
                <div className="flex flex-col gap-2">
                  {[...allAgents].sort((a, b) => (a.avgCloseDays || 0) - (b.avgCloseDays || 0)).map(a => (
                    <ClosingTimeRow
                      key={a.id}
                      label={a.name.split(' ')[0]}
                      days={a.avgCloseDays || 0}
                      percent={maxCloseDays > 0 ? ((a.avgCloseDays || 0) / maxCloseDays) * 100 : 0}
                      color={closingColor(a.avgCloseDays || 0)}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 rounded-lg p-4">
                <div className="text-xs text-slate-400 mb-3">Ranking de agentes</div>
                <div className="flex flex-col">
                  {[...allAgents].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).map((a, i) => (
                    <RankingRow
                      key={a.id}
                      position={i + 1}
                      agent={{
                        id: a.id,
                        name: a.name,
                        initial: a.name?.charAt(0).toUpperCase() || '?',
                        revenue: a.revenue || 0,
                        conversion: a.conversionRate || 0,
                        closingDays: a.avgCloseDays || 0,
                      }}
                      isTop={i === 0}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: ALERTS */}
          {globalView === 'alerts' && (
            <div className="flex flex-col gap-5">
              {/* Header with refresh button */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: colors.foreground }}>Centro de Alertas</h2>
                  <p className="text-sm" style={{ color: colors.muted }}>Monitorea el estado de tu equipo y leads</p>
                </div>
                <button 
                  onClick={() => loadData()}
                  className="px-4 py-2 bg-[colors.primary]/20 border border-[colors.primary]/30 rounded-lg text-[colors.primary] text-sm font-medium hover:bg-[colors.primary]/30 transition-colors flex items-center gap-2"
                >
                  🔄 Actualizar
                </button>
              </div>

              {/* Unassigned Leads Alert */}
              <div className="bg-gradient-to-r from-amber-500/10 to-red-500/10 border border-amber-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center text-2xl">
                    ⚠️
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-amber-400">Leads Sin Asignar</h3>
                    <p className="text-amber-400/70 text-sm">Requieren atención inmediata</p>
                  </div>
                  <div className="text-4xl font-bold text-amber-400">{unassignedLeads.length}</div>
                </div>
                {unassignedLeads.length > 0 && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openLeadAssignModal()}
                      className="px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-colors"
                    >
                      Asignar Ahora
                    </button>
                    <button 
                      onClick={handleAutoAssign}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg style={{ color: #ffffff }} text-sm font-bold flex items-center gap-2"
                    >
                      Auto-Asignar
                    </button>
                  </div>
                )}
              </div>

              {/* Agents on Vacation */}
              <div className="bg-[colors.card] border border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-bold style={{ color: #ffffff }} mb-4">🏖️ Agentes en Vacaciones</h3>
                <div className="flex flex-col gap-3">
                  {allAgents.filter(a => (a.vacations || []).length > 0).length === 0 ? (
                    <p className="text-slate-500">No hay agentes en vacaciones</p>
                  ) : (
                    allAgents.filter(a => (a.vacations || []).length > 0).map(ag => (
                      <div key={ag.id} className="flex items-center gap-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: `${ag.color}22`, color: ag.color }}
                        >
                          {ag.name?.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium style={{ color: #ffffff }}">{ag.name}</p>
                          <p className="text-sm text-slate-500">
                            {(ag.vacations || []).map(v => `${v.from} → ${v.to}`).join(', ')}
                          </p>
                        </div>
                        <span className="text-emerald-400">🏖️</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Agent Workload Alerts */}
              <div className="bg-[colors.card] border border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-bold style={{ color: #ffffff }} mb-4">🔥 Carga de Trabajo Alta</h3>
                <div className="flex flex-col gap-3">
                  {allAgents.filter(a => (a.stats?.totalLeads || 0) >= 10).length === 0 ? (
                    <p className="text-slate-500">Todos los agentes tienen carga normal</p>
                  ) : (
                    allAgents.filter(a => (a.stats?.totalLeads || 0) >= 10).map(ag => (
                      <div key={ag.id} className="flex items-center gap-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: `${ag.color}22`, color: ag.color }}
                        >
                          {ag.name?.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium style={{ color: #ffffff }}">{ag.name}</p>
                          <p className="text-sm text-slate-500">
                            {(ag.stats?.totalLeads || 0)} leads activos
                          </p>
                        </div>
                        <span className="text-red-400 font-bold">{ag.stats?.totalLeads || 0}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Low Performance Agents */}
              <div className="bg-[colors.card] border border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-bold style={{ color: #ffffff }} mb-4">📉 Rendimiento Bajo</h3>
                <div className="flex flex-col gap-3">
                  {allAgents.filter(a => (a.conversionRate || 0) < 40).length === 0 ? (
                    <p className="text-slate-500">Todos los agentes tienen buen rendimiento</p>
                  ) : (
                    allAgents.filter(a => (a.conversionRate || 0) < 40).map(ag => (
                      <div key={ag.id} className="flex items-center gap-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: `${ag.color}22`, color: ag.color }}
                        >
                          {ag.name?.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium style={{ color: #ffffff }}">{ag.name}</p>
                          <p className="text-sm text-slate-500">
                            {ag.conversionRate || 0}% conversión
                          </p>
                        </div>
                        <span className="text-orange-400 font-bold">{ag.conversionRate || 0}%</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: COMMISSIONS */}
          {globalView === 'commissions' && (
            <CommissionsView user={user} agents={realAgents} />
          )}

{/* New Agent Modal - with phone */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreateUser(false)}>
          <div className="rounded-2xl w-full max-w-md border shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#0f1520', borderColor: colors.primary }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: colors.border }}>
              <h2 className="text-lg font-semibold" style={{ color: colors.foreground }}>Nuevo Agente</h2>
              <button onClick={() => setShowCreateUser(false)} style={{ color: colors.muted }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.muted }}>Nombre completo</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl outline-none"
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${colors.border}`,
                    color: colors.foreground,
                  }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.muted }}>Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl outline-none"
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${colors.border}`,
                    color: colors.foreground,
                  }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.muted }}>Teléfono</label>
                <PhoneInput
                  value={newUser.phone}
                  onChange={value => setNewUser({ ...newUser, phone: value })}
                  placeholder="+54 11 1234-5678"
                />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.muted }}>Contraseña</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl outline-none"
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${colors.border}`,
                    color: colors.foreground,
                  }}
                  required
                  minLength={6}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="flex-1 px-4 py-3 rounded-xl transition-colors"
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: colors.muted
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-[2] px-4 py-3 bg-gradient-to-r from-[colors.primary] to-teal-600 style={{ color: #ffffff }} rounded-xl hover:from-[colors.primary] hover:to-teal-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                  {creating ? 'Creando...' : 'Crear Agente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Assignment Modal */}
      {showLeadAssignModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowLeadAssignModal(false)}>
          <div className="rounded-2xl w-full max-w-2xl border shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#0f1520', borderColor: colors.primary }}>
            <div className="flex items-center justify-between p-5 border-b shrink-0" style={{ borderColor: colors.border }}>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: colors.foreground }}>Asignar Leads a Agente</h2>
                <p className="text-sm" style={{ color: colors.muted }}>{selectedLeadsToAssign.length} lead(s) seleccionado(s)</p>
              </div>
              <button onClick={() => setShowLeadAssignModal(false)} style={{ color: colors.muted }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Leads List */}
            <div className="p-5 overflow-auto flex-1">
              <p className="text-sm mb-3" style={{ color: colors.muted }}>Seleccioná los leads:</p>
              <div className="flex flex-col gap-2 max-h-48 overflow-auto mb-4">
                {allAvailableLeads.length === 0 ? (
                  <p className="text-center py-4" style={{ color: colors.muted }}>No hay leads disponibles</p>
                ) : (
                  allAvailableLeads.map(lead => (
                    <button
                      key={lead.id}
                      onClick={() => toggleLeadSelection(lead.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        selectedLeadsToAssign.includes(lead.id) 
                          ? 'border-[colors.primary]/50' 
                          : 'hover:border-slate-600'
                      }`}
                      style={{
                        backgroundColor: selectedLeadsToAssign.includes(lead.id) ? 'rgba(0,200,220,0.1)' : ('rgba(255,255,255,0.05)'),
                        borderColor: selectedLeadsToAssign.includes(lead.id) ? 'colors.primary' : colors.border,
                      }}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedLeadsToAssign.includes(lead.id)
                          ? 'bg-[colors.primary] border-[colors.primary]'
                          : 'border-slate-600'
                      }`}>
                        {selectedLeadsToAssign.includes(lead.id) && <Check className="w-3 h-3 style={{ color: #ffffff }}" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium" style={{ color: colors.foreground }}>{lead.name}</p>
                        <p className="text-xs" style={{ color: colors.muted }}>
                          {lead.channel && (
                            <span className="inline-flex items-center gap-1 mr-2">
                              {lead.channel === 'facebook' && '📘'}
                              {lead.channel === 'instagram' && '📸'}
                              {lead.channel === 'whatsapp' && '💬'}
                              {lead.channel === 'instagram' && '📸'}
                              {lead.channel === 'web' && '🌐'}
                              {lead.channel === 'phone' && '📞'}
                              {lead.channel === 'email' && '📧'}
                              {lead.channel}
                            </span>
                          )}
                          {lead.propertyTitle || lead.propertyInterest || 'Sin propiedad'} • {lead.status}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Agent Selection */}
              <p className="text-sm mb-3" style={{ color: colors.muted }}>Asignar a:</p>
              <div className="grid grid-cols-2 gap-2">
                {allAgents.map(a => {
                  const workloadLevel = a.workloadLevel || (a.stats?.totalLeads <= 5 ? 'baja' : a.stats?.totalLeads <= 10 ? 'media' : 'alta')
                  const levelColors = {
                    baja: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
                    media: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
                    alta: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' }
                  }
                  const levelLabels = { baja: '🟢 Baja', media: '🟡 Media', alta: '🔴 Alta' }
                  const lc = levelColors[workloadLevel] || levelColors.baja
                  
                  return (
                    <button
                      key={a.id}
                      onClick={() => assignLeadsToAgent(a.id)}
                      disabled={selectedLeadsToAssign.length === 0}
                      className="flex items-center gap-3 p-3 rounded-xl border transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        borderColor: colors.border,
                      }}
                    >
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ 
                          backgroundColor: `${a.color}22`, 
                          border: `1px solid ${a.color}44`, 
                          color: a.color 
                        }}
                      >
                        {a.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" style={{ color: colors.foreground }}>{a.name}</p>
                        <p className="text-xs" style={{ color: colors.muted }}>{a.stats?.totalLeads || 0} leads</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs ${lc.bg} ${lc.text} border ${lc.border} shrink-0`}>
                        {levelLabels[workloadLevel]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vacation Modal */}
      {showVacationModal && selectedAgent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowVacationModal(false)}>
          <div className="rounded-2xl w-full max-w-md border shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#0f1520', borderColor: colors.primary }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: colors.border }}>
              <h2 className="text-lg font-semibold" style={{ color: colors.foreground }}>Registrar Día Libre / Vacación</h2>
              <button onClick={() => setShowVacationModal(false)} style={{ color: colors.muted }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.muted }}>Título (ej: Vacaciones, Día personal)</label>
                <input
                  type="text"
                  value={vacationForm.label}
                  onChange={e => setVacationForm({ ...vacationForm, label: e.target.value })}
                  placeholder="Ej: Vacaciones de verano"
                  className="w-full px-4 py-3 rounded-xl outline-none"
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${colors.border}`,
                    color: colors.foreground,
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: colors.muted }}>Desde</label>
                  <input
                    type="date"
                    value={vacationForm.from}
                    onChange={e => setVacationForm({ ...vacationForm, from: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl outline-none"
                    style={{ 
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${colors.border}`,
                      color: colors.foreground,
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: colors.muted }}>Hasta</label>
                  <input
                    type="date"
                    value={vacationForm.to}
                    onChange={e => setVacationForm({ ...vacationForm, to: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl outline-none"
                    style={{ 
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${colors.border}`,
                      color: colors.foreground,
                    }}
                  />
                </div>
              </div>
              <button
                onClick={() => handleAddVacation(selectedAgent.id)}
                className="w-full py-3 bg-gradient-to-r from-[colors.primary] to-teal-600 style={{ color: #ffffff }} rounded-xl font-medium hover:from-[colors.primary] hover:to-teal-500 transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAgent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="rounded-2xl w-full max-w-md border shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#0f1520', borderColor: '#ef4444' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: colors.border }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: colors.foreground }}>Eliminar Agente</h2>
                  <p className="text-xs" style={{ color: colors.muted }}>Esta acción no se puede deshacer</p>
                </div>
              </div>
              <button onClick={() => setShowDeleteModal(false)} style={{ color: colors.muted }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="border rounded-xl p-4" style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' }}>
                <p className="font-medium mb-2" style={{ color: colors.foreground }}>¿Estás seguro de eliminar a <span className="text-red-400">{selectedAgent.name}</span>?</p>
                <p className="text-sm" style={{ color: colors.muted }}>Se eliminarán todos sus leads asignados y datos asociados. Los leads quedan sin asignar pero no se borran.</p>
              </div>
              
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.muted }}>
                  Escribe <span className="text-red-400 font-bold">ELIMINAR</span> para confirmar
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder="ELIMINAR"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl style={{ color: #ffffff }} outline-none focus:border-red-500 uppercase"
                />
              </div>
              
              <button
                onClick={async () => {
                  if (deleteConfirmText !== 'ELIMINAR') {
                    toast.error('Escribe "ELIMINAR" para confirmar')
                    return
                  }
                  setDeleting(true)
                  try {
                    const res = await api.delete(`/auth/admin/users/${selectedAgent.id}`)
                    if (res.ok) {
                      toast.success('Agente eliminado correctamente')
                      setShowDeleteModal(false)
                      // Refresh the agent list
                      const workloadRes = await api.get('/assignment/workload')
                      const workloadData = await workloadRes.json()
                      const statsRes = await api.get('/stats/agents').catch(() => ({ ok: true, json: async () => ({ agents: [] }) }))
                      const statsData = await statsRes.json()
                      const realStats = {}
                      for (const s of (statsData.agents || [])) realStats[s.id] = s
                      const realWithColor = (workloadData.workload || []).map((agent, idx) => ({
                        ...agent,
                        color: getRandomColor(idx),
                        weeklyTrend: realStats[agent.id]?.weeklyTrend || Array.from({ length: 7 }, () => 0),
                        revenue: realStats[agent.id]?.revenue || 0,
                        stats: { 
                          totalLeads: agent.leadCount || 0,
                          closed: Math.floor((agent.leadCount || 0) * 0.6),
                          pending: Math.floor((agent.leadCount || 0) * 0.3),
                          lost: Math.floor((agent.leadCount || 0) * 0.1),
                          weekLeads: Math.floor((agent.leadCount || 0) * 0.2),
                          monthLeads: Math.floor((agent.leadCount || 0) * 0.5),
                          byStatus: {}
                        },
                        conversionRate: realStats[agent.id]?.conversionRate || 0,
                        avgCloseDays: realStats[agent.id]?.avgCloseDays || 0,
                        phone: realStats[agent.id]?.phone || '',
                        email: agent.email || '',
                        vacations: [],
                        pipeline: realStats[agent.id]?.pipeline || {},
                        notes: []
                      }))
                      setRealAgents(realWithColor)
                      setSelectedAgent(null)
                    } else {
                      const err = await res.json()
                      toast.error(err.error || 'Error al eliminar agente')
                    }
                  } catch (err) {
                    toast.error('Error de conexión')
                  } finally {
                    setDeleting(false)
                  }
                }}
                disabled={deleteConfirmText !== 'ELIMINAR' || deleting}
                className={`w-full py-3 rounded-xl font-medium transition-colors ${
                  deleteConfirmText === 'ELIMINAR' && !deleting
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-red-500/20 text-red-400/50 cursor-not-allowed'
                }`}
              >
                {deleting ? 'Eliminando...' : 'Eliminar Agente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Commission Confirmation Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPayModal(null)}>
          <div className="rounded-2xl w-full max-w-md border shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#0f1520', borderColor: '#10b981' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: colors.border }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: colors.foreground }}>Marcar como pagada</h2>
                  <p className="text-xs" style={{ color: colors.muted }}>Confirmar pago de comisión</p>
                </div>
              </div>
              <button onClick={() => setShowPayModal(null)} style={{ color: colors.muted }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm" style={{ color: colors.foreground }}>
                ¿Confirmás que la comisión de <span className="text-emerald-400 font-semibold">${Number(showPayModal.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span> fue pagada a <span className="font-semibold">{selectedAgent?.name}</span>?
              </p>
              <p className="text-xs" style={{ color: colors.muted }}>
                Lead: {showPayModal.leadName || '—'} · {new Date(showPayModal.createdAt).toLocaleDateString('es-AR')}
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowPayModal(null)}
                  disabled={payingCommission}
                  className="flex-1 py-3 rounded-xl font-medium transition-colors"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: colors.foreground, border: `1px solid ${colors.border}` }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handlePayCommission(showPayModal.id)}
                  disabled={payingCommission}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl font-medium text-white transition-colors"
                >
                  {payingCommission ? 'Procesando...' : 'Confirmar pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AgentsPage