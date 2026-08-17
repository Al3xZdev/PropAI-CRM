import { useState, useEffect } from 'react'
import { DollarSign, Search, ChevronLeft, ChevronRight, Plus, X, Check, Edit2, AlertCircle, Filter, Trash2 } from 'lucide-react'
import { api } from '../../utils/api'

export default function CommissionsView({ user, agents = [] }) {
  const isAdmin = user?.role === 'admin' || user?.role === 'manager'
  const today = new Date()
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  const [activeTab, setActiveTab] = useState('resumen')
  const [month, setMonth] = useState(defaultMonth)
  const [summary, setSummary] = useState(null)
  const [detail, setDetail] = useState({ commissions: [], total: 0, page: 1, limit: 50 })
  const [configs, setConfigs] = useState([])
  const [agentFilter, setAgentFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ amount: '', notes: '', status: '' })
  const [saveMsg, setSaveMsg] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [leads, setLeads] = useState([])
  const [properties, setProperties] = useState([])

  // ---- Fetch Summary ----
  const fetchSummary = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/commissions?month=${month}`)
      if (res.ok) {
        const data = await res.json()
        setSummary(data)
      }
    } catch (err) {
      console.error('Error fetching summary:', err)
    } finally {
      setLoading(false)
    }
  }

  // ---- Fetch Detail ----
  const fetchDetail = async (page = 1) => {
    setLoading(true)
    try {
      let url = `/commissions/detail?month=${month}&page=${page}&limit=50`
      if (agentFilter) url += `&agentId=${agentFilter}`
      const res = await api.get(url)
      if (res.ok) {
        const data = await res.json()
        setDetail(data)
      }
    } catch (err) {
      console.error('Error fetching detail:', err)
    } finally {
      setLoading(false)
    }
  }

  // ---- Fetch Configs ----
  const fetchConfigs = async () => {
    try {
      const res = await api.get('/commissions/config')
      if (res.ok) {
        const data = await res.json()
        setConfigs(Array.isArray(data) ? data : data.configs || [])
      }
    } catch (err) {
      console.error('Error fetching configs:', err)
    }
  }

  // ---- Fetch Leads (for manual create) ----
  const fetchLeads = async () => {
    try {
      const res = await api.get('/leads')
      if (res.ok) {
        const data = await res.json()
        setLeads(data.leads || data || [])
      }
    } catch (err) {
      console.error('Error fetching leads:', err)
    }
  }

  // ---- Fetch Properties (for manual create) ----
  const fetchProperties = async () => {
    try {
      const res = await api.get('/properties')
      if (res.ok) {
        const data = await res.json()
        setProperties(data.properties || data || [])
      }
    } catch (err) {
      console.error('Error fetching properties:', err)
    }
  }

  // ---- Tab change ----
  useEffect(() => {
    if (activeTab === 'resumen') fetchSummary()
    else if (activeTab === 'detalle') fetchDetail()
    else if (activeTab === 'configuracion') fetchConfigs()
  }, [activeTab, month])

  // ---- Update config ----
  const handleUpdateConfig = async (agentId, percentage) => {
    try {
      const res = await api.put(`/commissions/config/${agentId}`, { percentage: Number(percentage) })
      if (res.ok) {
        setSaveMsg({ type: 'success', text: 'Configuración actualizada' })
        fetchConfigs()
      } else {
        const err = await res.json()
        setSaveMsg({ type: 'error', text: err.error || 'Error al actualizar' })
      }
    } catch (err) {
      setSaveMsg({ type: 'error', text: 'Error de conexión' })
    }
    setTimeout(() => setSaveMsg(null), 3000)
  }

  // ---- Delete config ----
  const handleDeleteConfig = async (agentId) => {
    setDeleting(true)
    try {
      const res = await api.delete(`/commissions/config/${agentId}`)
      if (res.ok) {
        setSaveMsg({ type: 'success', text: 'Configuración eliminada' })
        setDeleteTarget(null)
        fetchConfigs()
      } else {
        const err = await res.json()
        setSaveMsg({ type: 'error', text: err.error || 'Error al eliminar' })
      }
    } catch (err) {
      setSaveMsg({ type: 'error', text: 'Error de conexión' })
    }
    setDeleting(false)
    setTimeout(() => setSaveMsg(null), 3000)
  }

  // ---- Manual create ----
  const [manualForm, setManualForm] = useState({
    agentId: '', leadId: '', amount: '', percentage: '', propertyId: '', propertyTitle: '', propertyPrice: '', notes: ''
  })

  const handleManualCreate = async (e) => {
    e.preventDefault()
    try {
      const body = {
        agentId: manualForm.agentId,
        leadId: manualForm.leadId,
        amount: Number(manualForm.amount),
        ...(manualForm.propertyId && { propertyId: manualForm.propertyId }),
        ...(manualForm.percentage && { percentage: Number(manualForm.percentage) }),
        ...(manualForm.propertyTitle && { propertyTitle: manualForm.propertyTitle }),
        ...(manualForm.propertyPrice && { propertyPrice: Number(manualForm.propertyPrice) }),
        ...(manualForm.notes && { notes: manualForm.notes })
      }
      const res = await api.post('/commissions', body)
      if (res.ok) {
        setShowManualModal(false)
        setManualForm({ agentId: '', leadId: '', amount: '', percentage: '', propertyId: '', propertyTitle: '', propertyPrice: '', notes: '' })
        setSaveMsg({ type: 'success', text: 'Comisión creada' })
        fetchSummary()
      } else {
        const err = await res.json()
        setSaveMsg({ type: 'error', text: err.error || 'Error al crear' })
      }
    } catch (err) {
      setSaveMsg({ type: 'error', text: 'Error de conexión' })
    }
    setTimeout(() => setSaveMsg(null), 3000)
  }

  // ---- Inline edit ----
  const startEdit = (commission) => {
    setEditingId(commission.id)
    setEditForm({ amount: commission.amount, notes: commission.notes || '', status: commission.status })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ amount: '', notes: '', status: '' })
  }

  const saveEdit = async (id) => {
    try {
      const body = {
        amount: Number(editForm.amount),
        notes: editForm.notes,
        ...(editForm.status && { status: editForm.status })
      }
      const res = await api.put(`/commissions/${id}`, body)
      if (res.ok) {
        setSaveMsg({ type: 'success', text: 'Comisión actualizada' })
        setEditingId(null)
        fetchDetail(detail.page)
      } else {
        const err = await res.json()
        setSaveMsg({ type: 'error', text: err.error || 'Error al actualizar' })
      }
    } catch (err) {
      setSaveMsg({ type: 'error', text: 'Error de conexión' })
    }
    setTimeout(() => setSaveMsg(null), 3000)
  }

  // ---- Agents for filter dropdown ----
  const summaryAgents = summary?.agents || []

  // ---- Format helpers ----
  const fmt = (n) => {
    if (n === null || n === undefined) return '$0'
    return '$' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const statusBadge = (status) => {
    if (status === 'paid') return <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-medium">Pagada</span>
    return <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full text-xs font-medium">Pendiente</span>
  }

  const tabs = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'detalle', label: 'Detalle' },
    ...(isAdmin ? [{ id: 'configuracion', label: 'Configuración' }] : [])
  ]

  // ---- Open modal ----
  const openManualModal = () => {
    fetchLeads()
    fetchProperties()
    setShowManualModal(true)
  }

  // ===================== RENDER =====================
  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <label className="text-slate-400 text-sm">Mes:</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        {isAdmin && activeTab === 'resumen' && (
          <button
            onClick={openManualModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Crear comisión manual
          </button>
        )}
      </div>

      {/* Save message */}
      {saveMsg && (
        <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
          saveMsg.type === 'success' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30' :
          'bg-red-500/20 text-red-200 border border-red-500/30'
        }`}>
          {saveMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {saveMsg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-1.5 flex gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'resumen' && (
        <div className="space-y-6">
          {loading && <span className="text-slate-400 text-sm animate-pulse">Cargando...</span>}

          {summary ? (
            <>
              {/* Grand Total Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">Total Generado</p>
                  <p className="text-2xl font-bold text-white mt-1">{fmt(summary.totalGenerated)}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">Pendiente</p>
                  <p className="text-2xl font-bold text-amber-400 mt-1">{fmt(summary.totalPending)}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">Pagado</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">{fmt(summary.totalPaid)}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">Cierres</p>
                  <p className="text-2xl font-bold text-blue-400 mt-1">{summary.totalClosures || 0}</p>
                </div>
              </div>

              {/* Per-Agent Cards */}
              {summaryAgents.length === 0 ? (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                  <p className="text-slate-400">Sin comisiones para este mes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">Desglose por agente</h3>
                  {summaryAgents.map(agent => {
                    const pct = agent.total > 0 ? (agent.paid / agent.total) * 100 : 0
                    return (
                      <div key={agent.agentId} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-white font-medium">{agent.agentName}</p>
                            <p className="text-slate-400 text-sm">{agent.agentEmail}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-bold">{fmt(agent.total)}</p>
                            <p className="text-slate-400 text-xs">{agent.closures} cierres</p>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                          <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }}></div>
                        </div>
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Pendiente: {fmt(agent.pending)}</span>
                          <span>Pagado: {fmt(agent.paid)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : !loading ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
              <DollarSign className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400">Sin comisiones para este mes</p>
            </div>
          ) : null}
        </div>
      )}

      {activeTab === 'detalle' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-slate-400 text-sm">Mes:</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            {summaryAgents.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={agentFilter}
                  onChange={(e) => { setAgentFilter(e.target.value); fetchDetail(1) }}
                  className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Todos los agentes</option>
                  {summaryAgents.map(a => (
                    <option key={a.agentId} value={a.agentId}>{a.agentName}</option>
                  ))}
                </select>
              </div>
            )}
            {loading && <span className="text-slate-400 text-sm animate-pulse">Cargando...</span>}
          </div>

          {/* Table */}
          {detail.commissions.length === 0 && !loading ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
              <Search className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400">Sin comisiones para este mes</p>
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/80">
                      <th className="text-left px-4 py-3 text-slate-400 text-xs font-medium uppercase">Lead</th>
                      <th className="text-left px-4 py-3 text-slate-400 text-xs font-medium uppercase">Agente</th>
                      <th className="text-left px-4 py-3 text-slate-400 text-xs font-medium uppercase">Propiedad</th>
                      <th className="text-right px-4 py-3 text-slate-400 text-xs font-medium uppercase">Monto</th>
                      <th className="text-center px-4 py-3 text-slate-400 text-xs font-medium uppercase">%</th>
                      <th className="text-center px-4 py-3 text-slate-400 text-xs font-medium uppercase">Estado</th>
                      <th className="text-left px-4 py-3 text-slate-400 text-xs font-medium uppercase">Fecha</th>
                      {isAdmin && <th className="text-center px-4 py-3 text-slate-400 text-xs font-medium uppercase">Acción</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {detail.commissions.map(c => (
                      <tr key={c.id} className="hover:bg-slate-700/30 transition-colors">
                        {editingId === c.id ? (
                          <>
                            <td className="px-4 py-3 text-white text-sm">{c.leadName || '-'}</td>
                            <td className="px-4 py-3 text-slate-300 text-sm">{c.agentName || '-'}</td>
                            <td className="px-4 py-3 min-w-0"><PropertyCell commission={c} /></td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="0.01"
                                value={editForm.amount}
                                onChange={(e) => setEditForm(f => ({ ...f, amount: e.target.value }))}
                                className="w-28 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm text-right focus:outline-none focus:border-blue-500"
                                disabled={c.status === 'paid'}
                              />
                            </td>
                            <td className="px-4 py-3 text-center text-slate-300 text-sm">{c.percentage}%</td>
                            <td className="px-4 py-3 text-center">
                              <select
                                value={editForm.status}
                                onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}
                                className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs focus:outline-none focus:border-blue-500"
                              >
                                <option value="pending">Pendiente</option>
                                <option value="paid">Pagada</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-sm">
                              {new Date(c.createdAt).toLocaleDateString('es-AR')}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => saveEdit(c.id)} className="p-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition-colors">
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={cancelEdit} className="p-1.5 bg-slate-600 hover:bg-slate-500 rounded-lg text-white transition-colors">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-white text-sm">{c.leadName || '-'}</td>
                            <td className="px-4 py-3 text-slate-300 text-sm">{c.agentName || '-'}</td>
                            <td className="px-4 py-3 min-w-0"><PropertyCell commission={c} /></td>
                            <td className="px-4 py-3 text-right text-white text-sm font-medium">{fmt(c.amount)}</td>
                            <td className="px-4 py-3 text-center text-slate-300 text-sm">{c.percentage}%</td>
                            <td className="px-4 py-3 text-center">{statusBadge(c.status)}</td>
                            <td className="px-4 py-3 text-slate-400 text-sm">{new Date(c.createdAt).toLocaleDateString('es-AR')}</td>
                            {isAdmin && (
                              <td className="px-4 py-3 text-center">
                                <button onClick={() => startEdit(c)} className="p-1.5 bg-blue-600/20 hover:bg-blue-600/40 rounded-lg text-blue-400 transition-colors">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {detail.total > detail.limit && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
                  <p className="text-slate-400 text-sm">
                    {((detail.page - 1) * detail.limit) + 1}-{Math.min(detail.page * detail.limit, detail.total)} de {detail.total}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchDetail(detail.page - 1)}
                      disabled={detail.page <= 1}
                      className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => fetchDetail(detail.page + 1)}
                      disabled={detail.page * detail.limit >= detail.total}
                      className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'configuracion' && isAdmin && (
        <div className="space-y-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3">Configuración por agente</h3>
            {configs.length === 0 ? (
              <p className="text-slate-400 text-sm">No hay configuraciones. Asigna un porcentaje a cada agente.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left px-4 py-3 text-slate-400 text-xs font-medium uppercase">Agente</th>
                      <th className="text-left px-4 py-3 text-slate-400 text-xs font-medium uppercase">Email</th>
                      <th className="text-center px-4 py-3 text-slate-400 text-xs font-medium uppercase">Porcentaje</th>
                      <th className="text-center px-4 py-3 text-slate-400 text-xs font-medium uppercase">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {configs.map(cfg => (
                      <ConfigRow
                        key={cfg.id}
                        config={cfg}
                        onSave={handleUpdateConfig}
                        onDelete={(config) => setDeleteTarget(config)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* New config form */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3">Agregar configuración</h3>
            <NewConfigForm agents={agents} onCreated={fetchConfigs} />
          </div>
        </div>
      )}

      {/* Delete Config Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-3">¿Eliminar configuración?</h3>
            <p className="text-slate-300 text-sm mb-6">
              ¿Estás seguro de que deseas eliminar la configuración de{' '}
              <span className="text-white font-medium">{deleteTarget.agentName || deleteTarget.agent?.name || 'este agente'}</span>?
              Si el agente ya no pertenece a la empresa, se eliminará su porcentaje de comisión.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-xl text-white text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteConfig(deleteTarget.agentId)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl text-white text-sm font-medium transition-colors"
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Create Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Crear comisión manual</h3>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleManualCreate} className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm block mb-1">Agente *</label>
                <select
                  required
                  value={manualForm.agentId}
                  onChange={(e) => setManualForm(f => ({ ...f, agentId: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Seleccionar agente...</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">Propiedad (opcional)</label>
                <select
                  value={manualForm.propertyId}
                  onChange={(e) => {
                    const selectedId = e.target.value
                    if (!selectedId) {
                      setManualForm(f => ({ ...f, propertyId: '', propertyTitle: '', propertyPrice: '' }))
                      return
                    }
                    const prop = properties.find(p => p.id === selectedId)
                    setManualForm(f => ({
                      ...f,
                      propertyId: selectedId,
                      propertyTitle: prop?.title || '',
                      propertyPrice: prop?.price !== undefined && prop?.price !== null ? Number(prop.price) : ''
                    }))
                  }}
                  className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Sin propiedad</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.title}{p.price !== undefined && p.price !== null ? ` - ${p.price}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">Lead *</label>
                <select
                  required
                  value={manualForm.leadId}
                  onChange={(e) => setManualForm(f => ({ ...f, leadId: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Seleccionar lead...</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.name} {l.email ? `(${l.email})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-1">Monto *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={manualForm.amount}
                    onChange={(e) => setManualForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">Porcentaje</label>
                  <input
                    type="number"
                    step="0.1"
                    value={manualForm.percentage}
                    onChange={(e) => setManualForm(f => ({ ...f, percentage: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Ej: 5.0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-1">Título propiedad</label>
                  <input
                    type="text"
                    value={manualForm.propertyTitle}
                    onChange={(e) => setManualForm(f => ({ ...f, propertyTitle: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">Precio propiedad</label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualForm.propertyPrice}
                    onChange={(e) => setManualForm(f => ({ ...f, propertyPrice: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-300 text-sm block mb-1">Notas</label>
                <textarea
                  value={manualForm.notes}
                  onChange={(e) => setManualForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors">
                  Crear comisión
                </button>
                <button type="button" onClick={() => setShowManualModal(false)} className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ============ Sub-components ============

function PropertyCell({ commission }) {
  const title = commission?.propertyTitle || ''
  const note = commission?.notes || ''
  const truncatedNote = note.length > 60 ? note.slice(0, 60) + '…' : note

  if (!title && !note) return <span className="text-slate-300 text-sm">-</span>

  return (
    <div className="min-w-0">
      {title && <p className="text-slate-300 text-sm truncate">{title}</p>}
      {note && (
        <p className="text-slate-500 text-xs line-clamp-2 truncate mt-0.5" title={note}>
          {truncatedNote}
        </p>
      )}
    </div>
  )
}

function ConfigRow({ config, onSave, onDelete }) {
  const [pct, setPct] = useState(Number(config.percentage))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(config.agentId, pct)
    setSaving(false)
  }

  return (
    <tr className="hover:bg-slate-700/30 transition-colors">
      <td className="px-4 py-3 text-white text-sm">{config.agentName || config.agent?.name || '—'}</td>
      <td className="px-4 py-3 text-slate-300 text-sm">{config.agentEmail || config.agent?.email || '—'}</td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <input
            type="number"
            step="0.1"
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm text-center focus:outline-none focus:border-blue-500"
          />
          <span className="text-slate-400">%</span>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-white text-xs font-medium transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            onClick={() => onDelete(config)}
            className="px-4 py-1.5 bg-red-600/80 hover:bg-red-500 rounded-lg text-white text-xs font-medium transition-colors inline-flex items-center gap-1.5"
            title="Eliminar configuración"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  )
}

function NewConfigForm({ agents, onCreated }) {
  const [agentId, setAgentId] = useState('')
  const [percentage, setPercentage] = useState('3.0')
  const [msg, setMsg] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!agentId) return
    try {
      const res = await api.post('/commissions/config', { agentId, percentage: Number(percentage) })
      if (res.ok) {
        setAgentId('')
        setPercentage('3.0')
        setMsg({ type: 'success', text: 'Configuración creada' })
        onCreated()
      } else {
        const err = await res.json()
        setMsg({ type: 'error', text: err.error || 'Error' })
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Error de conexión' })
    }
    setTimeout(() => setMsg(null), 3000)
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex items-end gap-3">
      {msg && (
        <div className={`absolute top-0 right-0 p-3 rounded-xl text-sm ${
          msg.type === 'success' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-red-500/20 text-red-200'
        }`}>
          {msg.text}
        </div>
      )}
      <div className="flex-1">
        <label className="text-slate-400 text-xs block mb-1">Agente</label>
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">Seleccionar...</option>
          {agents.map(a => (
            <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
          ))}
        </select>
      </div>
      <div className="w-24">
        <label className="text-slate-400 text-xs block mb-1">Porcentaje</label>
        <input
          type="number"
          step="0.1"
          value={percentage}
          onChange={(e) => setPercentage(e.target.value)}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
        />
      </div>
      <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-sm font-medium transition-colors whitespace-nowrap">
        Agregar
      </button>
    </form>
  )
}
