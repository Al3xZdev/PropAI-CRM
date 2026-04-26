import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Users, Search, Filter, Plus, Mail, Phone, MessageCircle,
  Instagram, Globe, ChevronRight, Clock, CheckCircle2,
  AlertCircle, MoreVertical, Trash2, Eye, X, ArrowRight,
  Loader2, Send, Rocket, Check, Facebook, Bell, Sparkles,
  Upload, FileText, CheckCircle as CheckCircleIcon, AlertTriangle, Download,
  ArrowUpDown, LayoutGrid, List, Pause, Play, Zap, MessageSquare,
  Calendar, CheckCheck
} from 'lucide-react'
import { useNotifications, NOTIFICATION_TYPES } from '../hooks/useNotifications'
import ChatModal from '../components/ChatModal'
import GenerateContractModal from '../components/GenerateContractModal'
import LeadContractsHistory from '../components/contracts/LeadContractsHistory'

const API_URL = import.meta.env.VITE_API_URL || '/api';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
  'Content-Type': 'application/json'
})

const LeadsPage = ({ onSelectLead, properties = [] }) => {
  const { addNotification } = useNotifications()
  const [leads, setLeads] = useState([])
  const [filteredLeads, setFilteredLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    channel: '',
    propertyInterest: ''
  })
  const [selectedLead, setSelectedLead] = useState(null)
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [creatingLead, setCreatingLead] = useState(false)
  
  // Automation state - sequences and which leads are in them
  const [sequences, setSequences] = useState([])
  const [leadsInSequences, setLeadsInSequences] = useState({})
  
  // Selection state
  const [selectionMode, setSelectionMode] = useState(false) // Only active when user clicks "Eliminar"
  const [selectedLeads, setSelectedLeads] = useState(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingLeads, setDeletingLeads] = useState(false)
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false)
  const [deletedCount, setDeletedCount] = useState(0)

  // Sort and View state
  const [sortBy, setSortBy] = useState('newest') // newest, oldest, az, za
  const [viewMode, setViewMode] = useState('list') // list, kanban

  useEffect(() => {
    loadLeads()
    loadSequencesData()
  }, [])

  useEffect(() => {
    filterLeads()
  }, [leads, searchTerm, filters, sortBy])

  // Clear selection when filters change or exiting selection mode
  useEffect(() => {
    if (!selectionMode) {
      setSelectedLeads(new Set())
    }
  }, [filters, searchTerm, selectionMode])

  const loadLeads = async () => {
    try {
      const response = await fetch(`${API_URL}/leads`, { headers: getAuthHeaders() })
      if (response.ok) {
        const data = await response.json()
        setLeads(data.leads || [])
      }
    } catch (err) {
      console.error('Error loading leads:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load sequences and leads in sequences
  const loadSequencesData = async () => {
    try {
      // Get all sequences
      const seqRes = await fetch(`${API_URL}/automation/sequences`, { headers: getAuthHeaders() })
      if (seqRes.ok) {
        const seqData = await seqRes.json()
        setSequences(seqData.sequences || [])
      }
      
      // Get leads in each sequence with their step progress
      const leadsInSeqData = {}
      for (const seq of sequences) {
        try {
          const res = await fetch(`${API_URL}/automation/sequences/${seq.id}/leads`, { headers: getAuthHeaders() })
          if (res.ok) {
            const data = await res.json()
            // Store full lead objects with currentStep info
            leadsInSeqData[seq.id] = data.leads || []
          }
        } catch (e) {
          console.error('Error fetching leads for sequence:', e)
        }
      }
      setLeadsInSequences(leadsInSeqData)
    } catch (err) {
      console.error('Error loading sequences data:', err)
    }
  }

  // Get sequence name for a specific lead
  const getLeadSequenceName = (leadId) => {
    for (const [seqId, leadObjs] of Object.entries(leadsInSequences)) {
      if (leadObjs.some(l => l.id === leadId)) {
        const seq = sequences.find(s => s.id === seqId)
        return seq?.name || 'Secuencia'
      }
    }
    return null
  }

  // Get full lead data (with currentStep) from any sequence
  const getLeadInSequence = (leadId) => {
    for (const [seqId, leadObjs] of Object.entries(leadsInSequences)) {
      const found = leadObjs.find(l => l.id === leadId)
      if (found) {
        const seq = sequences.find(s => s.id === seqId)
        return { ...found, sequenceName: seq?.name, sequenceId: seqId, sequenceChannel: found.sequenceChannel }
      }
    }
    return null
  }

  // Get sequence ID for a specific lead
  const getLeadSequenceId = (leadId) => {
    for (const [seqId, leadObjs] of Object.entries(leadsInSequences)) {
      if (leadObjs.some(l => l.id === leadId)) {
        return seqId
      }
    }
    return null
  }

  // Remove lead from sequence
  const removeLeadFromSequence = async (leadId) => {
    const sequenceId = getLeadSequenceId(leadId)
    if (!sequenceId) return false
    
    try {
      const response = await fetch(`${API_URL}/automation/sequences/${sequenceId}/leads/${leadId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        // Also stop automation for this lead
        await fetch(`${API_URL}/leads/${leadId}/automation/stop`, {
          method: 'POST',
          headers: getAuthHeaders()
        })
        
        // Reload data
        await loadLeads()
        await loadSequencesData()
        return true
      }
    } catch (err) {
      console.error('Error removing lead from sequence:', err)
    }
    return false
  }

  const filterLeads = () => {
    let filtered = [...leads]
    
    if (searchTerm) {
      filtered = filtered.filter(lead => 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone?.includes(searchTerm)
      )
    }
    
    if (filters.status) {
      filtered = filtered.filter(l => l.status === filters.status)
    }
    
    if (filters.channel) {
      filtered = filtered.filter(l => l.channel === filters.channel)
    }
    
    if (filters.propertyInterest) {
      filtered = filtered.filter(l => l.propertyInterest === filters.propertyInterest)
    }
    
    // Sort leads
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt)
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt)
        case 'az':
          return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
        case 'za':
          return b.name.localeCompare(a.name, 'es', { sensitivity: 'base' })
        default:
          return 0
      }
    })
    
    setFilteredLeads(filtered)
  }

  // Selection functions
  const toggleSelectLead = (leadId) => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev)
      if (newSet.has(leadId)) {
        newSet.delete(leadId)
      } else {
        newSet.add(leadId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)))
    }
  }

  const deleteSelectedLeads = async () => {
    setDeletingLeads(true)
    let deleted = 0
    
    try {
      for (const leadId of selectedLeads) {
        const response = await fetch(`${API_URL}/leads/${leadId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        })
        if (response.ok) {
          deleted++
        }
      }
      
      setDeletedCount(deleted)
      setShowDeleteConfirm(false)
      setShowDeleteSuccess(true)
      setSelectedLeads(new Set())
      await loadLeads()
      
      // Auto close success popup after 2.5 seconds
      setTimeout(() => {
        setShowDeleteSuccess(false)
      }, 2500)
      
    } catch (err) {
      console.error('Error deleting leads:', err)
    } finally {
      setDeletingLeads(false)
    }
  }

  const getChannelIcon = (channel) => {
    const icons = {
      whatsapp: <Phone className="w-4 h-4" />,
      email: <Mail className="w-4 h-4" />,
      formulario: <Globe className="w-4 h-4" />,
      instagram: <Instagram className="w-4 h-4" />
    }
    return icons[channel] || <Mail className="w-4 h-4" />
  }

  const getChannelColor = (channel) => {
    const colors = {
      whatsapp: 'bg-emerald-500/20 text-emerald-400',
      email: 'bg-blue-500/20 text-blue-400',
      formulario: 'bg-violet-500/20 text-violet-400',
      instagram: 'bg-pink-500/20 text-pink-400'
    }
    return colors[channel] || 'bg-slate-500/20 text-slate-400'
  }

  const getStatusBadge = (status) => {
    const badges = {
      nuevo: { icon: AlertCircle, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Nuevo' },
      contactado: { icon: Clock, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Contactado' },
      respondio: { icon: CheckCircle2, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Respondió' },
      visita_agendada: { icon: Calendar, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Visita Agendada' },
      cerrado: { icon: CheckCheck, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Cerrado' },
      perdido: { icon: X, color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Perdido' }
    }
    return badges[status] || badges.nuevo
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    
    if (diff === 0) return 'Hoy'
    if (diff === 1) return 'Ayer'
    if (diff < 7) return `Hace ${diff} días`
    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
  }

  const formatDateTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getLastStatusChange = (lead) => {
    if (lead.statusHistory && lead.statusHistory.length > 0) {
      const last = lead.statusHistory[lead.statusHistory.length - 1]
      return {
        from: last.previousStatus,
        to: last.newStatus,
        changedAt: last.createdAt
      }
    }
    return null
  }

  const getStatusChangeLabel = (from, to) => {
    const labels = {
      nuevo: 'Nuevo',
      contactado: 'Contactado',
      respondio: 'Respondió',
      visita_agendada: 'Visita Agendada',
      cerrado: 'Cerrado',
      perdido: 'Perdido'
    }
    const fromLabel = from ? (labels[from] || from) : 'Nuevo'
    const toLabel = to ? (labels[to] || to) : to
    return `${fromLabel} → ${toLabel}`
  }

  const openLeadDetail = (lead) => {
    setSelectedLead(lead)
    setShowLeadModal(true)
    if (onSelectLead) onSelectLead(lead)
  }

  const createLead = async (formData) => {
    setCreatingLead(true)
    try {
      const response = await fetch(`${API_URL}/leads`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        const data = await response.json()
        await loadLeads()
        setShowCreateModal(false)
        // Add notification for new lead
        addNotification(NOTIFICATION_TYPES.NEW_LEAD, {
          name: formData.name,
          source: formData.source || 'Manual'
        })
      }
    } catch (err) {
      console.error('Error creating lead:', err)
    } finally {
      setCreatingLead(false)
    }
  }

  return (
    <div className="space-y-6">
      <GlobalStyles />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Leads</h1>
          <p className="text-slate-400 mt-1">
            {selectionMode && selectedLeads.size > 0
              ? `${selectedLeads.size} de ${filteredLeads.length} seleccionados`
              : `${filteredLeads.length} leads encontrados`
            }
          </p>
        </div>
        <div className="flex gap-3">
          {selectionMode ? (
            <>
              {/* Cancel selection mode */}
              <button 
                onClick={() => {
                  setSelectionMode(false)
                  setSelectedLeads(new Set())
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-xl text-white font-medium transition-colors"
              >
                <X className="w-5 h-5" />
                Cancelar
              </button>
              {/* Delete selected */}
              {selectedLeads.size > 0 && (
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-white font-medium transition-colors animate-fade-in"
                >
                  <Trash2 className="w-5 h-5" />
                  Eliminar ({selectedLeads.size})
                </button>
              )}
            </>
          ) : (
            <button 
              onClick={() => setSelectionMode(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-xl text-white font-medium transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              Eliminar
            </button>
          )}
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-medium transition-colors"
          >
            <Upload className="w-5 h-5" />
            Importar
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nuevo Lead
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          
          {/* Filters */}
          <div className="flex gap-3">
            <select
              value={filters.status}
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
              className="px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:border-blue-500 outline-none"
            >
              <option value="">Estado</option>
              <option value="nuevo">Nuevo</option>
              <option value="contactado">Contactado</option>
              <option value="respondio">Respondió</option>
              <option value="perdido">Perdido</option>
            </select>

            <select
              value={filters.channel}
              onChange={(e) => setFilters(f => ({ ...f, channel: e.target.value }))}
              className="px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:border-blue-500 outline-none"
            >
              <option value="">Canal</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="formulario">Formulario</option>
              <option value="instagram">Instagram</option>
            </select>

            <select
              value={filters.propertyInterest}
              onChange={(e) => setFilters(f => ({ ...f, propertyInterest: e.target.value }))}
              className="px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:border-blue-500 outline-none"
            >
              <option value="">Propiedad</option>
              <option value="casa">Casa</option>
              <option value="departamento">Departamento</option>
              <option value="terreno">Terreno</option>
              <option value="local">Local</option>
              <option value="oficina">Oficina</option>
            </select>

            {(filters.status || filters.channel || filters.propertyInterest) && (
              <button
                onClick={() => setFilters({ status: '', channel: '', propertyInterest: '' })}
                className="px-3 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:border-blue-500 outline-none"
            >
              <option value="newest">Más nuevo</option>
              <option value="oldest">Más viejo</option>
              <option value="az">Nombre A-Z</option>
              <option value="za">Nombre Z-A</option>
            </select>

            {/* View Toggle */}
            <div className="flex bg-slate-700/50 border border-slate-600 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-3 transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Vista lista"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-3 transition-colors ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Vista Kanban"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Leads List / Kanban */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Cargando leads...</div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400">No hay leads que coincidan con los filtros</p>
        </div>
      ) : viewMode === 'kanban' ? null : ( // Kanban is rendered below, so don't render list here
        <div className="space-y-3">
          {/* Select All Header - only in selection mode */}
          {selectionMode && (
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/30 rounded-xl border border-slate-700/50 animate-fade-in">
              <button
                onClick={toggleSelectAll}
                className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                  ${selectedLeads.size === filteredLeads.length && filteredLeads.length > 0
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-slate-600 hover:border-slate-500'
                  }
                `}
              >
                {selectedLeads.size === filteredLeads.length && filteredLeads.length > 0 && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </button>
              <span className="text-slate-400 text-sm">
                {selectedLeads.size === filteredLeads.length 
                  ? 'Deseleccionar todos' 
                  : 'Seleccionar todos'
                }
              </span>
            </div>
          )}

          {filteredLeads.map(lead => {
            const statusBadge = getStatusBadge(lead.status)
            const StatusIcon = statusBadge.icon
            const lastChange = getLastStatusChange(lead)
            const isSelected = selectedLeads.has(lead.id)
            
            return (
              <div
                key={lead.id}
                onClick={() => {
                  if (selectionMode) {
                    toggleSelectLead(lead.id)
                  } else {
                    openLeadDetail(lead)
                  }
                }}
                className={`
                  bg-slate-800/50 rounded-2xl p-5 border transition-all cursor-pointer group
                  ${isSelected 
                    ? 'border-blue-500/50 bg-blue-500/5' 
                    : 'border-slate-700 hover:border-slate-600'
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  {/* Checkbox - only in selection mode */}
                  {selectionMode ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSelectLead(lead.id)
                      }}
                      className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0
                        ${isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-slate-600 hover:border-blue-500'
                        }
                      `}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </button>
                  ) : (
                    <div className="w-5 h-5 flex-shrink-0" />
                  )}

                  {/* Avatar */}
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                    {lead.name.charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="font-semibold text-white truncate">{lead.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${statusBadge.color}`}>
                        <StatusIcon className="w-3 h-3 inline mr-1" />
                        {statusBadge.label}
                      </span>
                      {lastChange && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-slate-700 text-slate-400">
                          {getStatusChangeLabel(lastChange.from, lastChange.to)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400 flex-wrap">
                      <span className={`flex items-center gap-1 ${getChannelColor(lead.channel)} px-2 py-0.5 rounded`}>
                        {getChannelIcon(lead.channel)}
                        {lead.channel}
                      </span>
                      {lead.email && <span className="truncate">{lead.email}</span>}
                      {lead.phone && <span>{lead.phone}</span>}
                    </div>
                  </div>

                  {/* Property Interest */}
                  <div className="hidden md:block text-right">
                    <p className="text-sm text-slate-400">Interesado en</p>
                    {lead.propertyInterest ? (
                      <>
                        <p className="text-white font-medium capitalize">{lead.propertyInterest}</p>
                        {lead.propertyTitle && (
                          <p className="text-xs text-slate-500 truncate max-w-[150px]">{lead.propertyTitle}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-slate-500 text-sm">No especificado</p>
                    )}
                  </div>

                    {/* Date & Status Change */}
                  <div className="text-right hidden sm:block">
                    <p className="text-sm text-slate-400">{formatDate(lead.createdAt)}</p>
                    {lastChange && (
                      <p className="text-xs text-emerald-400 mt-1">
                        Modificado: {formatDateTime(lastChange.changedAt)}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {lead.followUps?.length || 0} seguimientos
                    </p>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {lead.phone && (
                      <>
                        <a
                          href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                          title="Enviar WhatsApp"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </a>
                        <a
                          href={`tel:${lead.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                          title="Llamar"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      </>
                    )}
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                        title="Enviar Email"
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors flex-shrink-0" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Nuevo */}
          <KanbanColumn
            title="Nuevos"
            color="blue"
            leads={filteredLeads}
            statusFilter="nuevo"
            onLeadClick={openLeadDetail}
            selectionMode={selectionMode}
            selectedLeads={selectedLeads}
            toggleSelectLead={toggleSelectLead}
          />
          
          {/* Contactado */}
          <KanbanColumn
            title="Contactados"
            color="amber"
            leads={filteredLeads}
            statusFilter="contactado"
            onLeadClick={openLeadDetail}
            selectionMode={selectionMode}
            selectedLeads={selectedLeads}
            toggleSelectLead={toggleSelectLead}
          />
          
          {/* Respondio */}
          <KanbanColumn
            title="Respondieron"
            color="emerald"
            leads={filteredLeads}
            statusFilter="respondio"
            onLeadClick={openLeadDetail}
            selectionMode={selectionMode}
            selectedLeads={selectedLeads}
            toggleSelectLead={toggleSelectLead}
          />
          
          {/* Visita Agendada */}
          <KanbanColumn
            title="Visitas Agendadas"
            color="purple"
            leads={filteredLeads}
            statusFilter="visita_agendada"
            onLeadClick={openLeadDetail}
            selectionMode={selectionMode}
            selectedLeads={selectedLeads}
            toggleSelectLead={toggleSelectLead}
          />
          
          {/* Cerrado */}
          <KanbanColumn
            title="Cerrados"
            color="emerald"
            leads={filteredLeads}
            statusFilter="cerrado"
            onLeadClick={openLeadDetail}
            selectionMode={selectionMode}
            selectedLeads={selectedLeads}
            toggleSelectLead={toggleSelectLead}
          />
          
          {/* Perdido */}
          <KanbanColumn
            title="Perdidos"
            color="red"
            leads={filteredLeads}
            statusFilter="perdido"
            onLeadClick={openLeadDetail}
            selectionMode={selectionMode}
            selectedLeads={selectedLeads}
            toggleSelectLead={toggleSelectLead}
          />
        </div>
      )}

      {/* Lead Detail Modal */}
      {showLeadModal && selectedLead && (
        <LeadDetailModal 
          lead={selectedLead} 
          onClose={() => setShowLeadModal(false)}
          onUpdate={() => {
            loadLeads()
            loadSequencesData()
          }}
          sequences={sequences}
          leadsInSequences={leadsInSequences}
          onRemoveFromSequence={removeLeadFromSequence}
          getLeadSequenceName={getLeadSequenceName}
          getLeadInSequence={getLeadInSequence}
        />
      )}

      {/* Create Lead Modal */}
      {showCreateModal && (
        <CreateLeadModal 
          onClose={() => setShowCreateModal(false)}
          onCreate={createLead}
          isCreating={creatingLead}
          properties={properties}
        />
      )}

      {/* Import Leads Modal */}
      {showImportModal && (
        <ImportLeadsModal 
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={loadLeads}
          properties={properties}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 shadow-2xl animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">¿Eliminar leads?</h3>
              <p className="text-slate-400">
                Se eliminarán <span className="text-white font-semibold">{selectedLeads.size}</span> lead{selectedLeads.size > 1 ? 's' : ''} permanentemente.
              </p>
              <p className="text-red-400 text-sm mt-2">Esta acción no se puede deshacer.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingLeads}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-xl text-white font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={deleteSelectedLeads}
                disabled={deletingLeads}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:bg-red-500/50 rounded-xl text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                {deletingLeads ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Success Popup */}
      {showDeleteSuccess && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-sm text-center border border-emerald-500/30 shadow-2xl animate-bounce-in">
            <div className="w-20 h-20 mx-auto mb-4 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">¡Eliminados!</h3>
            <p className="text-emerald-400">
              {deletedCount} lead{deletedCount > 1 ? 's' : ''} eliminado{deletedCount > 1 ? 's' : ''} correctamente
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Create Lead Modal Component
const CreateLeadModal = ({ onClose, onCreate, isCreating, properties }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    channel: 'whatsapp',
    propertyInterest: '',
    propertyId: '',
    propertyTitle: '',
    source: '',
    notes: ''
  })
  const [showSuccess, setShowSuccess] = useState(false)
  const [createdLeadName, setCreatedLeadName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setCreatedLeadName(formData.name)
    onCreate(formData)
  }

  // Listen for creation success
  useEffect(() => {
    if (!isCreating && createdLeadName) {
      setShowSuccess(true)
      // Auto close after 2 seconds
      const timer = setTimeout(() => {
        setShowSuccess(false)
        onClose()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isCreating, createdLeadName])

  const channelOptions = [
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'email', label: 'Email' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'formulario', label: 'Formulario Web' },
    { value: 'llamada', label: 'Llamada' },
    { value: 'referido', label: 'Referido' }
  ]

  const propertyTypeOptions = [
    { value: 'casa', label: 'Casa' },
    { value: 'oficina', label: 'Oficina' },
    { value: 'departamento', label: 'Departamento' },
    { value: 'terreno', label: 'Terreno' },
    { value: 'local', label: 'Local comercial' }
  ]

  // Success Popup
  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-sm text-center border border-slate-700 shadow-2xl animate-bounce-in">
          <div className="w-20 h-20 mx-auto mb-4 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">¡Lead creado!</h3>
          <p className="text-emerald-400">{createdLeadName}</p>
          <p className="text-slate-400 text-sm mt-2">se agregó exitosamente</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Nuevo Lead</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
          {/* Name */}
          <div>
            <label className="block text-slate-400 text-sm mb-1">Nombre completo *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:border-blue-500 outline-none"
              placeholder="Juan Pérez"
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:border-blue-500 outline-none"
                placeholder="juan@email.com"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Teléfono</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:border-blue-500 outline-none"
                placeholder="+54 11 1234-5678"
              />
            </div>
          </div>

          {/* Channel */}
          <div>
            <label className="block text-slate-400 text-sm mb-1">Canal de origen</label>
            <select
              value={formData.channel}
              onChange={(e) => setFormData(f => ({ ...f, channel: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:border-blue-500 outline-none"
            >
              {channelOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Property Interest */}
          <div>
            <label className="block text-slate-400 text-sm mb-1">Tipo de propiedad interesada</label>
            <select
              value={formData.propertyInterest}
              onChange={(e) => setFormData(f => ({ ...f, propertyInterest: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:border-blue-500 outline-none"
            >
              <option value="">Seleccionar tipo...</option>
              {propertyTypeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Property Title (if properties available) */}
          {properties.length > 0 && (
            <div>
              <label className="block text-slate-400 text-sm mb-1">Propiedad específica</label>
              <select
                value={formData.propertyId}
                onChange={(e) => {
                  const prop = properties.find(p => p.id === e.target.value)
                  setFormData(f => ({ 
                    ...f, 
                    propertyId: e.target.value,
                    propertyTitle: prop?.title || ''
                  }))
                }}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:border-blue-500 outline-none"
              >
                <option value="">Seleccionar propiedad...</option>
                {properties.map(prop => (
                  <option key={prop.id} value={prop.id}>{prop.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Source */}
          <div>
            <label className="block text-slate-400 text-sm mb-1">Fuente</label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) => setFormData(f => ({ ...f, source: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:border-blue-500 outline-none"
              placeholder="Ej: Landing page, Facebook, Referido..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-400 text-sm mb-1">Notas</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:border-blue-500 outline-none resize-none h-24"
              placeholder="Notas adicionales sobre el lead..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Crear Lead
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ==========================================
// COMPONENTE: Import Leads Modal
// ==========================================
const ImportLeadsModal = ({ isOpen, onClose, onImport, properties = [] }) => {
  const [step, setStep] = useState(1) // 1: upload, 2: mapping, 3: preview
  const [file, setFile] = useState(null)
  const [rawData, setRawData] = useState([])
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({})
  const [preview, setPreview] = useState([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)
  
  // Column mapping definitions from engram
  const columnMappings = {
    name: ['nombre', 'full_name', 'fullname', 'nombre completo', 'name'],
    email: ['email', 'correo', 'mail', 'correo electrónico', 'e-mail'],
    phone: ['teléfono', 'telefono', 'phone', 'móvil', 'celular', 'mobile', 'cel'],
    channel: ['canal', 'origen', 'source', 'preferred_contact', 'medio'],
    propertyInterest: ['tipo_propiedad', 'property_type', 'interés', 'tipo_inmueble', 'tipo'],
    propertyTitle: ['propiedad', 'property', 'nombre_propiedad', 'titulo', 'título'],
    source: ['fuente', 'referrer', 'referred_by', 'referencia'],
    notes: ['notas', 'comments', 'observaciones', 'notas_adicionales']
  }
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setFile(null)
      setRawData([])
      setHeaders([])
      setMapping({})
      setPreview([])
      setImportResult(null)
    }
  }, [isOpen])
  
  // Auto-detect column mappings when headers are loaded
  useEffect(() => {
    if (headers.length > 0) {
      const autoMapping = {}
      headers.forEach(header => {
        const normalizedHeader = header.toLowerCase().trim()
        for (const [field, aliases] of Object.entries(columnMappings)) {
          if (aliases.some(alias => normalizedHeader.includes(alias) || alias.includes(normalizedHeader))) {
            if (!autoMapping[field]) {
              autoMapping[field] = header
              break
            }
          }
        }
      })
      setMapping(autoMapping)
    }
  }, [headers])
  
  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) return { headers: [], data: [] }
    
    // Parse headers
    const headerLine = lines[0]
    const headers = parseCSVLine(headerLine)
    
    // Parse data rows
    const data = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length > 0) {
        const row = {}
        headers.forEach((header, idx) => {
          row[header] = values[idx] || ''
        })
        data.push(row)
      }
    }
    
    return { headers, data }
  }
  
  const parseCSVLine = (line) => {
    const result = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    
    return result
  }
  
  const handleFile = (selectedFile) => {
    if (!selectedFile) return
    
    // Validate file type
    if (!selectedFile.name.endsWith('.csv') && selectedFile.type !== 'text/csv') {
      alert('Por favor selecciona un archivo CSV')
      return
    }
    
    setFile(selectedFile)
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        // Handle different encodings - remove BOM if present
        let content = e.target.result || ''
        if (typeof content !== 'string') {
          content = String(content)
        }
        // Remove BOM (Byte Order Mark)
        content = content.replace(/^\uFEFF/, '')
        
        // Simple CSV parsing
        const lines = content.split(/\r?\n/).filter(line => line.trim())
        
        if (lines.length < 2) {
          alert('El archivo CSV está vacío o no tiene datos')
          return
        }
        
        // Parse headers - split by comma and trim
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
        
        // Parse data rows
        const data = []
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
          if (values.length > 0 && values[0].trim()) {
            const row = {}
            headers.forEach((header, idx) => {
              row[header] = values[idx] || ''
            })
            data.push(row)
          }
        }
        
        // Validate we got data
        if (headers.length === 0) {
          alert('No se encontraron encabezados en el archivo')
          return
        }
        
        // Update state
        setHeaders(headers)
        setRawData(data)
        setStep(2)
      } catch (err) {
        console.error('Error parsing CSV:', err)
        alert('Error al procesar el archivo CSV')
      }
    }
    reader.onerror = () => {
      alert('Error al leer el archivo')
    }
    reader.readAsText(selectedFile)
  }
  
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv'))) {
      handleFile(droppedFile)
    }
  }, [])
  
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])
  
  const transformRow = (row) => {
    // Primero intentamos encontrar propertyId si hay propertyTitle
    let foundPropertyId = null;
    const propertyTitleVal = mapping.propertyTitle ? row[mapping.propertyTitle] || '' : '';
    
    // Try to match property title with existing properties
    if (propertyTitleVal && properties.length > 0) {
      const match = properties.find(p => 
        p.title.toLowerCase().includes(propertyTitleVal.toLowerCase()) ||
        propertyTitleVal.toLowerCase().includes(p.title.toLowerCase())
      );
      if (match) {
        foundPropertyId = match.id;
      }
    }
    
    const lead = {
      name: mapping.name ? row[mapping.name] || '' : '',
      email: mapping.email ? row[mapping.email] || '' : '',
      phone: mapping.phone ? row[mapping.phone] || '' : '',
      channel: mapping.channel ? row[mapping.channel]?.toLowerCase() || 'formulario' : 'formulario',
      propertyInterest: mapping.propertyInterest ? normalizePropertyType(row[mapping.propertyInterest]) : 'casa',
      propertyId: foundPropertyId,
      propertyTitle: propertyTitleVal,
      source: mapping.source ? row[mapping.source] || 'Importado' : 'Importado',
      notes: mapping.notes ? row[mapping.notes] || '' : ''
    }
    
    // Normalize channel
    const channelMap = {
      'whatsapp': 'whatsapp',
      'whats': 'whatsapp',
      'phone': 'whatsapp',
      'telefono': 'whatsapp',
      'email': 'email',
      'correo': 'email',
      'mail': 'email',
      'instagram': 'instagram',
      'ig': 'instagram',
      'formulario': 'formulario',
      'form': 'formulario',
      'web': 'formulario',
      'llamada': 'llamada',
      'call': 'llamada',
      'referido': 'referido',
      'referral': 'referido'
    }
    const normalizedChannel = channelMap[lead.channel] || 'formulario'
    lead.channel = normalizedChannel
    
    return lead
  }
  
  const normalizePropertyType = (type) => {
    if (!type) return 'casa'
    const normalized = type.toLowerCase().trim()
    const typeMap = {
      'casa': 'casa',
      'house': 'casa',
      'homes': 'casa',
      'departamento': 'departamento',
      'depa': 'departamento',
      'apartment': 'departamento',
      'apt': 'departamento',
      'terreno': 'terreno',
      'land': 'terreno',
      'lote': 'terreno',
      'local': 'local',
      'store': 'local',
      'tienda': 'local',
      'oficina': 'oficina',
      'office': 'oficina',
      'bodega': 'bodega',
      'warehouse': 'bodega'
    }
    return typeMap[normalized] || 'casa'
  }
  
  const handlePreview = () => {
    const transformed = rawData.slice(0, 5).map(transformRow).filter(row => row.name.trim())
    setPreview(transformed)
    setStep(3)
  }
  
  const handleImport = async () => {
    setImporting(true)
    const leadsToImport = rawData.map(transformRow).filter(row => row.name.trim())
    
    try {
      const results = { success: 0, errors: [] }
      
      for (const lead of leadsToImport) {
        try {
          const response = await fetch(`${API_URL}/leads`, {
            method: 'POST',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(lead)
          })
          
          if (response.ok) {
            results.success++
          } else {
            const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
            results.errors.push(`Error importing ${lead.name}: ${errorData.error || errorData.details?.[0] || 'Error desconocido'}`)
          }
        } catch (err) {
          results.errors.push(`Error de red: ${lead.name}`)
        }
      }
      
      setImportResult(results)
      onImport?.()
    } catch (err) {
      setImportResult({ success: 0, errors: ['Error general al importar: ' + err.message] })
    } finally {
      setImporting(false)
    }
  }
  
  const downloadSampleCSV = () => {
    const sampleData = `nombre,email,teléfono,canal,tipo_propiedad,propiedad,fuente,notas
María González,maria.gonzalez@email.com,+52 55 1234 5678,whatsapp,casa,Casa moderna en Lomas,Instagram,Interesada en casas con jardín
Carlos Rodríguez,carlos.rod@email.com,+52 55 9876 5432,email,departamento,Departamento en Polanco,Formulario Web,Busca zona céntrica
Ana Martínez,ana.martinez@email.com,+52 55 5555 4444,formulario,casa,Casa en Condesa,Portal Inmobiliario,Muy interesada
Roberto Sánchez,roberto.s@email.com,+52 55 7777 8888,whatsapp,terreno,Terreno en CDMX,WhatsApp,Viene de recomendación
Laura Hernández,laura.hernandez@email.com,+52 55 3333 2222,instagram,departamento,Penthouse en Santa Fe,Instagram,Cliente de alto perfil
Diego Ramírez,diego.ram@email.com,+52 55 6666 5555,formulario,casa,Casa en Coyoacán,Formulario Web,Ya visitó el lugar
Patricia López,patricia.l@email.com,+52 55 8888 9999,whatsapp,departamento,Departamento en Roma Norte,WhatsApp,Primera vez comprando
Fernando Torres,fernando.torres@email.com,+52 55 1111 2222,email,local,Local comercial en Insurgentes,Email,Busca local para restaurante
Carmen Rivera,carmen.rivera@email.com,+52 55 4444 3333,instagram,casa,Casa en San Ángel,Instagram,Muy interesada en ubicación
José Luis Moreno,jose.moreno@email.com,+52 55 2222 3333,whatsapp,departamento,Departamento en Juárez,Facebook,Presupuesto flexible
Gabriela Flores,gabriela.flores@email.com,+52 55 4444 5555,email,casa,Villa en Tlalpan,Referido,Conocida del agente
Miguel Ángel Cruz,miguel.cruz@email.com,+52 55 6666 7777,formulario,terreno,Terreno en Huixquilucan,Web,Quisiera construir
Sofía Ramírez,sofia.ramirez@email.com,+52 55 8888 9999,instagram,departamento,Loft en Roma,Instagram,Diseñadora de interiores
Ricardo Vega,ricardo.vega@email.com,+52 55 1111 3333,whatsapp,casa,Casa en Alpes,WhatsApp,Inversionista
Lucía Torres,lucia.torres@email.com,+52 55 5555 6666,email,oficina,Oficina en Santa Fe,LinkedIn,Para empresa nueva`
    
    const blob = new Blob([sampleData], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ejemplo_leads_importacion.csv'
    a.click()
    URL.revokeObjectURL(url)
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <Upload className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Importar Leads</h2>
                <p className="text-slate-400 text-sm">
                  {step === 1 && 'Subí tu archivo CSV'}
                  {step === 2 && 'Mapeá las columnas'}
                  {step === 3 && 'Revisá y confirmá'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step >= s ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'
                }`}>
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-12 h-0.5 ${step > s ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* STEP 1: Upload */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Download Sample */}
              <button
                onClick={downloadSampleCSV}
                className="w-full p-4 border-2 border-dashed border-slate-600 rounded-xl hover:border-emerald-500 hover:bg-emerald-500/5 transition-all group"
              >
                <div className="flex items-center justify-center gap-3 text-slate-400 group-hover:text-emerald-400">
                  <Download className="w-5 h-5" />
                  <span>Descargar ejemplo CSV</span>
                </div>
              </button>
              
              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`p-12 border-2 border-dashed rounded-xl cursor-pointer transition-all text-center ${
                  isDragging 
                    ? 'border-emerald-500 bg-emerald-500/10' 
                    : 'border-slate-600 hover:border-emerald-500 hover:bg-emerald-500/5'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    handleFile(e.target.files[0])
                    // Reset input so the same file can be selected again
                    e.target.value = ''
                  }}
                  className="hidden"
                />
                <FileText className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-emerald-400' : 'text-slate-500'}`} />
                <p className="text-white font-medium mb-1">
                  {isDragging ? '¡Soltá el archivo aquí!' : 'Arrastrá tu archivo CSV aquí'}
                </p>
                <p className="text-slate-400 text-sm">o hacé click para seleccionar</p>
              </div>
              
              {/* Supported Formats */}
              <div className="flex items-center justify-center gap-6 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  CSV
                </div>
              </div>
            </div>
          )}
          
          {/* STEP 2: Column Mapping */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-slate-700/50 rounded-xl p-4 flex items-center gap-3">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div className="flex-1">
                  <p className="text-white font-medium">{file?.name}</p>
                  <p className="text-slate-400 text-sm">{rawData.length} filas encontradas</p>
                </div>
                <button
                  onClick={() => { setStep(1); setFile(null); setRawData([]); setHeaders([]); }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-white font-medium">Mapeo de columnas</h3>
                <p className="text-slate-400 text-sm">Asociá las columnas de tu archivo con los campos del sistema</p>
                
                {/* Required Fields */}
                <div className="grid grid-cols-2 gap-4">
                  {['name', 'email', 'phone'].map((field) => (
                    <div key={field}>
                      <label className="block text-slate-400 text-sm mb-2 capitalize">
                        {field === 'name' ? 'Nombre *' : field === 'email' ? 'Email' : 'Teléfono'}
                      </label>
                      <select
                        value={mapping[field] || ''}
                        onChange={(e) => setMapping(m => ({ ...m, [field]: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:border-emerald-500 outline-none"
                      >
                        <option value="">-- Seleccionar --</option>
                        {headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                
                {/* Optional Fields */}
                <div className="grid grid-cols-2 gap-4">
                  {['channel', 'propertyInterest', 'propertyTitle', 'source', 'notes'].map((field) => (
                    <div key={field}>
                      <label className="block text-slate-400 text-sm mb-2 capitalize">
                        {field === 'channel' ? 'Canal' : 
                         field === 'propertyInterest' ? 'Tipo propiedad' : 
                         field === 'propertyTitle' ? 'Propiedad' : 
                         field === 'source' ? 'Fuente' : 'Notas'}
                      </label>
                      <select
                        value={mapping[field] || ''}
                        onChange={(e) => setMapping(m => ({ ...m, [field]: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:border-emerald-500 outline-none"
                      >
                        <option value="">-- Opcional --</option>
                        {headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Auto-detected notice */}
              {Object.keys(mapping).length > 0 && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Se detectaron automáticamente algunas columnas
                </div>
              )}
            </div>
          )}
          
          {/* STEP 3: Preview */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-slate-700/50 rounded-xl p-4">
                <p className="text-white font-medium mb-1">Vista previa</p>
                <p className="text-slate-400 text-sm">{rawData.length} leads para importar</p>
              </div>
              
              {/* Preview Table */}
              <div className="bg-slate-900/50 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-slate-400 font-medium">Nombre</th>
                      <th className="px-4 py-3 text-left text-slate-400 font-medium">Email</th>
                      <th className="px-4 py-3 text-left text-slate-400 font-medium">Teléfono</th>
                      <th className="px-4 py-3 text-left text-slate-400 font-medium">Canal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {preview.map((lead, idx) => (
                      <tr key={idx} className="hover:bg-slate-700/30">
                        <td className="px-4 py-3 text-white">{lead.name}</td>
                        <td className="px-4 py-3 text-slate-400">{lead.email || '-'}</td>
                        <td className="px-4 py-3 text-slate-400">{lead.phone || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs capitalize ${
                            lead.channel === 'whatsapp' ? 'bg-emerald-500/20 text-emerald-400' :
                            lead.channel === 'email' ? 'bg-blue-500/20 text-blue-400' :
                            lead.channel === 'instagram' ? 'bg-pink-500/20 text-pink-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {lead.channel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rawData.length > 5 && (
                  <div className="px-4 py-3 text-center text-slate-500 text-sm border-t border-slate-700/50">
                    ...y {rawData.length - 5} más
                  </div>
                )}
              </div>
              
              {/* Import Result */}
              {importResult && (
                <div className={`rounded-xl p-6 text-center animate-scale-in ${
                  importResult.success > 0 
                    ? 'bg-emerald-500/10 border border-emerald-500/30' 
                    : 'bg-red-500/10 border border-red-500/30'
                }`}>
                  {importResult.success > 0 ? (
                    <>
                      <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/20 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">¡Importación exitosa!</h3>
                      <p className="text-emerald-400">{importResult.success} leads importados correctamente</p>
                      {importResult.errors.length > 0 && (
                        <p className="text-red-400 text-sm mt-2">{importResult.errors.length} errores</p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Error en la importación</h3>
                      <p className="text-red-400">{importResult.errors[0]}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-800/50">
          <div className="flex gap-3">
            {step > 1 && !importResult && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-medium transition-colors"
              >
                Volver
              </button>
            )}
            {step === 2 && (
              <button
                onClick={handlePreview}
                disabled={!mapping.name}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                Continuar
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
            {step === 3 && !importResult && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 rounded-xl text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Importar {rawData.length} leads
                  </>
                )}
              </button>
            )}
            {importResult && (
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Listo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// COMPONENTE: Toast Notification (10 segundos + X para cerrar)
// ==========================================
const Toast = ({ message, type = 'success', onClose, duration = 10000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  const bgColor = {
    success: 'from-emerald-500 to-green-500',
    error: 'from-red-500 to-rose-500',
    warning: 'from-amber-500 to-orange-500',
    info: 'from-blue-500 to-cyan-500'
  }[type] || 'from-emerald-500 to-green-500'

  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertCircle,
    info: Bell
  }

  const Icon = icons[type] || CheckCircle2

  return (
    <div className="fixed top-4 right-4 z-[100] animate-slide-in-right">
      <div className={`bg-gradient-to-r ${bgColor} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 max-w-md`}>
        <Icon className="w-6 h-6 flex-shrink-0" />
        <p className="flex-1">{message}</p>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

// ==========================================
// COMPONENTE: Send Animation Modal
// ==========================================
const SendAnimationModal = ({ isOpen, channel, onClose }) => {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('sending')
  
  useEffect(() => {
    if (!isOpen) return
    
    setProgress(0)
    setStatus('sending')
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setStatus('success')
          setTimeout(onClose, 2000)
          return 100
        }
        return prev + 3
      })
    }, 80)
    
    return () => clearInterval(interval)
  }, [isOpen])

  if (!isOpen) return null

  const config = {
    whatsapp: { icon: MessageCircle, color: 'emerald', label: 'WhatsApp' },
    email: { icon: Mail, color: 'blue', label: 'Email' },
    instagram: { icon: Instagram, color: 'pink', label: 'Instagram' },
    messenger: { icon: Facebook, color: 'blue', label: 'Messenger' }
  }[channel] || { icon: MessageCircle, color: 'emerald', label: 'WhatsApp' }

  const Icon = config.icon

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl p-8 w-80 text-center border border-slate-700 shadow-2xl animate-scale-in">
        {status === 'sending' ? (
          <>
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center animate-pulse">
              <Icon className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Enviando mensaje...</h3>
            <p className="text-slate-400 mb-4">via {config.label}</p>
            
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-slate-500 text-sm">{progress}%</p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center animate-bounce-in">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">¡Enviado!</h3>
            <p className="text-emerald-400">Mensaje enviado exitosamente via {config.label}</p>
          </>
        )}
      </div>
    </div>
  )
}

// ==========================================
// COMPONENTE: Send Followup Modal (MEJORADO)
// ==========================================
const SendFollowupModal = ({ isOpen, onClose, lead, onSend, channels = ['whatsapp', 'email'] }) => {
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedChannel, setSelectedChannel] = useState('whatsapp')
  const [message, setMessage] = useState('')
  const [showAnimation, setShowAnimation] = useState(false)
  const [sending, setSending] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiGenerated, setAiGenerated] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDay(null)
      setSelectedChannel('whatsapp')
      setMessage('')
      setAiGenerated(false)
    }
  }, [isOpen])

  // Default messages by day
  const defaultMessages = {
    1: {
      whatsapp: `¡Hola ${lead?.name?.split(' ')[0]}! 👋 Soy [Agente]. Vi que te interesa nuestra propiedad. ¿Te gustaría agendar una visita mañana? 🏠`,
      email: `¡Bienvenido${lead?.name?.split(' ')[0] ? ', ' + lead.name.split(' ')[0] : ''}!\n\nGracias por tu interés. Estoy a tu disposición para darte más información.\n\nSaludos`
    },
    3: {
      whatsapp: `¡Hola ${lead?.name?.split(' ')[0]}! 🌟 Te cuento que la propiedad sigue disponible. ¿Pudiste ver las fotos? Tiene TODO lo que buscás.`,
      email: `Detalles de la propiedad:\n\n📍 Ubicación privilegiada\n💰 Precio competitivo\n📐 Excelente distribución\n\n¿Te gustaría programar una visita?`
    },
    7: {
      whatsapp: `¡Hey ${lead?.name?.split(' ')[0]}! 👀 Solo quería saber si te gustó la propiedad. Está generando mucho interés. 😮`,
      email: `¿Qué te pareció la propiedad?\n\nQuedo a tu disposición para cualquier duda.`
    },
    14: {
      whatsapp: `${lead?.name?.split(' ')[0]} 👋 Quiero saber tu opinión. ¿Conocés a alguien interesado? Tu recomendación cuenta. 🏃`,
      email: `¡Última oportunidad!\n\nEsta semana tenemos una promoción especial.\n\n¿Querés asegurar tu lugar?`
    }
  }

  // AI generated messages
  const aiMessages = {
    whatsapp: {
      1: [
        `¡Hola ${lead?.name?.split(' ')[0]}! 👋 Bienvenido/a a nuestra inmobiliaria. Soy tu asesor/a dedicado/a. Vi que mostraste interés en nuestra propiedad más reciente. ¿Te gustaría que te cuente todos los detalles? 🏠✨`,
        `¡Qué bueno que nos contactaste! 😄 Soy ${lead?.name?.split(' ')[0] ? '' : ''}de Inmobiliaria XYZ. Tengo EXACTAMENTE lo que estás buscando. ¿Cuándo podemos coordinar una llamada o visita? 📞`
      ],
      3: [
        `¡Hola ${lead?.name?.split(' ')[0]}! Hope you had a great day! 🌟 Quería contarte que la propiedad que te interesa acaba de tener varias consultas. No te quedes fuera! 🏃‍♂️ Cuéntame, ¿qué te pareció el tour virtual?`,
        `${lead?.name?.split(' ')[0]}, ¿qué tal todo? 👀 Sigo pensando en vos para esta propiedad. Tiene TODO: ubicación, precio y esa energía que no se puede describir. ¿Te sumo a la lista VIP para la próxima visita? 💎`
      ],
      7: [
        `Hey ${lead?.name?.split(' ')[0]}! 👋 ¿Sigues ahí? 😅 Sé que a veces uno anda corto de tiempo, pero esta oportunidad no espera. La propiedad que te mostré tiene todo para ser tu nuevo hogar. ¿Te animás a verla este finde? 🏡`,
        `${lead?.name?.split(' ')[0]}, te quería preguntar algo... 👀 ¿Viste el video que te envié? Es INCREÍBLE lo que tiene esa casa. Y los vecinos también son un sueño. ¿Te late? 🏠✨`
      ],
      14: [
        `${lead?.name?.split(' ')[0]}, última chance! 🏃‍♂️ Esta semana es la ideal para visitarla porque hay una promo especial. Después el precio sube porque ya hay otras familias interesadas. ¿Querés asegurar tu lugar? 💰`,
        `¡${lead?.name?.split(' ')[0]}! Te soy sincero/a 👀 Otra familia está por cerrar. Pero como me caés bien, te doy prioridad. Solo hasta el viernes. ¿Nos vemos mañana? 🤝`
      ]
    },
    email: {
      1: [
        `Asunto: ¡Bienvenido/a ${lead?.name?.split(' ')[0]}! Tenemos algo especial para vos\n\nHola ${lead?.name?.split(' ')[0]},\n\n¡Qué alegría que nos contactes! Estoy muy emocionado/a de ayudarte a encontrar tu próximo hogar.\n\nHe preparado un dossier exclusivo con TODO lo que necesitas saber sobre las propiedades que pueden interesarte.\n\n¿Te parece si agendamos una llamada esta semana?\n\n¡Saludos!`,
        `Asunto: Gracias por contactarnos, ${lead?.name?.split(' ')[0]} 👋\n\nHola ${lead?.name?.split(' ')[0]},\n\nGracias por tu interés en nuestros servicios inmobiliarios.\n\nMi nombre es [Tu Nombre] y seré tu asesor/a personalizado/a. He trabajado con decenas de familias como vos y sé exactamente cómo encontrar la propiedad perfecta.\n\nAdjunto información sobre las mejores opciones disponibles.\n\nQuedo a tu disposición.\n\n¡Saludos!`
      ]
    }
  }

  const handleSelectDay = (day) => {
    setSelectedDay(day)
    setAiGenerated(false)
    const msg = defaultMessages[day]?.[selectedChannel] || ''
    setMessage(msg.replace('[Agente]', 'Tu Asesor'))
  }

  const handleSelectChannel = (channel) => {
    setSelectedChannel(channel)
    setAiGenerated(false)
    if (selectedDay) {
      const msg = defaultMessages[selectedDay]?.[channel] || ''
      setMessage(msg.replace('[Agente]', 'Tu Asesor'))
    }
  }

  const generateAIMessage = async () => {
    if (!selectedDay || !selectedChannel) return
    
    setGeneratingAI(true)
    try {
      // Try to use backend AI generation first
      const response = await fetch(`${API_URL}/automation/generate-alternatives`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          step: { 
            day: selectedDay, 
            channels: [selectedChannel],
            templates: defaultMessages[selectedDay]
          }, 
          lead 
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.alternatives && data.alternatives.length > 0) {
          setMessage(data.alternatives[0].message || data.alternatives[0].body || message)
          setAiGenerated(true)
          return
        }
      }
      
      // Fallback to local AI messages
      const channelMessages = aiMessages[selectedChannel]?.[selectedDay]
      if (channelMessages && channelMessages.length > 0) {
        const randomIndex = Math.floor(Math.random() * channelMessages.length)
        setMessage(channelMessages[randomIndex])
        setAiGenerated(true)
      }
    } catch (err) {
      console.error('Error generating AI message:', err)
      // Fallback
      const channelMessages = aiMessages[selectedChannel]?.[selectedDay]
      if (channelMessages && channelMessages.length > 0) {
        const randomIndex = Math.floor(Math.random() * channelMessages.length)
        setMessage(channelMessages[randomIndex])
        setAiGenerated(true)
      }
    } finally {
      setGeneratingAI(false)
    }
  }

  const handleSend = async () => {
    if (!selectedDay || !message) return
    
    setSending(true)
    setShowAnimation(true)
    
    try {
      await onSend(lead, selectedDay, selectedChannel, message)
    } catch (err) {
      console.error('Error sending:', err)
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  const channelConfig = {
    whatsapp: { icon: MessageCircle, color: 'emerald', label: 'WhatsApp', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
    email: { icon: Mail, color: 'blue', label: 'Email', bg: 'bg-blue-500/20', text: 'text-blue-400' },
    instagram: { icon: Instagram, color: 'pink', label: 'Instagram', bg: 'bg-pink-500/20', text: 'text-pink-400' },
    messenger: { icon: Facebook, color: 'blue', label: 'Messenger', bg: 'bg-blue-500/20', text: 'text-blue-400' }
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden border border-slate-700 shadow-2xl animate-scale-in">
          {/* Header */}
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-violet-400" />
                  Enviar Seguimiento
                </h3>
                <p className="text-slate-400 text-sm">Para: {lead?.name}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
            {/* Step 1: Select Day */}
            <div>
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                Seleccionar día de la secuencia
              </h4>
              <div className="grid grid-cols-4 gap-3">
                {[1, 3, 7, 14].map(day => (
                  <button
                    key={day}
                    onClick={() => handleSelectDay(day)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedDay === day
                        ? 'bg-blue-500/20 border-blue-500 text-white'
                        : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <p className="font-bold text-lg">Día {day}</p>
                    <p className="text-xs opacity-70">
                      {day === 1 ? 'Bienvenida' : 
                       day === 3 ? 'Info' : 
                       day === 7 ? 'Seguimiento' : 'Cierre'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Select Channel */}
            {selectedDay && (
              <div className="animate-fade-in">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  Seleccionar canal
                </h4>
                <div className="flex gap-3">
                  {channels.map(channel => {
                    const config = channelConfig[channel]
                    const Icon = config.icon
                    return (
                      <button
                        key={channel}
                        onClick={() => handleSelectChannel(channel)}
                        className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          selectedChannel === channel
                            ? `${config.bg} border-current ${config.text}`
                            : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {config.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Edit Message */}
            {selectedDay && (
              <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-medium flex items-center gap-2">
                    <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                    Mensaje
                  </h4>
                  <button
                    onClick={generateAIMessage}
                    disabled={generatingAI}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:scale-105 ${
                      aiGenerated 
                        ? 'bg-violet-600 text-white' 
                        : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white'
                    }`}
                  >
                    {generatingAI ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {aiGenerated ? 'Generar otra' : 'Generar con IA'}
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value)
                    setAiGenerated(false)
                  }}
                  className="w-full h-40 bg-slate-700/50 rounded-xl p-4 text-white resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Escribí tu mensaje o generá uno con IA..."
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-slate-500 text-xs">
                    {message.length} caracteres
                  </p>
                  {aiGenerated && (
                    <span className="text-violet-400 text-xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Generado por IA
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-700 bg-slate-800/50">
            <button
              onClick={handleSend}
              disabled={!selectedDay || !message || sending}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl text-white font-medium transition-colors flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Enviar Mensaje
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Send Animation */}
      <SendAnimationModal 
        isOpen={showAnimation} 
        channel={selectedChannel} 
        onClose={() => {
          setShowAnimation(false)
          onClose()
        }} 
      />
    </>
  )
}

// ==========================================
// COMPONENTE: Kanban Column
// ==========================================
const KanbanColumn = ({ title, color, leads, statusFilter, onLeadClick, selectionMode, selectedLeads, toggleSelectLead }) => {
  const colorClasses = {
    blue: { header: 'bg-blue-500/20 border-blue-500/30', badge: 'bg-blue-500/20 text-blue-400', title: 'text-blue-400' },
    amber: { header: 'bg-amber-500/20 border-amber-500/30', badge: 'bg-amber-500/20 text-amber-400', title: 'text-amber-400' },
    emerald: { header: 'bg-emerald-500/20 border-emerald-500/30', badge: 'bg-emerald-500/20 text-emerald-400', title: 'text-emerald-400' },
    purple: { header: 'bg-purple-500/20 border-purple-500/30', badge: 'bg-purple-500/20 text-purple-400', title: 'text-purple-400' },
    cyan: { header: 'bg-cyan-500/20 border-cyan-500/30', badge: 'bg-cyan-500/20 text-cyan-400', title: 'text-cyan-400' },
    red: { header: 'bg-red-500/20 border-red-500/30', badge: 'bg-red-500/20 text-red-400', title: 'text-red-400' }
  }
  
  const classes = colorClasses[color] || colorClasses.blue
  
  // Filter leads by status
  const filteredLeads = statusFilter ? leads.filter(l => l.status === statusFilter) : leads

  return (
    <div className={`rounded-xl border ${classes.header} overflow-hidden`}>
      {/* Header */}
      <div className="p-3 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold ${classes.title}`}>{title}</h3>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${classes.badge}`}>
            {filteredLeads.length}
          </span>
        </div>
      </div>
      
      {/* Leads */}
      <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
        {filteredLeads.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">Sin leads</p>
        ) : (
          filteredLeads.map(lead => {
            const isSelected = selectedLeads.has(lead.id)
            return (
              <div
                key={lead.id}
                onClick={() => {
                  if (selectionMode) {
                    toggleSelectLead(lead.id)
                  } else {
                    onLeadClick(lead)
                  }
                }}
                className={`
                  p-3 rounded-lg cursor-pointer transition-all
                  ${isSelected 
                    ? 'bg-blue-500/20 border border-blue-500/50' 
                    : 'bg-slate-800/50 hover:bg-slate-700/50 border border-transparent'
                  }
                `}
              >
                {/* Selection checkbox */}
                {selectionMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSelectLead(lead.id)
                    }}
                    className={`
                      w-4 h-4 rounded border-2 flex items-center justify-center transition-all mb-2
                      ${isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-slate-600 hover:border-blue-500'
                      }
                    `}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                  </button>
                )}
                
                {/* Lead name */}
                <h4 className="font-medium text-white text-sm truncate">{lead.name}</h4>
                
                {/* Channel */}
                <p className="text-slate-400 text-xs mt-1 capitalize flex items-center gap-1">
                  {lead.channel === 'whatsapp' && '📱'}
                  {lead.channel === 'email' && '📧'}
                  {lead.channel === 'instagram' && '📸'}
                  {lead.channel}
                </p>
                
                {/* Quick actions */}
                {!selectionMode && (
                  <div className="flex gap-1 mt-2">
                    {lead.phone && (
                      <a
                        href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                        title="WhatsApp"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </a>
                    )}
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        title="Email"
                      >
                        <Mail className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ==========================================
// COMPONENTE: Lead Detail Modal
// ==========================================
const LeadDetailModal = ({ lead, onClose, onUpdate, sequences = [], leadsInSequences = {}, onRemoveFromSequence, getLeadSequenceName, getLeadInSequence }) => {
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showChatModal, setShowChatModal] = useState(false)
  const [showContractModal, setShowContractModal] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')
  const [currentStatus, setCurrentStatus] = useState(lead.status)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [removing, setRemoving] = useState(false)

  // Get which sequence this lead is in
  const leadSequenceName = getLeadSequenceName ? getLeadSequenceName(lead.id) : null
  const isInSequence = !!leadSequenceName
  const leadSeqData = getLeadInSequence ? getLeadInSequence(lead.id) : null

  useEffect(() => {
    loadTimeline()
  }, [lead.id])

  useEffect(() => {
    setCurrentStatus(lead.status)
  }, [lead.status])

  const loadTimeline = async () => {
    try {
      const response = await fetch(`${API_URL}/leads/${lead.id}/timeline`, { headers: getAuthHeaders() })
      if (response.ok) {
        const data = await response.json()
        setTimeline(data.timeline)
      }
    } catch (err) {
      console.error('Error loading timeline:', err)
    } finally {
      setLoading(false)
    }
  }

  const sendFollowUp = async (leadData, day, channel, message) => {
    try {
      // Use the automation send endpoint
      const response = await fetch(`${API_URL}/automation/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          lead: leadData,
          channel,
          message,
          stepId: `day-${day}`,
          sequenceId: 'manual'
        })
      })
      
      if (response.ok) {
        await loadTimeline()
        onUpdate?.()
        setToastMessage(`Mensaje enviado exitosamente via ${channel}`)
        setToastType('success')
        setShowToast(true)
      } else {
        throw new Error('Error sending')
      }
    } catch (err) {
      console.error('Error sending follow-up:', err)
      setToastMessage('Error al enviar el mensaje')
      setToastType('error')
      setShowToast(true)
    }
  }

  const updateStatus = async (status) => {
    try {
      const response = await fetch(`${API_URL}/leads/${lead.id}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      })
      if (response.ok) {
        setCurrentStatus(status)
        onUpdate?.()
        
        // Si el lead pasa a "cerrado", ofrecer generar contrato
        if (status === 'cerrado') {
          setToastMessage('Estado actualizado. ¿Deseas generar un contrato?')
          setToastType('info')
          setShowToast(true)
          // Abrir modal de contrato después de un breve delay
          setTimeout(() => setShowContractModal(true), 1500)
        } else {
          setToastMessage('Estado actualizado correctamente')
          setToastType('success')
          setShowToast(true)
        }
        
        // Add notification if lead responded
        if (status === 'respondio') {
          try {
            addNotification(NOTIFICATION_TYPES.LEAD_RESPONDED, {
              name: lead.name
            })
          } catch (notifErr) {
            console.error('Error adding notification:', notifErr)
          }
        }
      } else {
        throw new Error('Response not ok')
      }
    } catch (err) {
      console.error('Error updating status:', err)
      setToastMessage('Error al actualizar estado')
      setToastType('error')
      setShowToast(true)
    }
  }

  // Toggle automation pause/resume
  const toggleAutomationPause = async () => {
    try {
      const endpoint = lead.automationPaused 
        ? `${API_URL}/leads/${lead.id}/automation/resume`
        : `${API_URL}/leads/${lead.id}/automation/pause`
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const data = await response.json()
        setToastMessage(data.message)
        setToastType('success')
        setShowToast(true)
        onUpdate?.()
      } else {
        throw new Error('Error toggling automation')
      }
    } catch (err) {
      console.error('Error toggling automation:', err)
      setToastMessage('Error al cambiar estado de automatización')
      setToastType('error')
      setShowToast(true)
    }
  }

  // Start automation sequence
  const startAutomation = async () => {
    try {
      const response = await fetch(`${API_URL}/leads/${lead.id}/automation/start`, {
        method: 'POST',
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const data = await response.json()
        setToastMessage(data.message)
        setToastType('success')
        setShowToast(true)
        onUpdate?.()
        await loadTimeline()
      } else {
        throw new Error('Error starting automation')
      }
    } catch (err) {
      console.error('Error starting automation:', err)
      setToastMessage('Error al iniciar secuencia de automatización')
      setToastType('error')
      setShowToast(true)
    }
  }

  // Remove lead from sequence
  const handleRemoveFromSequence = async () => {
    setRemoving(true)
    try {
      const success = await onRemoveFromSequence?.(lead.id)
      if (success) {
        setToastMessage('Lead removido de la secuencia')
        setToastType('success')
        setShowToast(true)
        setShowRemoveConfirm(false)
        onUpdate?.()
        onClose?.()
      } else {
        throw new Error('Error removing from sequence')
      }
    } catch (err) {
      console.error('Error removing from sequence:', err)
      setToastMessage('Error al remover de la secuencia')
      setToastType('error')
      setShowToast(true)
    } finally {
      setRemoving(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      nuevo: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Nuevo' },
      contactado: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Contactado' },
      respondio: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Respondió' },
      visita_agendada: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Visita Agendada' },
      cerrado: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Cerrado' },
      perdido: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Perdido' }
    }
    return badges[status] || badges.nuevo
  }

  const getStatusChangeLabel = (from, to) => {
    const labels = {
      nuevo: 'Nuevo',
      contactado: 'Contactado',
      respondio: 'Respondió',
      visita_agendada: 'Visita Agendada',
      cerrado: 'Cerrado',
      perdido: 'Perdido'
    }
    const fromLabel = from ? (labels[from] || from) : 'Nuevo'
    const toLabel = to ? (labels[to] || to) : to
    return `${fromLabel} → ${toLabel}`
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Sin fecha'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Sin fecha'
    return date.toLocaleDateString('es-ES', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      {/* Toast Notification */}
      {showToast && (
        <Toast 
          message={toastMessage} 
          type={toastType} 
          onClose={() => setShowToast(false)} 
        />
      )}

      {/* Remove from Sequence Confirmation */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 shadow-2xl animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/20 rounded-full flex items-center justify-center">
                <Zap className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">¿Sacar de la secuencia?</h3>
              <p className="text-slate-400">
                El lead <span className="text-white font-semibold">{lead.name}</span> será removido de "{leadSequenceName}" y podrás enviar follow-ups manuales.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRemoveConfirm(false)}
                disabled={removing}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-xl text-white font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRemoveFromSequence}
                disabled={removing}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:bg-red-500/50 rounded-xl text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                {removing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sacando...
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5" />
                    Sacar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-700 shadow-2xl animate-scale-in">
          {/* Header */}
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl animate-pulse-subtle">
                  {lead.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">{lead.name}</h2>
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusBadge(currentStatus).color}`}>
                      {getStatusBadge(currentStatus).label}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm">{lead.email || lead.phone}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 animate-fade-in-up">
              <div className="bg-slate-700/50 rounded-xl p-4">
                <p className="text-slate-400 text-sm mb-1">Canal</p>
                <p className="text-white font-medium capitalize flex items-center gap-2">
                  {lead.channel === 'whatsapp' && <MessageCircle className="w-4 h-4 text-emerald-400" />}
                  {lead.channel === 'email' && <Mail className="w-4 h-4 text-blue-400" />}
                  {lead.channel === 'instagram' && <Instagram className="w-4 h-4 text-pink-400" />}
                  {lead.channel}
                </p>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-4">
                <p className="text-slate-400 text-sm mb-1">Interés</p>
                {lead.propertyInterest ? (
                  <p className="text-white font-medium capitalize">{lead.propertyInterest}</p>
                ) : (
                  <p className="text-slate-500">No especificado</p>
                )}
              </div>
              <div className="bg-slate-700/50 rounded-xl p-4 col-span-2">
                <p className="text-slate-400 text-sm mb-1">Propiedad</p>
                <p className="text-white font-medium">{lead.propertyTitle || 'No especificada'}</p>
              </div>
              {lead.notes && (
                <div className="bg-slate-700/50 rounded-xl p-4 col-span-2">
                  <p className="text-slate-400 text-sm mb-1">Notas</p>
                  <p className="text-white">{lead.notes}</p>
                </div>
              )}
            </div>

            {/* Status Actions */}
            <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <p className="text-slate-400 text-sm mb-3">Cambiar Estado</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => updateStatus('nuevo')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all hover:scale-105 ${
                    currentStatus === 'nuevo'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  nuevo
                </button>
                <button
                  onClick={() => updateStatus('contactado')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all hover:scale-105 ${
                    currentStatus === 'contactado'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  contactado
                </button>
                <button
                  onClick={() => updateStatus('respondio')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all hover:scale-105 ${
                    currentStatus === 'respondio'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  respondio
                </button>
                <button
                  onClick={() => updateStatus('visita_agendada')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all hover:scale-105 ${
                    currentStatus === 'visita_agendada'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  visita agendada
                </button>
                <button
                  onClick={() => updateStatus('cerrado')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all hover:scale-105 ${
                    currentStatus === 'cerrado'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  cerrado
                </button>
                <button
                  onClick={() => updateStatus('perdido')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all hover:scale-105 ${
                    currentStatus === 'perdido'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  perdido
                </button>
              </div>
            </div>

            {/* Status History */}
            {lead.statusHistory && lead.statusHistory.length > 0 && (
              <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <p className="text-slate-400 text-sm mb-3">Historial de Cambios</p>
                <div className="space-y-2">
                  {lead.statusHistory.slice().reverse().map((change, idx) => (
                    <div key={change.id || idx} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <Clock className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">
                          {getStatusChangeLabel(change.previousStatus, change.newStatus)}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {formatDateTime(change.createdAt)}
                          {change.user && change.user.name && ` • ${change.user.name}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline / Sequence */}
            <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-white font-medium">Secuencia de Follow-up</p>
                  
                  {/* Show which sequence the lead is in */}
                  {isInSequence ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-violet-500/20 text-violet-400 border border-violet-500/30 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {leadSequenceName}
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-600 text-slate-400 border border-slate-500/30">
                      📋 Manual
                    </span>
                  )}
                  
                  {/* Show paused badge if applicable */}
                  {lead.inAutomation && lead.automationPaused && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      ⏸️ Pausado
                    </span>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {/* Remove from Sequence Button */}
                  {isInSequence && (
                    <button
                      onClick={() => setShowRemoveConfirm(true)}
                      className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center gap-2 bg-red-600/80 hover:bg-red-600 text-white"
                    >
                      <X className="w-4 h-4" />
                      Sacar de Secuencia
                    </button>
                  )}
                  
                  {/* Pause/Resume Button */}
                  {lead.inAutomation && !isInSequence && (
                    <button
                      onClick={toggleAutomationPause}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center gap-2 ${
                        lead.automationPaused
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-amber-600 hover:bg-amber-500 text-white'
                      }`}
                    >
                      {lead.automationPaused ? (
                        <>
                          <Play className="w-4 h-4" />
                          Reanudar
                        </>
                      ) : (
                        <>
                          <Pause className="w-4 h-4" />
                          Pausar
                        </>
                      )}
                    </button>
                  )}
                  
                  {/* Send Manual Message Button - always enabled */}
                  <button
                    onClick={() => setShowSendModal(true)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 hover:scale-105"
                    title="Enviar mensaje manual"
                  >
                    <Send className="w-4 h-4" />
                    Enviar Mensaje
                  </button>

                  {/* Chat Button - Opens ChatModal */}
                  <button
                    onClick={() => setShowChatModal(true)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 hover:scale-105"
                    title="Abrir chat en vivo"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chatear
                  </button>
                </div>
              </div>
              
              {/* Info box when lead is in automation (optional info, not blocking) */}
              {lead.inAutomation && isInSequence && (
                <div className="mb-4 p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-violet-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Zap className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium mb-1">
                        Este lead también está en la secuencia: "{leadSequenceName}"
                      </p>
                      <p className="text-slate-400 text-sm">
                        Los mensajes manuales se envían fuera de la secuencia de automatización.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Automation Progress Bar */}
              {lead.inAutomation && (
                <div className="mb-4 p-3 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-violet-400 text-sm font-medium">Progreso de automatización</span>
                    <span className="text-violet-300 text-sm">
                      {lead.automationDay || 0}/14 días
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${((lead.automationDay || 0) / 14) * 100}%` }}
                    />
                  </div>
                  <p className="text-slate-400 text-xs mt-2">
                    {lead.automationPaused 
                      ? '⏸️ Automatización pausada - los mensajes no se enviarán automáticamente'
                      : '⚡ Automatización activa - los mensajes se enviarán automáticamente'
                    }
                  </p>
                </div>
              )}

              {loading ? (
                <div className="text-center py-8 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                </div>
              ) : (
                <div className="space-y-3">
                  {timeline.map((item, idx) => {
                    const displayChannel = (item.type === 'followup' && isInSequence && leadSeqData?.sequenceChannel)
                      ? leadSeqData.sequenceChannel
                      : item.channel;
                    return (
                      <div 
                        key={item.day || item.id || `timeline-${idx}`}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-all animate-fade-in-up ${
                          item.status === 'sent'
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-slate-700/50 border-slate-600'
                        }`}
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          item.status === 'sent'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-600 text-slate-400'
                        }`}>
                          {item.status === 'sent' ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Clock className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white">{item.label}</span>
                            {displayChannel && (
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                displayChannel === 'whatsapp' ? 'bg-emerald-500/20 text-emerald-400' :
                                displayChannel === 'email' ? 'bg-blue-500/20 text-blue-400' :
                                displayChannel === 'instagram' ? 'bg-pink-500/20 text-pink-400' :
                                'bg-slate-600 text-slate-400'
                              }`}>
                                {displayChannel}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 text-sm">{item.description}</p>
                          {item.message && (
                            <p className="text-slate-300 text-sm mt-2 p-2 bg-slate-800/50 rounded-lg">
                              "{item.message}"
                            </p>
                          )}
                        </div>
                        {item.status === 'sent' && item.sentAt && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Enviado
                          </span>
                        )}
                      </div>
                    );
                  })}
                  
                  {timeline.length === 0 && (
                    <div className="text-center py-8 text-slate-500 bg-slate-700/30 rounded-xl">
                      <Send className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No hay mensajes en la secuencia</p>
                      <p className="text-sm">Hacé clic en "Enviar Mensaje" para comenzar</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Contratos Section */}
            <div className="mt-6 pt-6 border-t border-slate-700">
              <LeadContractsHistory
                leadId={lead.id}
                onGenerateNew={() => setShowContractModal(true)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Send Followup Modal */}
      <SendFollowupModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        lead={lead}
        onSend={sendFollowUp}
      />

      {/* Chat Modal */}
      <ChatModal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        lead={lead}
        onMessageSent={(message) => {
          // Optionally refresh lead data or show notification
          console.log('Message sent:', message)
        }}
      />

      {/* Generate Contract Modal */}
      <GenerateContractModal
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        lead={lead}
        onContractGenerated={(doc) => {
          console.log('Contract generated:', doc)
          onUpdate?.()
        }}
      />
    </>
  )
}

// CSS Animations
const GlobalStyles = () => (
  <style>{`
    @keyframes fade-in-up {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes slide-in-right {
      from {
        opacity: 0;
        transform: translateX(100px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    @keyframes scale-in {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    @keyframes bounce-in {
      0% {
        transform: scale(0);
      }
      50% {
        transform: scale(1.2);
      }
      100% {
        transform: scale(1);
      }
    }
    
    @keyframes pulse-subtle {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.02);
      }
    }
    
    .animate-fade-in-up {
      animation: fade-in-up 0.5s ease-out forwards;
    }
    
    .animate-slide-in-right {
      animation: slide-in-right 0.5s ease-out forwards;
    }
    
    .animate-scale-in {
      animation: scale-in 0.3s ease-out forwards;
    }
    
    .animate-bounce-in {
      animation: bounce-in 0.5s ease-out forwards;
    }
    
    .animate-pulse-subtle {
      animation: pulse-subtle 2s ease-in-out infinite;
    }
  `}</style>
)

export default LeadsPage
