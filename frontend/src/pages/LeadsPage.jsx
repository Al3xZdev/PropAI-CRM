import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Users, Search, Filter, Plus, Mail, Phone, MessageCircle,
  Instagram, Globe, ChevronRight, Clock, CheckCircle2,
  AlertCircle, MoreVertical, Trash2, Eye, X, ArrowRight,
  Loader2, Send, Rocket, Check, Facebook, Bell, Sparkles,
  Upload, FileText, CheckCircle, AlertTriangle, Download
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
  'Content-Type': 'application/json'
})

const LeadsPage = ({ onSelectLead, properties = [] }) => {
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

  useEffect(() => {
    loadLeads()
  }, [])

  useEffect(() => {
    filterLeads()
  }, [leads, searchTerm, filters])

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
    
    setFilteredLeads(filtered)
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
        from: last.from,
        to: last.to,
        changedAt: last.changedAt
      }
    }
    return null
  }

  const getStatusChangeLabel = (from, to) => {
    const labels = {
      nuevo: 'Nuevo',
      contactado: 'Contactado',
      respondio: 'Respondió',
      perdido: 'Perdido'
    }
    return `${labels[from] || from} → ${labels[to] || to}`
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
        await loadLeads()
        setShowCreateModal(false)
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
          <p className="text-slate-400 mt-1">{filteredLeads.length} leads encontrados</p>
        </div>
        <div className="flex gap-3">
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
          </div>
        </div>
      </div>

      {/* Leads List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Cargando leads...</div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400">No hay leads que coincidan con los filtros</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map(lead => {
            const statusBadge = getStatusBadge(lead.status)
            const StatusIcon = statusBadge.icon
            const lastChange = getLastStatusChange(lead)
            
            return (
              <div
                key={lead.id}
                onClick={() => openLeadDetail(lead)}
                className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
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
                    <p className="text-white font-medium capitalize">{lead.propertyInterest}</p>
                    {lead.propertyTitle && (
                      <p className="text-xs text-slate-500 truncate max-w-[150px]">{lead.propertyTitle}</p>
                    )}
                  </div>

                  {/* Date & Status Change */}
                  <div className="text-right">
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

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors flex-shrink-0" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Lead Detail Modal */}
      {showLeadModal && selectedLead && (
        <LeadDetailModal 
          lead={selectedLead} 
          onClose={() => setShowLeadModal(false)}
          onUpdate={loadLeads}
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

  const handleSubmit = (e) => {
    e.preventDefault()
    onCreate(formData)
  }

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
    { value: 'departamento', label: 'Departamento' },
    { value: 'terreno', label: 'Terreno' },
    { value: 'local', label: 'Local comercial' },
    { value: 'oficina', label: 'Oficina' },
    { value: 'bodega', label: 'Bodega' }
  ]

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
    
    setFile(selectedFile)
    const reader = new FileReader()
    reader.onload = (e) => {
      const { headers: parsedHeaders, data: parsedData } = parseCSV(e.target.result)
      setHeaders(parsedHeaders)
      setRawData(parsedData)
      setStep(2)
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
    const lead = {
      name: mapping.name ? row[mapping.name] || '' : '',
      email: mapping.email ? row[mapping.email] || '' : '',
      phone: mapping.phone ? row[mapping.phone] || '' : '',
      channel: mapping.channel ? row[mapping.channel]?.toLowerCase() || 'formulario' : 'formulario',
      propertyInterest: mapping.propertyInterest ? normalizePropertyType(row[mapping.propertyInterest]) : 'casa',
      propertyId: '',
      propertyTitle: mapping.propertyTitle ? row[mapping.propertyTitle] || '' : '',
      source: mapping.source ? row[mapping.source] || 'Importado' : 'Importado',
      notes: mapping.notes ? row[mapping.notes] || '' : ''
    }
    
    // Try to match property title with existing properties
    if (lead.propertyTitle && properties.length > 0) {
      const match = properties.find(p => 
        p.title.toLowerCase().includes(lead.propertyTitle.toLowerCase()) ||
        lead.propertyTitle.toLowerCase().includes(p.title.toLowerCase())
      )
      if (match) {
        lead.propertyId = match.id
      }
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
            headers: getAuthHeaders(),
            body: JSON.stringify(lead)
          })
          
          if (response.ok) {
            results.success++
          } else {
            results.errors.push(`Error importing: ${lead.name}`)
          }
        } catch (err) {
          results.errors.push(`Error: ${lead.name}`)
        }
      }
      
      setImportResult(results)
      onImport?.()
    } catch (err) {
      setImportResult({ success: 0, errors: ['Error general al importar'] })
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
                  onChange={(e) => handleFile(e.target.files[0])}
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
                  <CheckCircle className="w-4 h-4" />
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
                        <CheckCircle className="w-8 h-8 text-emerald-400" />
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
// COMPONENTE: Lead Detail Modal
// ==========================================
const LeadDetailModal = ({ lead, onClose, onUpdate }) => {
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')
  const [currentStatus, setCurrentStatus] = useState(lead.status)

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
        setToastMessage('Estado actualizado correctamente')
        setToastType('success')
        setShowToast(true)
      }
    } catch (err) {
      console.error('Error updating status:', err)
      setToastMessage('Error al actualizar estado')
      setToastType('error')
      setShowToast(true)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      nuevo: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Nuevo' },
      contactado: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Contactado' },
      respondio: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Respondió' },
      perdido: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Perdido' }
    }
    return badges[status] || badges.nuevo
  }

  const getStatusChangeLabel = (from, to) => {
    const labels = {
      nuevo: 'Nuevo',
      contactado: 'Contactado',
      respondio: 'Respondió',
      perdido: 'Perdido'
    }
    return `${labels[from] || from} → ${labels[to] || to}`
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
                <p className="text-white font-medium capitalize">{lead.propertyInterest}</p>
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
                {[
                  { value: 'nuevo', color: 'blue' },
                  { value: 'contactado', color: 'amber' },
                  { value: 'respondio', color: 'emerald' },
                  { value: 'perdido', color: 'red' }
                ].map(({ value, color }) => (
                  <button
                    key={value}
                    onClick={() => updateStatus(value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all hover:scale-105 ${
                      currentStatus === value
                        ? `bg-${color}-600 text-white`
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            {/* Status History */}
            {lead.statusHistory && lead.statusHistory.length > 0 && (
              <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <p className="text-slate-400 text-sm mb-3">Historial de Cambios</p>
                <div className="space-y-2">
                  {lead.statusHistory.slice().reverse().map((change, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <Clock className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">
                          {getStatusChangeLabel(change.from, change.to)}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {formatDateTime(change.changedAt)}
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
                <p className="text-white font-medium">Secuencia de Follow-up</p>
                <button
                  onClick={() => setShowSendModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium text-white transition-all hover:scale-105 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Enviar Mensaje
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                </div>
              ) : (
                <div className="space-y-3">
                  {timeline.map((item, idx) => (
                    <div 
                      key={item.day}
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
                          {item.channel && (
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              item.channel === 'whatsapp' ? 'bg-emerald-500/20 text-emerald-400' :
                              item.channel === 'email' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-slate-600 text-slate-400'
                            }`}>
                              {item.channel}
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
                  ))}
                  
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
