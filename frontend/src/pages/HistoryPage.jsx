import { useState, useEffect } from 'react'
import { 
  History, Instagram, Facebook, Music, Globe, Twitter,
  Calendar, Clock, Building2, CheckCircle2, Filter
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
  'Content-Type': 'application/json'
})

const HistoryPage = () => {
  const [publications, setPublications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadPublications()
  }, [])

  const loadPublications = async () => {
    try {
      const response = await fetch(`${API_URL}/schedule/history`, { headers: getAuthHeaders() })
      if (response.ok) {
        const data = await response.json()
        setPublications(data.publications || [])
      }
    } catch (err) {
      console.error('Error loading publications:', err)
    } finally {
      setLoading(false)
    }
  }

  const getPlatformIcon = (platform) => {
    const icons = {
      instagram: <Instagram className="w-5 h-5" />,
      facebook: <Facebook className="w-5 h-5" />,
      tiktok: <Music className="w-5 h-5" />,
      twitter: <Twitter className="w-5 h-5" />,
      portal: <Globe className="w-5 h-5" />
    }
    return icons[platform] || <Globe className="w-5 h-5" />
  }

  const getPlatformColor = (platform) => {
    const colors = {
      instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
      facebook: 'bg-blue-600',
      tiktok: 'bg-black',
      twitter: 'bg-slate-700',
      portal: 'bg-emerald-600'
    }
    return colors[platform] || 'bg-slate-600'
  }

  const getPlatformName = (platform) => {
    const names = {
      instagram: 'Instagram',
      facebook: 'Facebook',
      tiktok: 'TikTok',
      twitter: 'Twitter/X',
      portal: 'Portal'
    }
    return names[platform] || platform
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now - date) / (1000 * 60 * 60))
    
    if (diff < 1) return 'Hace menos de 1 hora'
    if (diff === 1) return 'Hace 1 hora'
    if (diff < 24) return `Hace ${diff} horas`
    
    const days = Math.floor(diff / 24)
    if (days === 1) return 'Ayer'
    if (days < 7) return `Hace ${days} días`
    
    return formatDate(dateString)
  }

  const filteredPublications = filter === 'all' 
    ? publications 
    : publications.filter(p => p.platform === filter)

  // Group by date
  const groupedPublications = filteredPublications.reduce((groups, pub) => {
    const date = new Date(pub.publishedAt).toDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(pub)
    return groups
  }, {})

  const platforms = ['instagram', 'facebook', 'tiktok', 'twitter', 'portal']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Historial de Publicaciones</h1>
          <p className="text-slate-400 mt-1">
            {publications.length} publicaciones realizadas
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {platforms.map(platform => {
          const count = publications.filter(p => p.platform === platform).length
          return (
            <div 
              key={platform}
              onClick={() => setFilter(filter === platform ? 'all' : platform)}
              className={`bg-slate-800/50 rounded-xl p-4 border cursor-pointer transition-all ${
                filter === platform 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg ${getPlatformColor(platform)} flex items-center justify-center text-white mb-3`}>
                {getPlatformIcon(platform)}
              </div>
              <h3 className="text-2xl font-bold text-white">{count}</h3>
              <p className="text-slate-400 text-sm">{getPlatformName(platform)}</p>
            </div>
          )
        })}
      </div>

      {/* Filter */}
      {filter !== 'all' && (
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">Filtrando por:</span>
          <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 ${getPlatformColor(filter)} text-white`}>
            {getPlatformIcon(filter)}
            {getPlatformName(filter)}
          </span>
          <button
            onClick={() => setFilter('all')}
            className="text-slate-400 hover:text-white text-sm"
          >
            Limpiar filtro
          </button>
        </div>
      )}

      {/* Publications List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Cargando publicaciones...</div>
      ) : filteredPublications.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <History className="w-16 h-16 mx-auto mb-4 text-slate-600" />
          <h3 className="text-xl font-semibold text-white mb-2">No hay publicaciones</h3>
          <p className="text-slate-400">
            Las publicaciones que realices aparecerán aquí con su historial completo.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedPublications).map(([date, pubs]) => (
            <div key={date}>
              {/* Date Header */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">{getTimeAgo(date)}</span>
                </div>
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-slate-500 text-sm">{pubs.length} publicación(es)</span>
              </div>

              {/* Publications */}
              <div className="space-y-3">
                {pubs.map(pub => (
                  <div 
                    key={pub.id}
                    className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700 hover:border-slate-600 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      {/* Platform Icon */}
                      <div className={`w-12 h-12 rounded-xl ${getPlatformColor(pub.platform)} flex items-center justify-center text-white flex-shrink-0`}>
                        {getPlatformIcon(pub.platform)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-white">{pub.postTitle}</h4>
                          <span className={`px-2 py-0.5 rounded text-xs text-white ${getPlatformColor(pub.platform)}`}>
                            {getPlatformName(pub.platform)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {pub.propertyTitle}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDate(pub.publishedAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300 capitalize">
                            Tipo: {pub.postType?.replace('_', ' ')}
                          </span>
                          <span className="flex items-center gap-1 text-emerald-400 text-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            Publicado
                          </span>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          Exitoso
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default HistoryPage
