import { useState, useMemo, useEffect } from 'react'
import { Calendar, LayoutGrid, List, ChevronLeft, ChevronRight, Clock, MapPin, CheckCircle2, Play, AlertCircle, GripVertical, X, Plus, Filter } from 'lucide-react'
import PostDetailModal from './PostDetailModal'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
  'Content-Type': 'application/json'
})

const TYPE_CONFIG = {
  just_listed: {
    icon: '🏠',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    label: 'Fotos + Just Listed'
  },
  video_reel: {
    icon: '🎬',
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-500/20',
    textColor: 'text-pink-400',
    label: 'Video / Reel'
  },
  open_house: {
    icon: '📅',
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    label: 'Open House'
  },
  price_update: {
    icon: '💰',
    color: 'from-emerald-500 to-green-500',
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-400',
    label: 'Actualización de Precio'
  }
}

const PLATFORM_CONFIG = {
  instagram: { icon: '📸', name: 'Instagram', bgColor: 'bg-pink-500/20', textColor: 'text-pink-400' },
  facebook: { icon: '📘', name: 'Facebook', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
  tiktok: { icon: '🎵', name: 'TikTok', bgColor: 'bg-gray-500/20', textColor: 'text-gray-400' },
  twitter: { icon: '🐦', name: 'Twitter/X', bgColor: 'bg-slate-500/20', textColor: 'text-slate-400' },
  portal: { icon: '🌐', name: 'Portales', bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-400' }
}

// Format helpers
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-MX', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

const formatFullDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

const getDaysUntil = (dateString) => {
  const target = new Date(dateString)
  const now = new Date()
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
  return diff
}

const getStatusBadge = (status) => {
  switch (status) {
    case 'published':
      return { label: 'Publicado', className: 'bg-green-500/20 text-green-400' }
    case 'scheduled':
      return { label: 'Programado', className: 'bg-blue-500/20 text-blue-400' }
    case 'cancelled':
      return { label: 'Cancelado', className: 'bg-red-500/20 text-red-400' }
    default:
      return { label: 'Pendiente', className: 'bg-slate-500/20 text-slate-400' }
  }
}

// ==========================================
// VISTA 1: CALENDARIO (Google Calendar style)
// ==========================================
const CalendarView = ({ posts, onPublish, onPostClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
  
  const monthName = currentDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
  
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }
  
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }
  
  const goToToday = () => {
    setCurrentDate(new Date())
  }
  
  // Group posts by date
  const postsByDate = useMemo(() => {
    const grouped = {}
    posts.forEach(post => {
      const date = new Date(post.scheduledDate).toDateString()
      if (!grouped[date]) grouped[date] = []
      grouped[date].push(post)
    })
    return grouped
  }, [posts])
  
  // Generate calendar days
  const calendarDays = []
  
  // Padding for first day
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null)
  }
  
  // Days of month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i)
  }
  
  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  
  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-semibold text-white capitalize">{monthName}</h3>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
          >
            Hoy
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700">
        {/* Week days header */}
        <div className="grid grid-cols-7 border-b border-slate-700">
          {weekDays.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-slate-400">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const date = day ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day) : null
            const dateKey = date?.toDateString()
            const dayPosts = dateKey ? postsByDate[dateKey] || [] : []
            const isToday = date?.toDateString() === new Date().toDateString()
            const isPast = date && date < new Date(new Date().setHours(0,0,0,0))
            
            return (
              <div
                key={index}
                className={`min-h-32 p-2 border-b border-r border-slate-700/50 ${
                  !day ? 'bg-slate-900/30' : isPast ? 'bg-slate-900/20' : ''
                }`}
              >
                {day && (
                  <>
                    <div className={`text-sm font-medium mb-1 ${
                      isToday 
                        ? 'w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center' 
                        : isPast 
                          ? 'text-slate-500' 
                          : 'text-slate-300'
                    }`}>
                      {day}
                    </div>
                    
                    {/* Posts for this day */}
                    <div className="space-y-1">
                      {dayPosts.slice(0, 4).map(post => {
                        const config = TYPE_CONFIG[post.type] || TYPE_CONFIG.just_listed
                        const isPublished = post.status === 'published'
                        const daysUntil = getDaysUntil(post.scheduledDate)
                        
                        return (
                          <div
                            key={post.id}
                            onClick={() => onPostClick?.(post)}
                            className={`p-2 rounded-lg text-xs ${config.bgColor} ${config.textColor} border border-slate-700/50 cursor-pointer hover:opacity-80 transition-opacity ${
                              isPublished ? 'opacity-60' : ''
                            } ${post.status === 'cancelled' ? 'opacity-50' : ''}`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1 min-w-0">
                                <span>{config.icon}</span>
                                <span className="truncate font-medium">{post.title.split(' ').slice(0, 2).join(' ')}</span>
                              </div>
                              {isPublished ? (
                                <span className="text-emerald-400 text-xs">✓</span>
                              ) : daysUntil === 0 ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const platform = post.platforms?.[0]?.platform || 'Instagram'
                                    onPublish(platform)
                                  }}
                                  className="px-1.5 py-0.5 bg-green-600 hover:bg-green-500 rounded text-white text-xs whitespace-nowrap"
                                >
                                  📤
                                </button>
                              ) : null}
                            </div>
                            <div className="text-slate-400 mt-0.5 flex items-center gap-1">
                              {post.platforms?.filter(p => p.enabled).slice(0, 2).map((p, i) => (
                                <span key={i} className="text-xs">{PLATFORM_CONFIG[p.platform]?.icon}</span>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                      {dayPosts.length > 4 && (
                        <div className="text-xs text-slate-500 pl-1">
                          +{dayPosts.length - 4} más
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ==========================================
// VISTA 2: KANBAN (Drag & Drop)
// ==========================================
const KanbanView = ({ posts, onPublish, onPostClick }) => {
  const [columns] = useState([
    { id: 'pendiente', label: 'Pendiente', color: 'border-slate-500' },
    { id: 'programado', label: 'Programado', color: 'border-blue-500' },
    { id: 'publicado', label: 'Publicado', color: 'border-green-500' }
  ])
  
  const [draggedPost, setDraggedPost] = useState(null)
  
  const getColumnId = (post) => {
    if (post.status === 'published') return 'publicado'
    const daysUntil = getDaysUntil(post.scheduledDate)
    return daysUntil <= 2 ? 'pendiente' : 'programado'
  }
  
  const getPostsByColumn = (columnId) => {
    return posts.filter(post => getColumnId(post) === columnId)
  }
  
  const handleDragStart = (post) => {
    setDraggedPost(post)
  }
  
  const handleDragOver = (e) => {
    e.preventDefault()
  }
  
  const handleDrop = (columnId) => {
    if (draggedPost) {
      console.log(`Moved post ${draggedPost.id} to ${columnId}`)
      // In real implementation, this would update the backend
      setDraggedPost(null)
    }
  }
  
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(column => {
        const columnPosts = getPostsByColumn(column.id)
        
        return (
          <div
            key={column.id}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
            className="flex-1 min-w-64"
          >
            {/* Column Header */}
            <div className={`px-4 py-3 rounded-t-xl border-t-2 ${column.color} bg-slate-800/50`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">{column.label}</h3>
                <span className="px-2 py-0.5 bg-slate-700 rounded-full text-xs text-slate-300">
                  {columnPosts.length}
                </span>
              </div>
            </div>
            
            {/* Column Content */}
            <div className="bg-slate-900/30 rounded-b-xl p-3 space-y-3 min-h-96">
              {columnPosts.map(post => {
                const config = TYPE_CONFIG[post.type] || TYPE_CONFIG.just_listed
                const daysUntil = getDaysUntil(post.scheduledDate)
                
                return (
                  <div
                    key={post.id}
                    onClick={() => onPostClick?.(post)}
                    draggable
                    onDragStart={() => handleDragStart(post)}
                    onDragEnd={() => setDraggedPost(null)}
                    className={`p-4 rounded-xl bg-slate-800 border border-slate-700 cursor-pointer hover:border-blue-500/50 hover:bg-slate-750 transition-all ${
                      draggedPost?.id === post.id ? 'opacity-50 scale-95' : ''
                    } ${post.status === 'cancelled' ? 'opacity-50' : ''}`}
                  >
                    {/* Post Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${config.color}`}>
                        <span className="text-lg">{config.icon}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${config.bgColor} ${config.textColor}`}>
                        Día {post.day}
                      </span>
                    </div>
                    
                    {/* Post Title */}
                    <h4 className="font-semibold text-white mb-2">{post.title}</h4>
                    <p className="text-sm text-slate-400 mb-3 line-clamp-2">{post.description}</p>
                    
                    {/* Click hint */}
                    <p className="text-xs text-slate-500 mb-3">Clickeá para ver detalles</p>
                    
                    {/* Platforms */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {post.platforms.filter(p => p.enabled).slice(0, 3).map(platform => {
                        const platConfig = PLATFORM_CONFIG[platform.platform] || PLATFORM_CONFIG.instagram
                        return (
                          <span
                            key={platform.id}
                            className={`px-2 py-1 rounded text-xs ${platConfig.bgColor} ${platConfig.textColor}`}
                          >
                            {platConfig.icon} {platConfig.name}
                          </span>
                        )
                      })}
                    </div>
                    
                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {daysUntil > 0 ? (
                          <span>En {daysUntil} día{daysUntil !== 1 ? 's' : ''}</span>
                        ) : daysUntil === 0 ? (
                          <span className="text-amber-400">¡Hoy!</span>
                        ) : (
                          <span className="text-red-400">Pasado</span>
                        )}
                      </div>
                      
                      {post.status !== 'published' && column.id !== 'publicado' && (
                        <button
                          onClick={() => {
                            const platform = post.platforms?.[0]?.platform || 'Instagram'
                            onPublish(platform)
                          }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded-lg text-xs text-white transition-colors"
                        >
                          Publicar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              
              {columnPosts.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No hay posts en esta columna
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ==========================================
// VISTA 3: AGENDA (Lista compacta)
// ==========================================
const AgendaView = ({ posts, onPublish, onPostClick }) => {
  const [filter, setFilter] = useState('all')
  
  const filteredPosts = useMemo(() => {
    if (filter === 'all') return posts
    if (filter === 'upcoming') return posts.filter(p => getDaysUntil(p.scheduledDate) >= 0 && p.status !== 'published')
    if (filter === 'published') return posts.filter(p => p.status === 'published')
    if (filter === 'past') return posts.filter(p => getDaysUntil(p.scheduledDate) < 0 && p.status !== 'published')
    return posts
  }, [posts, filter])
  
  // Group by date
  const groupedPosts = useMemo(() => {
    const groups = {}
    filteredPosts.forEach(post => {
      const dateKey = new Date(post.scheduledDate).toDateString()
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(post)
    })
    return Object.entries(groups).sort((a, b) => new Date(a[0]) - new Date(b[0]))
  }, [filteredPosts])
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'upcoming', label: 'Próximos' },
          { id: 'published', label: 'Publicados' },
          { id: 'past', label: 'Pasados' }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      
      {/* Agenda List */}
      <div className="space-y-4">
        {groupedPosts.map(([dateKey, datePosts]) => {
          const date = new Date(dateKey)
          const isToday = dateKey === new Date().toDateString()
          const isPast = date < new Date(new Date().setHours(0,0,0,0))
          
          return (
            <div key={dateKey}>
              {/* Date Header */}
              <div className={`flex items-center gap-3 mb-3 ${isToday ? 'text-blue-400' : isPast ? 'text-slate-500' : 'text-slate-300'}`}>
                <div className={`w-16 text-center ${isToday ? 'bg-blue-500/20 rounded-lg p-2' : ''}`}>
                  <div className="text-2xl font-bold">{date.getDate()}</div>
                  <div className="text-xs capitalize">{date.toLocaleDateString('es-MX', { weekday: 'short' })}</div>
                </div>
                <div className="flex-1 h-px bg-slate-700" />
                {isToday && <span className="text-xs bg-blue-500/20 px-2 py-1 rounded-full">Hoy</span>}
              </div>
              
              {/* Posts for this date */}
              <div className="ml-4 pl-8 border-l-2 border-slate-700 space-y-3">
                {datePosts.map(post => {
                  const statusBadge = getStatusBadge(post.status)
                  
                  return (
                    <div
                      key={post.id}
                      onClick={() => onPostClick?.(post)}
                      className={`p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 cursor-pointer transition-colors ${
                        isPast ? 'opacity-60' : ''
                      } ${post.status === 'cancelled' ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-semibold text-white">{post.title}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${statusBadge.className}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                          
                          {/* Platforms */}
                          <div className="flex flex-wrap items-center gap-2">
                            {post.platforms.filter(p => p.enabled).map(platform => {
                              const platConfig = PLATFORM_CONFIG[platform.platform] || PLATFORM_CONFIG.instagram
                              return (
                                <span
                                  key={platform.id}
                                  className={`px-2 py-1 rounded text-xs ${platConfig.bgColor} ${platConfig.textColor}`}
                                >
                                  {platConfig.icon} {platConfig.name}
                                </span>
                              )
                            })}
                            
                            {!isPast && post.status !== 'published' && (
                              <button
                                onClick={() => {
                                  const platform = post.platforms?.[0]?.platform || 'Instagram'
                                  onPublish(platform)
                                }}
                                className="ml-auto px-3 py-1 bg-green-600 hover:bg-green-500 rounded-lg text-xs text-white transition-colors flex items-center gap-1"
                              >
                                <Play className="w-3 h-3" />
                                Publicar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        
        {groupedPosts.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No hay publicaciones para mostrar</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function ScheduleTimeline({ schedule, onPublish, onNewSchedule, onDelete, property }) {
  const [view, setView] = useState('kanban') // Default to kanban for better visibility
  const [selectedPost, setSelectedPost] = useState(null) // For detail modal
  const [posts, setPosts] = useState(schedule?.posts || [])
  
  // Sync posts when schedule changes (useEffect instead of useMemo to avoid loop)
  useEffect(() => {
    setPosts(schedule?.posts || [])
  }, [schedule?.posts])
  
  const viewOptions = [
    { id: 'calendar', label: 'Calendario', icon: Calendar },
    { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
    { id: 'agenda', label: 'Agenda', icon: List }
  ]
  
  // Stats
  const stats = {
    total: posts.length,
    published: posts.filter(p => p.status === 'published').length,
    upcoming: posts.filter(p => getDaysUntil(p.scheduledDate) >= 0 && p.status !== 'published').length,
    past: posts.filter(p => getDaysUntil(p.scheduledDate) < 0 && p.status !== 'published').length
  }
  
  // Handle delete post
  const handleDeletePost = async (postId) => {
    try {
      await fetch(`${API_URL}/schedule/manual/${postId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      setPosts(prev => prev.filter(p => p.id !== postId))
      onDelete?.(postId)
    } catch (err) {
      console.error('Error deleting post:', err)
    }
  }
  
  // Handle cancel post (just mark as cancelled)
  const handleCancelPost = (postId) => {
    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, status: 'cancelled' } : p
    ))
    onDelete?.(postId)
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Calendar className="w-7 h-7 text-emerald-400" />
            Publicaciones
          </h2>
          {property && (
            <p className="text-slate-400 text-sm mt-1">{property.title}</p>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onNewSchedule}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva
          </button>
          
          {/* View Selector */}
          <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg">
          {viewOptions.map(option => {
            const Icon = option.icon
            return (
              <button
                key={option.id}
                onClick={() => setView(option.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  view === option.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            )
          })}
          </div>
        </div>
      </div>
      
      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-slate-400">Total</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.published}</p>
          <p className="text-xs text-slate-400">Publicados</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{stats.upcoming}</p>
          <p className="text-xs text-slate-400">Próximos</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{stats.past}</p>
          <p className="text-xs text-slate-400">Pasados</p>
        </div>
      </div>
      
      {/* Demo Mode Indicator */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3">
        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
        <p className="text-amber-400 text-sm">
          <span className="font-medium">Modo Demo:</span> La publicación está simulada. Cuando conectes la API de Meta, las publicaciones se enviarán a Instagram y Facebook.
        </p>
      </div>
      
      {/* Content based on view */}
      <div className="glass-card p-6">
        {view === 'calendar' && (
          <CalendarView posts={posts} onPublish={onPublish} onPostClick={setSelectedPost} />
        )}
        {view === 'kanban' && (
          <KanbanView posts={posts} onPublish={onPublish} onPostClick={setSelectedPost} />
        )}
        {view === 'agenda' && (
          <AgendaView posts={posts} onPublish={onPublish} onPostClick={setSelectedPost} />
        )}
      </div>
      
      {/* Post Detail Modal */}
      <PostDetailModal
        isOpen={!!selectedPost}
        post={selectedPost}
        property={property}
        onClose={() => setSelectedPost(null)}
        onPublish={(platform, platformSettings) => {
          // Update the post with new settings
          setPosts(prev => prev.map(p => 
            p.id === selectedPost?.id 
              ? { ...p, platformSettings } 
              : p
          ))
          // Call parent onPublish with platform
          onPublish?.(platform)
          setSelectedPost(null)
        }}
        onDelete={handleDeletePost}
        onCancel={handleCancelPost}
      />
    </div>
  )
}
