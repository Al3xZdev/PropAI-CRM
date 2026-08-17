import React, { useState, useEffect, useRef } from 'react'
import { Search, Upload, FileText, Download, Trash2, X, Share2, Eye, Folder, FolderPlus, LayoutGrid, List, Clock, AlertCircle, FileCheck, File, FileSignature, ChevronRight, ChevronDown, MoreVertical, Move } from 'lucide-react'
import { api } from '../utils/api'

const DOC_TYPES = [
  { value: 'contract_buy', label: 'Contrato de Compra-Venta' },
  { value: 'contract_rent', label: 'Contrato de Alquiler' },
  { value: 'contract_reserve', label: 'Reserva de Propiedad' },
  { value: 'id_front', label: 'Identificación (Frente)' },
  { value: 'id_back', label: 'Identificación (Dorso)' },
  { value: 'property_deed', label: 'Escritura de Propiedad' },
  { value: 'receipt', label: 'Comprobante de Pago' },
  { value: 'credit_doc', label: 'Documentación Crediticia' },
  { value: 'lead_file', label: 'Archivo del Lead' },
  { value: 'other', label: 'Otro' }
]

const DOC_STATUSES = [
  { value: 'draft', label: 'Borrador', color: 'gray' },
  { value: 'pending', label: 'Pendiente', color: 'yellow' },
  { value: 'signed', label: 'Firmado', color: 'green' },
  { value: 'expired', label: 'Vencido', color: 'red' },
  { value: 'rejected', label: 'Rechazado', color: 'orange' }
]

const TYPE_CONFIG = {
  contract_buy: { Icon: FileCheck, bg: 'bg-blue-500/20', color: 'text-blue-400' },
  contract_rent: { Icon: FileCheck, bg: 'bg-blue-500/20', color: 'text-blue-400' },
  contract_reserve: { Icon: FileCheck, bg: 'bg-blue-500/20', color: 'text-blue-400' },
  property_deed: { Icon: FileSignature, bg: 'bg-purple-500/20', color: 'text-purple-400' },
  id_front: { Icon: File, bg: 'bg-green-500/20', color: 'text-green-400' },
  id_back: { Icon: File, bg: 'bg-green-500/20', color: 'text-green-400' },
  receipt: { Icon: FileText, bg: 'bg-yellow-500/20', color: 'text-yellow-400' },
  credit_doc: { Icon: File, bg: 'bg-indigo-500/20', color: 'text-indigo-400' },
  lead_file: { Icon: File, bg: 'bg-cyan-500/20', color: 'text-cyan-400' },
  other: { Icon: File, bg: 'bg-slate-500/20', color: 'text-slate-400' }
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([])
  const [leads, setLeads] = useState([])
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [docToDelete, setDocToDelete] = useState(null)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({ leadId: '', propertyId: '', type: '', name: '', notes: '', folderId: '' })
  const [selectedFile, setSelectedFile] = useState(null)

  // === NUEVOS ESTADOS PARA SISTEMA DE CARPETAS TIPO GOOGLE DRIVE ===
  const [currentFolderId, setCurrentFolderId] = useState(null) // null = vista "Todos los documentos"
  const [folderPath, setFolderPath] = useState([]) // historial de navegación
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [docToMove, setDocToMove] = useState(null)
  const [folderMenuOpen, setFolderMenuOpen] = useState(null)
  const [foldersCollapsed, setFoldersCollapsed] = useState(false) // Colapsar carpetas del sidebar
  const [uncategorizedCollapsed, setUncategorizedCollapsed] = useState(false) // Colapsar "Sin carpeta"
  const [collapsedFolders, setCollapsedFolders] = useState({}) // Estado de collapse por carpeta

  // Estados de vista
  const [view, setView] = useState('grid')
  const [quickFilter, setQuickFilter] = useState(null)
  const [sortOrder, setSortOrder] = useState('newest')
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef(null)

  const stats = {
    total: documents.length,
    firmados: documents.filter(d => d.status === 'signed').length,
    pendientes: documents.filter(d => d.status === 'pending').length,
    borradores: documents.filter(d => d.status === 'draft').length
  }

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const [docsRes, leadsRes, foldersRes] = await Promise.all([
        api.get('/documents'),
        api.get('/leads?limit=1000'),
        api.get('/folders')
      ])
      
      if (docsRes.ok) {
        const data = await docsRes.json()
        setDocuments(Array.isArray(data) ? data : [])
      }
      if (leadsRes.ok) {
        const data = await leadsRes.json()
        setLeads(Array.isArray(data) ? data : data.leads || [])
      }
      if (foldersRes.ok) {
        const data = await foldersRes.json()
        setFolders(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Error loading:', err)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // === NAVEGACIÓN DE CARPETAS ===
  const enterFolder = (folder) => {
    // Verificar si la carpeta ya está en el path para evitar duplicados
    const existingIndex = folderPath.findIndex(f => f.id === folder.id)
    if (existingIndex !== -1) {
      // Si ya existe, navegar hasta esa posición (recortar path)
      const newPath = folderPath.slice(0, existingIndex + 1)
      setFolderPath(newPath)
      setCurrentFolderId(folder.id)
    } else {
      // Si no existe, agregar al final
      setCurrentFolderId(folder.id)
      setFolderPath(prev => [...prev, { id: folder.id, name: folder.name }])
    }
  }

  const navigateTo = (index) => {
    if (index === -1) {
      setCurrentFolderId(null)
      setFolderPath([])
    } else {
      const newPath = folderPath.slice(0, index + 1)
      setFolderPath(newPath)
      setCurrentFolderId(newPath[newPath.length - 1].id)
    }
  }

  // === DOCUMENTOS Y CARPETAS VISIBLES SEGÚN CARPETA ACTIVA ===
  const visibleDocuments = (() => {
    let docs = currentFolderId === null
      ? documents
      : documents.filter(d => d.folderId === currentFolderId)

    // Aplicar filtros de búsqueda, tipo y estado
    return docs.filter(d => {
      const searchMatch = !search || (d.name && d.name.toLowerCase().includes(search.toLowerCase())) || (d.lead && d.lead.name && d.lead.name.toLowerCase().includes(search.toLowerCase()))
      const typeMatch = !typeFilter || d.type === typeFilter
      const statusMatch = !statusFilter || d.status === statusFilter
      let quickMatch = true
      if (quickFilter === 'pending') quickMatch = d.status === 'pending'
      else if (quickFilter === 'expired') quickMatch = d.status === 'expired'
      return searchMatch && typeMatch && statusMatch && quickMatch
    })
  })()

  const visibleSubfolders = currentFolderId === null
    ? folders.filter(f => f.parentId === null)
    : folders.filter(f => f.parentId === currentFolderId)

  const sortedDocs = [...visibleDocuments].sort((a, b) => {
    const da = new Date(a.createdAt || 0).getTime()
    const db = new Date(b.createdAt || 0).getTime()
    return sortOrder === 'newest' ? db - da : da - db
  })

  // === CREAR CARPETA ===
  const createFolder = async () => {
    if (!newFolderName.trim()) return showToast('El nombre es obligatorio', 'error')
    try {
      const res = await api.post('/folders', { name: newFolderName.trim(), parentId: currentFolderId })
      if (!res.ok) throw new Error('Error al crear carpeta')
      const folder = await res.json()
      setFolders(prev => [...prev, folder])
      setNewFolderName('')
      setShowCreateFolderModal(false)
      showToast('Carpeta creada!')
    } catch (err) { showToast(err.message, 'error') }
  }

  // === ELIMINAR CARPETA ===
  const deleteFolder = async (folderId) => {
    try {
      await api.delete('/folders/' + folderId)
      setFolders(prev => prev.filter(f => f.id !== folderId))
      // Los documentos quedan con folderId: null
      setDocuments(prev => prev.map(d => d.folderId === folderId ? { ...d, folderId: null, folder: null } : d))
      // Si estábamos dentro de la carpeta eliminada, volver
      if (currentFolderId === folderId) { setCurrentFolderId(null); setFolderPath([]) }
      setFolderMenuOpen(null)
      showToast('Carpeta eliminada')
    } catch (err) { showToast(err.message, 'error') }
  }

  // === MOVER DOCUMENTO ===
  const moveDocument = async (targetFolderId) => {
    try {
      const res = await api.put('/documents/' + docToMove.id, { folderId: targetFolderId })
      if (!res.ok) throw new Error('Error al mover documento')
      const updated = await res.json()
      setDocuments(prev => prev.map(d => d.id === docToMove.id ? updated : d))
      setShowMoveModal(false)
      setDocToMove(null)
      showToast('Documento movido')
    } catch (err) { showToast(err.message, 'error') }
  }

  // === DRAG & DROP ===
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) { setSelectedFile(file); if (!uploadForm.name) setUploadForm(p => ({ ...p, name: file.name.replace(/\.[^/.]+$/, '') })) }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) { setSelectedFile(file); if (!uploadForm.name) setUploadForm(p => ({ ...p, name: file.name.replace(/\.[^/.]+$/, '') })) }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!uploadForm.leadId || !uploadForm.type || !selectedFile) return showToast('Completá: Lead, Tipo y Archivo', 'error')
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('leadId', uploadForm.leadId)
      if (uploadForm.propertyId) formData.append('propertyId', uploadForm.propertyId)
      formData.append('type', uploadForm.type)
      if (uploadForm.name) formData.append('name', uploadForm.name)
      if (uploadForm.notes) formData.append('notes', uploadForm.notes)
      formData.append('folderId', currentFolderId || '') // Asignar a carpeta actual
      formData.append('status', 'draft')

      const res = await api.upload('/documents', formData)
      if (!res.ok) throw new Error('Error al subir')
      const newDoc = await res.json()
      setDocuments(prev => [newDoc, ...prev])
      setShowUploadModal(false)
      setUploadForm({ leadId: '', propertyId: '', type: '', name: '', notes: '', folderId: '' })
      setSelectedFile(null)
      showToast('Documento subido!')
    } catch (err) { showToast(err.message, 'error') } 
    finally { setUploading(false) }
  }

  const openDeleteModal = (doc) => { setDocToDelete(doc); setShowDeleteModal(true) }
  const confirmDelete = async () => {
    try {
      const res = await api.delete('/documents/' + docToDelete.id)
      if (!res.ok) throw new Error('Error al eliminar')
      setDocuments(prev => prev.filter(d => d.id !== docToDelete.id))
      if (selectedDoc?.id === docToDelete.id) { setShowDetailModal(false); setSelectedDoc(null) }
      setShowDeleteModal(false); setDocToDelete(null)
      showToast('Documento eliminado')
    } catch (err) { showToast(err.message, 'error'); setShowDeleteModal(false); setDocToDelete(null) }
  }

  const handleStatusChange = async (docId, newStatus) => {
    try {
      const res = await api.put('/documents/' + docId, { status: newStatus })
      if (!res.ok) throw new Error('Error al actualizar')
      const updated = await res.json()
      setDocuments(prev => prev.map(d => d.id === docId ? updated : d))
      if (selectedDoc?.id === docId) setSelectedDoc(updated)
    } catch (err) { showToast(err.message, 'error') }
  }

  const handlePreview = (doc) => { setSelectedDoc(doc); setShowPreviewModal(true) }
  const handleDownload = async (doc) => {
    if (!doc.url) return showToast('No hay archivo', 'error')
    try { const res = await fetch(doc.url); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = doc.name || 'documento'; a.click(); URL.revokeObjectURL(url) } catch { window.open(doc.url, '_blank') }
  }
  const handleShare = async (doc) => { if (doc.url) try { await navigator.clipboard.writeText(doc.url); showToast('Link copiado!') } catch { showToast('Error', 'error') } }

  const getTypeLabel = (type) => DOC_TYPES.find(t => t.value === type)?.label || type || 'Otro'
  const getStatusBadge = (status) => {
    const s = DOC_STATUSES.find(st => st.value === status)
    if (!s) return null
    const colors = { gray: 'bg-slate-500/20 text-slate-400', yellow: 'bg-yellow-500/20 text-yellow-400', green: 'bg-green-500/20 text-green-400', red: 'bg-red-500/20 text-red-400', orange: 'bg-orange-500/20 text-orange-400' }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-mono uppercase ${colors[s.color]}`}>{s.label}</span>
  }
  const getDocIcon = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.other

  // Render folder tree in sidebar (recursive con collapse)
  const renderFolderTree = (parentId = null, depth = 0) => {
    return folders
      .filter(f => f.parentId === parentId)
      .map(folder => {
        const hasChildren = folders.some(f => f.parentId === folder.id)
        const isCollapsed = collapsedFolders[folder.id]
        
        return (
          <div key={folder.id} className="relative">
            <div
              className={`flex items-center gap-1 py-2 px-3 rounded-lg cursor-pointer transition-colors ${currentFolderId === folder.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}
              style={{ paddingLeft: `${12 + depth * 16}px` }}
            >
              {/* Toggle para subcarpetas */}
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCollapsedFolders(prev => ({ ...prev, [folder.id]: !prev[folder.id] }))
                  }}
                  className="p-0.5 hover:bg-slate-600 rounded"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  )}
                </button>
              ) : (
                <span className="w-4"></span>
              )}
              <Folder 
                className="w-4 h-4 flex-shrink-0 cursor-pointer" 
                style={{ color: folder.color || '#3B82F6' }}
                onClick={() => enterFolder(folder)}
              />
              <span className="flex-1 truncate text-sm cursor-pointer" onClick={() => enterFolder(folder)}>{folder.name}</span>
              <span className="text-xs text-slate-500 font-mono">{documents.filter(d => d.folderId === folder.id).length}</span>
            </div>
            {/* Renderizar hijos solo si no está colapsado */}
            {!isCollapsed && hasChildren && renderFolderTree(folder.id, depth + 1)}
          </div>
        )
      })
  }

  const renderCard = (doc) => {
    const { Icon, bg, color } = getDocIcon(doc.type)
    return (
      <div key={doc.id} onClick={() => { setSelectedDoc(doc); setShowDetailModal(true) }} className="bg-slate-800 border border-slate-700 p-4 rounded-xl cursor-pointer hover:-translate-y-0.5 hover:border-blue-500 transition-all">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}><Icon className={`w-5 h-5 ${color}`} /></div>
          {getStatusBadge(doc.status)}
        </div>
        <h3 className="font-medium text-white text-sm mb-2 line-clamp-2">{doc.name || doc.filename || 'Sin nombre'}</h3>
        <div className="space-y-1 text-xs text-slate-500 mb-3">
          {doc.lead && <p>👤 {doc.lead.name}</p>}
          <p>📅 {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('es-AR') : ''}</p>
          {doc.folder && <p className="text-blue-400">📁 {doc.folder.name}</p>}
        </div>
        <div className="flex items-center gap-2 pt-3 border-t border-slate-700">
          <button onClick={(e) => { e.stopPropagation(); handlePreview(doc) }} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"><Eye className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); handleDownload(doc) }} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"><Download className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); handleShare(doc) }} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"><Share2 className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); setDocToMove(doc); setShowMoveModal(true) }} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded" title="Mover"><Move className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); openDeleteModal(doc) }} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded ml-auto"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    )
  }

  const renderListItem = (doc) => {
    const { Icon, bg, color } = getDocIcon(doc.type)
    return (
      <div key={doc.id} onClick={() => { setSelectedDoc(doc); setShowDetailModal(true) }} className="flex items-center gap-4 p-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg cursor-pointer">
        <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}><Icon className={`w-4 h-4 ${color}`} /></div>
        <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{doc.name || doc.filename || 'Sin nombre'}</p></div>
        <div className="shrink-0">{getStatusBadge(doc.status)}</div>
        <div className="text-xs text-slate-500 shrink-0">{doc.lead?.name}{doc.lead && doc.createdAt && ' · '}{doc.createdAt && new Date(doc.createdAt).toLocaleDateString('es-AR')}</div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); handlePreview(doc) }} className="p-1.5 text-slate-400 hover:text-white rounded"><Eye className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); handleDownload(doc) }} className="p-1.5 text-slate-400 hover:text-white rounded"><Download className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); setDocToMove(doc); setShowMoveModal(true) }} className="p-1.5 text-slate-400 hover:text-white rounded"><Move className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); openDeleteModal(doc) }} className="p-1.5 text-slate-400 hover:text-red-400 rounded"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    )
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-white">Documentos</h1><p className="text-slate-400 mt-1">{documents.length} documentos almacenados</p></div>
        <button onClick={() => { setUploadForm({ leadId: '', propertyId: '', type: '', name: '', notes: '', folderId: '' }); setShowUploadModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium"><Upload className="w-5 h-5" />Subir documento</button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white" /></div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white"><option value="">Todos los tipos</option>{DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white"><option value="">Todos los estados</option>{DOC_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
        <button onClick={() => setQuickFilter(quickFilter === 'pending' ? null : 'pending')} className={`px-3 py-1.5 rounded-lg text-sm ${quickFilter === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-400'}`}><Clock className="w-4 h-4" /> Pendientes</button>
        <button onClick={() => setQuickFilter(quickFilter === 'expired' ? null : 'expired')} className={`px-3 py-1.5 rounded-lg text-sm ${quickFilter === 'expired' ? 'bg-red-500/20 text-red-400' : 'bg-slate-700/50 text-slate-400'}`}><AlertCircle className="w-4 h-4" /> Vencidos</button>
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm"><option value="newest">Más recientes</option><option value="oldest">Más viejos</option></select>
        <div className="flex items-center gap-1 bg-slate-700/50 p-1 rounded-lg">
          <button onClick={() => setView('grid')} className={`p-2 rounded-md ${view === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}><LayoutGrid className="w-4 h-4" /></button>
          <button onClick={() => setView('list')} className={`p-2 rounded-md ${view === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}><List className="w-4 h-4" /></button>
        </div>
      </div>

      {/* === BREADCRUMB === */}
      {folderPath.length > 0 && (
        <div className="flex items-center gap-1 px-4 py-2 text-sm bg-slate-800/50 rounded-lg border border-slate-700">
          <span className="text-blue-400 hover:text-blue-300 cursor-pointer" onClick={() => navigateTo(-1)}>Todos los documentos</span>
          {folderPath.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <ChevronRight className="w-4 h-4 text-slate-500" />
              <span className={`cursor-pointer ${index === folderPath.length - 1 ? 'text-white font-medium' : 'text-blue-400 hover:text-blue-300'}`} onClick={() => navigateTo(index)}>{folder.name}</span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* === SIDEBAR + MAIN CONTENT === */}
      <div className="flex gap-6">
        {/* Sidebar - Árbol de carpetas */}
        <div className="w-64 shrink-0 bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase">Carpetas</h3>
            <button onClick={() => setShowCreateFolderModal(true)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Nueva carpeta"><FolderPlus className="w-4 h-4" /></button>
          </div>
          
          {/* Todos los documentos */}
          <div onClick={() => navigateTo(-1)} className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer mb-2 ${currentFolderId === null ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}>
            <Folder className="w-4 h-4" />
            <span className="flex-1 text-sm">Todos los documentos</span>
            <span className="text-xs text-slate-500">{documents.length}</span>
          </div>
          
          {/* Sin carpeta - con collapse */}
          <div className="mb-2">
            <div 
              onClick={() => setUncategorizedCollapsed(!uncategorizedCollapsed)}
              className="flex items-center gap-2 py-2 px-3 rounded-lg text-slate-300 hover:bg-slate-700/50 cursor-pointer text-sm"
            >
              {uncategorizedCollapsed ? (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
              <Folder className="w-4 h-4 text-slate-500" />
              <span className="flex-1">Sin carpeta</span>
              <span className="text-xs text-slate-500">{documents.filter(d => !d.folderId).length}</span>
            </div>
            {!uncategorizedCollapsed && (
              <div className="ml-6 space-y-1">
                {documents.filter(d => !d.folderId).slice(0, 5).map(doc => (
                  <div key={doc.id} onClick={() => { setSelectedDoc(doc); setShowDetailModal(true) }} className="flex items-center gap-2 py-1.5 px-2 rounded text-xs text-slate-400 hover:bg-slate-700/50 cursor-pointer">
                    <FileText className="w-3 h-3" />
                    <span className="truncate">{doc.name || doc.filename}</span>
                  </div>
                ))}
                {documents.filter(d => !d.folderId).length > 5 && (
                  <p className="text-xs text-slate-500 pl-2">+ {documents.filter(d => !d.folderId).length - 5} más</p>
                )}
                {documents.filter(d => !d.folderId).length === 0 && (
                  <p className="text-xs text-slate-500 pl-2">Sin documentos</p>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-slate-700/50 mb-2"></div>

          {/* Árbol de carpetas - con collapse */}
          <div className="mb-2">
            <div 
              onClick={() => setFoldersCollapsed(!foldersCollapsed)}
              className="flex items-center gap-2 py-2 px-3 rounded-lg text-slate-300 hover:bg-slate-700/50 cursor-pointer text-sm"
            >
              {foldersCollapsed ? (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
              <Folder className="w-4 h-4 text-yellow-500" />
              <span className="flex-1">Carpetas</span>
              <span className="text-xs text-slate-500">{folders.length}</span>
            </div>
            {!foldersCollapsed && (
              <div className="ml-1">
                {renderFolderTree(null, 0)}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-slate-400"></div><span className="text-xs text-slate-400">Total</span></div><p className="text-3xl font-bold text-white">{stats.total}</p></div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-green-400"></div><span className="text-xs text-green-400">Firmados</span></div><p className="text-3xl font-bold text-green-400">{stats.firmados}</p></div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-amber-400"></div><span className="text-xs text-amber-400">Pendientes</span></div><p className="text-3xl font-bold text-amber-400">{stats.pendientes}</p></div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-slate-500"></div><span className="text-xs text-slate-400">Borradores</span></div><p className="text-3xl font-bold text-slate-400">{stats.borradores}</p></div>
          </div>

          {/* Filtro activo */}
          {(search || typeFilter || statusFilter || quickFilter) && (
            <div className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg px-4 py-2">
              <p className="text-sm text-slate-400">Mostrando <span className="text-white font-medium">{sortedDocs.length}</span> documentos</p>
              <button onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); setQuickFilter(null) }} className="text-sm text-blue-400">Limpiar</button>
            </div>
          )}

          {/* === SUBCARPETAS === */}
          {visibleSubfolders.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Carpetas ({visibleSubfolders.length})</p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                {visibleSubfolders.map(folder => (
                  <div key={folder.id} onClick={() => enterFolder(folder)} className="bg-slate-800 border border-slate-700 p-4 rounded-xl cursor-pointer hover:border-blue-500 group relative">
                    <div className="flex items-start justify-between mb-2">
                      <Folder className="w-10 h-10 text-yellow-500" />
                      <button onClick={(e) => { e.stopPropagation(); setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id) }} className="p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-700 rounded">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm font-medium truncate">{folder.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{documents.filter(d => d.folderId === folder.id).length} archivos</p>
                    
                    {/* Menú carpeta */}
                    {folderMenuOpen === folder.id && (
                      <div className="absolute right-2 top-10 z-10 bg-slate-800 border border-slate-600 rounded-lg py-1 min-w-32 shadow-lg">
                        <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700" onClick={() => { enterFolder(folder); setFolderMenuOpen(null) }}>Abrir</button>
                        <button className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-700" onClick={() => deleteFolder(folder.id)}>Eliminar</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === DOCUMENTOS === */}
          {sortedDocs.length === 0 && visibleSubfolders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Folder className="w-14 h-14 text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No hay documentos</h3>
              <p className="text-slate-400 mb-6">Esta carpeta está vacía.</p>
              <button onClick={() => setShowUploadModal(true)} className="px-6 py-3 bg-blue-600 rounded-xl font-medium text-white">Subir Documento</button>
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">{sortedDocs.map(renderCard)}</div>
          ) : (
            <div className="space-y-1">{sortedDocs.map(renderListItem)}</div>
          )}
        </div>
      </div>

      {/* === MODAL CREAR CARPETA === */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateFolderModal(false)}>
          <div className="bg-slate-800 border border-slate-600 p-6 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-1">Nueva carpeta</h3>
            {currentFolderId && <p className="text-sm text-slate-400 mb-4">Dentro de: <span className="text-white">{folderPath[folderPath.length-1]?.name}</span></p>}
            <input className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white mb-4 outline-none focus:border-blue-500" placeholder="Nombre de la carpeta" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createFolder()} autoFocus />
            <div className="flex gap-2">
              <button className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm" onClick={() => { setShowCreateFolderModal(false); setNewFolderName('') }}>Cancelar</button>
              <button className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium" onClick={createFolder}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL MOVER DOCUMENTO === */}
      {showMoveModal && docToMove && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-600 p-6 rounded-2xl w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-1">Mover documento</h3>
            <p className="text-sm text-slate-400 mb-4 truncate">{docToMove.name}</p>
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
              <button className="text-left px-3 py-2 rounded hover:bg-slate-700 text-sm flex items-center gap-2" onClick={() => moveDocument(null)}>
                <Folder className="w-4 h-4 text-slate-400" />Sin carpeta (raíz)
              </button>
              {currentFolderId && (
                <button className="text-left px-3 py-2 rounded hover:bg-slate-700 text-sm flex items-center gap-2" onClick={() => navigateTo(-1)}>
                  <Folder className="w-4 h-4 text-slate-400" />Subir nivel
                </button>
              )}
              {folders.map(folder => (
                <button key={folder.id} className={`text-left px-3 py-2 rounded hover:bg-slate-700 text-sm flex items-center gap-2 ${docToMove.folderId === folder.id ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => folder.id !== docToMove.folderId && moveDocument(folder.id)} disabled={docToMove.folderId === folder.id}>
                  <Folder className="w-4 h-4 text-yellow-500" style={{color: folder.color}} />
                  {folder.name}
                  {docToMove.folderId === folder.id && <span className="text-xs text-slate-500 ml-auto">actual</span>}
                </button>
              ))}
            </div>
            <button className="mt-4 w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm" onClick={() => { setShowMoveModal(false); setDocToMove(null) }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* === RESTO DE MODALES (Upload, Detail, Preview, Delete) === */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => !uploading && setShowUploadModal(false)}>
          <div className="bg-slate-800 border border-slate-600 p-6 rounded-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-white">Subir Documento</h2><button onClick={() => { setShowUploadModal(false); setUploadForm({ leadId: '', propertyId: '', type: '', name: '', notes: '', folderId: '' }); setSelectedFile(null) }} className="text-slate-400"><X className="w-6 h-6" /></button></div>
            <div onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer mb-6 ${isDragging ? 'border-blue-500 bg-blue-500/10' : selectedFile ? 'border-green-500' : 'border-slate-600 hover:border-blue-500'}`}>
              <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx" />
              {selectedFile ? <div className="flex items-center justify-center gap-3"><FileText className="w-8 h-8 text-green-400" /><div className="text-left"><p className="text-white">{selectedFile.name}</p><p className="text-sm text-slate-400">{(selectedFile.size/1024).toFixed(1)} KB</p></div><button onClick={(e) => { e.stopPropagation(); setSelectedFile(null) }} className="text-slate-400"><X className="w-5 h-5" /></button></div> : <div className="text-slate-400"><Upload className="w-8 h-8 mx-auto mb-2" /><p>Arrastrá o elegí archivo</p></div>}
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div><label className="block text-sm text-slate-300 mb-2">Nombre</label><input type="text" value={uploadForm.name} onChange={e => setUploadForm(p => ({...p, name: e.target.value}))} className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white" /></div>
              <div><label className="block text-sm text-slate-300 mb-2">Lead *</label><select value={uploadForm.leadId} onChange={e => setUploadForm(p => ({...p, leadId: e.target.value, folderId: ''}))} className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white" required><option value="">Seleccionar...</option>{leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
              <div><label className="block text-sm text-slate-300 mb-2">Tipo *</label><select value={uploadForm.type} onChange={e => setUploadForm(p => ({...p, type: e.target.value}))} className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white" required><option value="">Seleccionar...</option>{DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              <div className="flex gap-3"><button type="button" onClick={() => { setShowUploadModal(false); setUploadForm({ leadId: '', propertyId: '', type: '', name: '', notes: '', folderId: '' }); setSelectedFile(null) }} className="flex-1 py-3 bg-slate-700 rounded-xl text-white">Cancelar</button><button type="submit" disabled={uploading || !selectedFile || !uploadForm.leadId || !uploadForm.type} className="flex-1 py-3 bg-blue-600 disabled:bg-slate-600 rounded-xl text-white">{uploading ? 'Subiendo...' : 'Subir'}</button></div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
          <div className="bg-slate-800 border border-slate-600 p-6 rounded-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-white">Detalles</h2><button onClick={() => { setShowDetailModal(false); setSelectedDoc(null) }} className="text-slate-400"><X className="w-6 h-6" /></button></div>
            <div className="space-y-4">
              <div><p className="text-sm text-slate-400">Nombre</p><p className="text-white">{selectedDoc.name || selectedDoc.filename}</p></div>
              <div><p className="text-sm text-slate-400">Tipo</p><p className="text-white">{getTypeLabel(selectedDoc.type)}</p></div>
              <div><p className="text-sm text-slate-400">Estado</p><div className="flex gap-2 mt-1">{DOC_STATUSES.map(s => <button key={s.value} onClick={() => handleStatusChange(selectedDoc.id, s.value)} className={`px-3 py-1 rounded-lg text-xs ${selectedDoc.status === s.value ? (s.color==='gray'?'bg-gray-500':s.color==='yellow'?'bg-yellow-500':s.color==='green'?'bg-green-500':s.color==='red'?'bg-red-500':'bg-orange-500')+' text-white' : 'bg-slate-700 text-slate-400'}`}>{s.label}</button>)}</div></div>
              {selectedDoc.lead && <div><p className="text-sm text-slate-400">Lead</p><p className="text-white">{selectedDoc.lead.name}</p></div>}
              <div className="flex gap-2 pt-4 border-t border-slate-700">
                {selectedDoc.url && <><button onClick={() => handlePreview(selectedDoc)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-white text-sm"><Eye className="w-4 h-4" />Ver</button><button onClick={() => handleDownload(selectedDoc)} className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg text-white text-sm"><Download className="w-4 h-4" /></button><button onClick={() => handleShare(selectedDoc)} className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg text-white text-sm"><Share2 className="w-4 h-4" /></button></>}
                <button onClick={() => { setDocToMove(selectedDoc); setShowDetailModal(false); setShowMoveModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg text-white text-sm"><Move className="w-4 h-4" />Mover</button>
                <button onClick={() => openDeleteModal(selectedDoc)} className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm ml-auto"><Trash2 className="w-4 h-4" />Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPreviewModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-600 w-full max-w-4xl h-[80vh] rounded-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-700"><h2 className="text-xl font-bold text-white">{selectedDoc.name}</h2><button onClick={() => setShowPreviewModal(false)} className="text-slate-400"><X className="w-6 h-6" /></button></div>
            <div className="flex-1 bg-slate-800">{selectedDoc.url ? (
              selectedDoc.mimeType && selectedDoc.mimeType.startsWith('image/') ? (
                <img src={selectedDoc.url} alt={selectedDoc.name || 'Documento'} className="w-full h-full object-contain" />
              ) : (
                <iframe src={'https://docs.google.com/viewer?url='+encodeURIComponent(selectedDoc.url)+'&embedded=true'} className="w-full h-full" title={selectedDoc.name || 'Vista previa'} />
              )
            ) : <div className="flex items-center justify-center h-full text-slate-400">Sin vista previa</div>}</div>
          </div>
        </div>
      )}

      {showDeleteModal && docToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-600 p-6 rounded-2xl w-full max-w-md text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-8 h-8 text-red-400" /></div>
            <h3 className="text-xl font-bold text-white mb-2">Eliminar documento</h3>
            <p className="text-slate-400 mb-6">¿Eliminar <span className="text-white">{docToDelete.name}</span>?</p>
            <div className="flex gap-3"><button onClick={() => { setShowDeleteModal(false); setDocToDelete(null) }} className="flex-1 py-3 bg-slate-700 rounded-xl text-white">Cancelar</button><button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 rounded-xl text-white">Eliminar</button></div>
          </div>
        </div>
      )}

      {toast && <div className={`fixed top-4 right-4 z-50 px-6 py-3 ${toast.type==='error'?'bg-red-500':'bg-green-500'} text-white rounded-xl`}>{toast.message}</div>}
    </div>
  )
}