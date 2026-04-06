import { useState, useEffect } from 'react'
import { 
  Users, Building2, Send, TrendingUp, Clock, 
  CheckCircle2, MessageCircle, Mail, Phone, Instagram,
  ArrowUpRight, AlertCircle, Zap
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
  'Content-Type': 'application/json'
})

const Dashboard = ({ onNavigate }) => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const [leadsRes, propertiesRes] = await Promise.all([
        fetch(`${API_URL}/leads/stats/summary`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/properties`, { headers: getAuthHeaders() })
      ])
      
      if (leadsRes.ok) {
        const leadsStats = await leadsRes.json()
        const propertiesData = await propertiesRes.json()
        
        setStats({
          leads: leadsStats,
          properties: propertiesData.properties?.length || 0
        })
      }
    } catch (err) {
      console.error('Error loading stats:', err)
    } finally {
      setLoading(false)
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
    </div>
  )
}

export default Dashboard
